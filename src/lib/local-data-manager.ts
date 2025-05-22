// src/lib/local-data-manager.ts
import type { Account, Transaction, TransactionWithBalance } from "@/types";

const LOCAL_STORAGE_KEY = "accountBookProData";

interface LocalStorageData {
  accounts: Account[];
  transactions: Transaction[];
  nextAccountId: number;
  nextTransactionId: number;
}

function getDefaultData(): LocalStorageData {
  return {
    accounts: [
      { id: "1", name: "Cash", balance: 0 },
      { id: "2", name: "Accounts Receivable", balance: 0 },
      { id: "3", name: "Office Supplies", balance: 0 },
      { id: "4", name: "Rent Expense", balance: 0 },
    ],
    transactions: [
      // Initial Cash Transactions (example)
      { id: "t1", accountId: "1", number: 1, date: "2024-07-20", description: "Initial Cash Balance", slipNumber: "S001", credit: 2000.00, code: "Initial Setup"},
      { id: "t2", accountId: "3", number: 1, date: "2024-07-21", description: "Bought pens", slipNumber: "S002", debit: 50.00, code: "Cash"},
      { id: "t3", accountId: "1", number: 2, date: "2024-07-21", description: "Office Supplies Purchase", slipNumber: "S002", debit: 50.00, code: "Office Supplies" },
    ],
    nextAccountId: 5, // Next ID after default accounts
    nextTransactionId: 4, // Next ID after default transactions
  };
}

function loadData(): LocalStorageData {
  if (typeof window === "undefined") {
    return getDefaultData(); // Return default if on server (should not happen for data ops)
  }
  const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedData) {
    const parsedData = JSON.parse(storedData) as LocalStorageData;
    // Ensure all fields are present, merge with defaults if necessary
    return {
        ...getDefaultData(),
        ...parsedData,
        accounts: parsedData.accounts || getDefaultData().accounts,
        transactions: parsedData.transactions || getDefaultData().transactions,
        nextAccountId: parsedData.nextAccountId || getDefaultData().nextAccountId,
        nextTransactionId: parsedData.nextTransactionId || getDefaultData().nextTransactionId,
    };
  }
  const defaultData = getDefaultData();
  // Seed default data for accounts, then update their balances
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultData));
  // Recalculate balances for default seeded data
  const seededData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)!) as LocalStorageData;
  seededData.accounts.forEach(acc => {
    const { finalBalance } = calculateRunningBalanceInternal(acc.id, seededData.transactions);
    const accIndex = seededData.accounts.findIndex(a => a.id === acc.id);
    if (accIndex !== -1) {
      seededData.accounts[accIndex].balance = finalBalance;
    }
  });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seededData));
  return seededData;
}

function saveData(data: LocalStorageData) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }
}

// --- Account Functions ---
export function getAccounts(): Account[] {
  const data = loadData();
  return data.accounts.map(acc => ({...acc})); // Return copies
}

export function addAccount(name: string): Account {
  const data = loadData();
  const newAccount: Account = {
    id: data.nextAccountId.toString(),
    name,
    balance: 0,
  };
  data.accounts.push(newAccount);
  data.nextAccountId += 1;
  saveData(data);
  return {...newAccount};
}

export function updateAccount(id: string, newName: string): Account | null {
  const data = loadData();
  const accountIndex = data.accounts.findIndex(acc => acc.id === id);
  if (accountIndex !== -1) {
    const oldName = data.accounts[accountIndex].name;
    data.accounts[accountIndex].name = newName;

    // Update 'code' in transactions
    data.transactions = data.transactions.map(t => {
      if (t.code === oldName) {
        return { ...t, code: newName };
      }
      return t;
    });

    saveData(data);
    return {...data.accounts[accountIndex]};
  }
  return null;
}

export function deleteAccount(id: string): boolean {
  const data = loadData();
  const accountToDelete = data.accounts.find(acc => acc.id === id);
  if (!accountToDelete) return false;

  const accountName = accountToDelete.name;

  data.accounts = data.accounts.filter(acc => acc.id !== id);
  
  // Filter out transactions belonging to the deleted account OR linked TO the deleted account
  const slipsToAlsoRemove = data.transactions
    .filter(t => t.accountId === id || t.code === accountName)
    .map(t => t.slipNumber);
  
  data.transactions = data.transactions.filter(t => 
    t.accountId !== id && 
    t.code !== accountName &&
    !slipsToAlsoRemove.includes(t.slipNumber)
  );
  
  // Recalculate balances for all remaining accounts
  data.accounts.forEach(acc => {
    const { finalBalance } = calculateRunningBalanceInternal(acc.id, data.transactions);
    const accIndex = data.accounts.findIndex(a => a.id === acc.id);
    if (accIndex !== -1) {
      data.accounts[accIndex].balance = finalBalance;
    }
  });

  saveData(data);
  return true;
}

export function getAccountById(accountId: string): Account | null {
  const data = loadData();
  const account = data.accounts.find(acc => acc.id === accountId);
  return account ? {...account} : null;
}


