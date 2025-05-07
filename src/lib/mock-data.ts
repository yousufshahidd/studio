// src/lib/mock-data.ts
import type { Account, Transaction, TransactionWithBalance } from "@/types";

// Mock data structure: An object where keys are user IDs (or a default ID)
// containing accounts and transactions for that user.
// For simplicity, using a single default user "user1".

interface MockUserData {
  accounts: Account[];
  transactions: Transaction[];
}

interface MockDatabase {
  [userId: string]: MockUserData;
}

// Initialize with default data
export const mockDb: MockDatabase = {
  "user1": { // Assuming a default user ID for mock purposes
    accounts: [
      { id: "1", name: "Cash", balance: 1549.75 }, // Recalculated balance
      { id: "2", name: "Accounts Receivable", balance: 4699.75 }, // Recalculated balance
      { id: "3", name: "Office Supplies", balance: 150.50 }, // Recalculated balance
      { id: "4", name: "Rent Expense", balance: 800.00 }, // Recalculated balance
    ],
    transactions: [
      // Cash Transactions
      { id: "t1", accountId: "1", number: 1, date: "2024-07-20", description: "Initial Balance", slipNumber: "S001", credit: 2000.00 },
      { id: "t2", accountId: "1", number: 2, date: "2024-07-21", description: "Office Supplies Purchase", slipNumber: "S002", debit: 150.50, code: "Office Supplies" },
      { id: "t3", accountId: "1", number: 3, date: "2024-07-22", description: "Client Payment Received", slipNumber: "S003", credit: 500.25, code: "Accounts Receivable" },
      { id: "t7", accountId: "1", number: 4, date: "2024-07-23", description: "Rent Payment", slipNumber: "S005", debit: 800.00, code: "Rent Expense" },

      // Accounts Receivable Transactions
      { id: "t4", accountId: "2", number: 1, date: "2024-07-19", description: "Invoice #INV001", slipNumber: "S004", debit: 5200.00 },
      { id: "t5", accountId: "2", number: 2, date: "2024-07-22", description: "Payment for INV001", slipNumber: "S003", credit: 500.25, code: "Cash" }, // Linked via slipNumber S003

      // Office Supplies Transactions
      { id: "t6", accountId: "3", number: 1, date: "2024-07-21", description: "Purchase from Cash", slipNumber: "S002", debit: 150.50, code: "Cash" }, // Linked via slipNumber S002 (debit to supplies)

      // Rent Expense Transactions
      { id: "t8", accountId: "4", number: 1, date: "2024-07-23", description: "Paid from Cash", slipNumber: "S005", debit: 800.00, code: "Cash" }, // Linked via slipNumber S005 (debit to rent)
    ],
  },
};

// Helper to get next transaction number for an account
export const getNextTransactionNumber = (accountId: string, userId: string = "user1"): number => {
    const userTransactions = mockDb[userId]?.transactions || [];
    const accountTransactions = userTransactions.filter(t => t.accountId === accountId);
    if (accountTransactions.length === 0) {
        return 1;
    }
    const maxNumber = Math.max(...accountTransactions.map(t => t.number), 0); // Ensure Math.max has at least one number
    return maxNumber + 1;
};

// Helper to get next account ID
let nextAccountIdCounter = Math.max(...Object.values(mockDb).flatMap(u => u.accounts.map(a => parseInt(a.id, 10))), 0) + 1;
export const getNextAccountId = (): string => {
    return (nextAccountIdCounter++).toString();
}

// Helper to get next transaction ID
let nextTransactionIdNumCounter = Math.max(...Object.values(mockDb).flatMap(u => u.transactions.map(t => parseInt(t.id.replace('t',''), 10))), 0) + 1;
export const getNextTransactionId = (): string => {
    return `t${nextTransactionIdNumCounter++}`;
}

// Helper function to calculate running balance for a specific account
export const calculateRunningBalance = (accountId: string, userId: string = "user1"): { transactions: TransactionWithBalance[], finalBalance: number } => {
  const userTransactions = mockDb[userId]?.transactions || [];
  const accountTransactions = userTransactions.filter(t => t.accountId === accountId);

  let currentBalance = 0;
  const transactionsWithBalance = accountTransactions
    .sort((a, b) => {
        // First sort by date, then by number for transactions on the same date
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
};

// Helper to update account balance in mock DB (call after transaction changes)
export const updateAccountBalance = (accountId: string, userId: string = "user1") => {
     const accountIndex = mockDb[userId]?.accounts.findIndex(acc => acc.id === accountId);
     if (accountIndex !== -1 && mockDb[userId]) {
         const { finalBalance } = calculateRunningBalance(accountId, userId);
         mockDb[userId].accounts[accountIndex].balance = finalBalance;
     }
};

// Helper to check if slip number exists and return details
export interface SlipExistenceDetails {
    exists: boolean;
    conflictingTransaction?: Transaction; // The transaction that has the duplicate slip
    conflictingAccountName?: string; // Name of the account where the duplicate slip exists
}

export const slipNumberExists = (slipNumber: string, userId: string = "user1"): SlipExistenceDetails => {
    const userData = mockDb[userId];
    if (!userData) return { exists: false };

    const userTransactions = userData.transactions || [];
    const conflictingTransaction = userTransactions.find(t => t.slipNumber.toLowerCase() === slipNumber.toLowerCase());

    if (conflictingTransaction) {
        const conflictingAccount = userData.accounts.find(acc => acc.id === conflictingTransaction.accountId);
        return {
            exists: true,
            conflictingTransaction,
            conflictingAccountName: conflictingAccount?.name || "Unknown Account"
        };
    }
    return { exists: false };
}