// --- Transaction Functions ---
export function getTransactionsForAccount(accountId: string): Transaction[] {
  const data = loadData();
  return data.transactions.filter(t => t.accountId === accountId).map(t => ({...t}));
}

function calculateRunningBalanceInternal(accountId: string, allTransactions: Transaction[]): { transactions: TransactionWithBalance[], finalBalance: number } {
  const accountTransactions = allTransactions.filter(t => t.accountId === accountId);

  let currentBalance = 0;
  const transactionsWithBalance = accountTransactions
    .sort((a, b) => {
        const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        return a.number - b.number;
    })
    .map(t => {
      currentBalance = currentBalance + (t.credit || 0) - (t.debit || 0);
      return { ...t, balance: currentBalance };
    });

  const finalBalance = transactionsWithBalance.length > 0
    ? transactionsWithBalance[transactionsWithBalance.length - 1].balance
    : 0;

  return { transactions: transactionsWithBalance, finalBalance };
}

export function calculateRunningBalance(accountId: string): { transactions: TransactionWithBalance[], finalBalance: number } {
    const data = loadData();
    return calculateRunningBalanceInternal(accountId, data.transactions);
}


export function updateAccountBalance(accountId: string): void {
  const data = loadData();
  const accountIndex = data.accounts.findIndex(acc => acc.id === accountId);
  if (accountIndex !== -1) {
    const { finalBalance } = calculateRunningBalanceInternal(accountId, data.transactions);
    data.accounts[accountIndex].balance = finalBalance;
    saveData(data);
  }
}

export function getNextTransactionNumberForAccount(accountId: string): number {
  const data = loadData();
  const accountTransactions = data.transactions.filter(t => t.accountId === accountId);
  if (accountTransactions.length === 0) return 1;
  const maxNumber = Math.max(...accountTransactions.map(t => t.number), 0);
  return maxNumber + 1;
}


export function addTransaction(currentAccountId: string, linkedAccountId: string, transactionDetails: Omit<Transaction, 'id' | 'number' | 'accountId' | 'code'> & { type: 'debit' | 'credit', amount: number }): { t1: Transaction, t2: Transaction } | null {
    const data = loadData();
    const currentAccount = data.accounts.find(a => a.id === currentAccountId);
    const linkedAccount = data.accounts.find(a => a.id === linkedAccountId);

    if (!currentAccount || !linkedAccount) return null;

    const newT1Id = "t" + data.nextTransactionId++;
    const newT2Id = "t" + data.nextTransactionId++;

    const t1: Transaction = {
        id: newT1Id,
        accountId: currentAccountId,
        number: getNextTransactionNumberForAccount(currentAccountId),
        date: transactionDetails.date,
        description: transactionDetails.description,
        slipNumber: transactionDetails.slipNumber,
        code: linkedAccount.name,
        [transactionDetails.type]: transactionDetails.amount,
    };

    const oppositeType = transactionDetails.type === 'debit' ? 'credit' : 'debit';
    const t2: Transaction = {
        id: newT2Id,
        accountId: linkedAccountId,
        number: getNextTransactionNumberForAccount(linkedAccountId),
        date: transactionDetails.date,
        description: transactionDetails.description,
        slipNumber: transactionDetails.slipNumber,
        code: currentAccount.name,
        [oppositeType]: transactionDetails.amount,
    };

    data.transactions.push(t1, t2);
    updateAccountBalanceInDataSet(currentAccountId, data);
    updateAccountBalanceInDataSet(linkedAccountId, data);
    saveData(data);
    return { t1: {...t1}, t2: {...t2} };
}

export function editTransaction(originalSlipNumber: string, currentAccountId: string, oldLinkedAccountName: string, newLinkedAccountId: string, transactionDetails: Omit<Transaction, 'id' | 'number' | 'accountId' | 'code'> & { type: 'debit' | 'credit', amount: number }): boolean {
    const data = loadData();
    const currentAccount = data.accounts.find(a => a.id === currentAccountId);
    const newLinkedAccount = data.accounts.find(a => a.id === newLinkedAccountId);
    const oldLinkedAccount = data.accounts.find(a => a.name === oldLinkedAccountName);


    if (!currentAccount || !newLinkedAccount || !oldLinkedAccount) return false;
    
    const oldLinkedAccountId = oldLinkedAccount.id;

    const t1Index = data.transactions.findIndex(t => t.slipNumber === originalSlipNumber && t.accountId === currentAccountId);
    const t2Index = data.transactions.findIndex(t => t.slipNumber === originalSlipNumber && t.accountId === oldLinkedAccountId);

    if (t1Index === -1) return false; // Original transaction in current account not found

    // Update T1
    data.transactions[t1Index] = {
        ...data.transactions[t1Index],
        date: transactionDetails.date,
        description: transactionDetails.description,
        slipNumber: transactionDetails.slipNumber, // new slip number from details
        code: newLinkedAccount.name,
        debit: transactionDetails.type === 'debit' ? transactionDetails.amount : undefined,
        credit: transactionDetails.type === 'credit' ? transactionDetails.amount : undefined,
    };

    const oppositeType = transactionDetails.type === 'debit' ? 'credit' : 'debit';
    // Update or Create T2
    if (t2Index !== -1) {
        data.transactions[t2Index] = {
            ...data.transactions[t2Index],
            accountId: newLinkedAccountId, // Important: update accountId if linked account changed
            date: transactionDetails.date,
            description: transactionDetails.description,
            slipNumber: transactionDetails.slipNumber, // new slip number
            code: currentAccount.name,
            debit: oppositeType === 'debit' ? transactionDetails.amount : undefined,
            credit: oppositeType === 'credit' ? transactionDetails.amount : undefined,
        };
    } else if (oldLinkedAccountId !== newLinkedAccountId || oldLinkedAccountId === currentAccountId) {
      // This implies t2 was missing or it was a self-link being corrected to a new linked account
      // Create the second leg for the new linked account
        const newT2: Transaction = {
            id: "t" + data.nextTransactionId++,
            accountId: newLinkedAccountId,
            number: getNextTransactionNumberForAccount(newLinkedAccountId),
            date: transactionDetails.date,
            description: transactionDetails.description,
            slipNumber: transactionDetails.slipNumber,
            code: currentAccount.name,
            debit: oppositeType === 'debit' ? transactionDetails.amount : undefined,
            credit: oppositeType === 'credit' ? transactionDetails.amount : undefined,
        };
        data.transactions.push(newT2);
    } else {
        // If t2Index is -1 and oldLinkedAccountId was different from currentAccountId and newLinkedAccountId, it's an issue.
        // This case should ideally be handled by prior validation or implies inconsistent data.
        // For robustness, we can log a warning or decide if we should still proceed with T1 update only.
        console.warn(`Original linked transaction for slip ${originalSlipNumber} in account ${oldLinkedAccountName} not found. T1 updated, T2 linkage might be broken or was self-referenced.`);
         // Fallback: if old T2 wasn't found and it's not a self-reference being fixed, this is tricky.
        // The current logic tries to create a new T2 if the linked account changes significantly.
    }


    updateAccountBalanceInDataSet(currentAccountId, data);
    updateAccountBalanceInDataSet(oldLinkedAccountId, data); // Update balance of old linked account
    if (oldLinkedAccountId !== newLinkedAccountId) {
        updateAccountBalanceInDataSet(newLinkedAccountId, data); // Update balance of new linked account
    }
    saveData(data);
    return true;
}


export function deleteTransaction(slipNumber: string): boolean {
    const data = loadData();
    const transactionsToDelete = data.transactions.filter(t => t.slipNumber === slipNumber);
    if (transactionsToDelete.length === 0) return false;

    const affectedAccountIds = new Set<string>();
    transactionsToDelete.forEach(t => affectedAccountIds.add(t.accountId));

    data.transactions = data.transactions.filter(t => t.slipNumber !== slipNumber);

    affectedAccountIds.forEach(accId => updateAccountBalanceInDataSet(accId, data));
    saveData(data);
    return true;
}

// Internal helper to update balance within a dataset without re-reading from localStorage
function updateAccountBalanceInDataSet(accountId: string, data: LocalStorageData): void {
  const accountIndex = data.accounts.findIndex(acc => acc.id === accountId);
  if (accountIndex !== -1) {
    const { finalBalance } = calculateRunningBalanceInternal(accountId, data.transactions);
    data.accounts[accountIndex].balance = finalBalance;
  }
}

export interface SlipExistenceDetails {
    exists: boolean;
    conflictingTransaction?: Transaction;
    conflictingAccountName?: string;
}

export const slipNumberExists = (slipNumber: string): SlipExistenceDetails => {
    const data = loadData();
    const conflictingTransaction = data.transactions.find(t => t.slipNumber.toLowerCase() === slipNumber.toLowerCase());

    if (conflictingTransaction) {
        const conflictingAccount = data.accounts.find(acc => acc.id === conflictingTransaction.accountId);
        return {
            exists: true,
            conflictingTransaction: {...conflictingTransaction},
            conflictingAccountName: conflictingAccount?.name || "Unknown Account"
        };
    }
    return { exists: false };
}

// Initialize data on load if it's the first time (e.g. in a useEffect in a top-level component or layout)
// This ensures default data is there.
if (typeof window !== "undefined" && !localStorage.getItem(LOCAL_STORAGE_KEY)) {
  const initialData = getDefaultData();
   // Recalculate balances for default seeded data
  initialData.accounts.forEach(acc => {
    const { finalBalance } = calculateRunningBalanceInternal(acc.id, initialData.transactions);
    const accIndex = initialData.accounts.findIndex(a => a.id === acc.id);
    if (accIndex !== -1) {
      initialData.accounts[accIndex].balance = finalBalance;
    }
  });
  saveData(initialData);
}
