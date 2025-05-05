// src/lib/mock-data.ts
import type { Account, Transaction } from "@/types";

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
    const maxNumber = Math.max(...accountTransactions.map(t => t.number));
    return maxNumber + 1;
};

// Helper to get next account ID
let nextAccountId = 5; // Start after existing mock IDs
export const getNextAccountId = (): string => {
    return (nextAccountId++).toString();
}

// Helper to get next transaction ID
let nextTransactionIdNum = 9; // Start after existing mock IDs
export const getNextTransactionId = (): string => {
    return `t${nextTransactionIdNum++}`;
}

// Helper function to calculate running balance for a specific account
export const calculateRunningBalance = (accountId: string, userId: string = "user1"): { transactions: TransactionWithBalance[], finalBalance: number } => {
  const userTransactions = mockDb[userId]?.transactions || [];
  const accountTransactions = userTransactions.filter(t => t.accountId === accountId);

  let currentBalance = 0;
  const transactionsWithBalance = accountTransactions
    .sort((a, b) => a.number - b.number) // Ensure transactions are sorted by number
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
     const { finalBalance } = calculateRunningBalance(accountId, userId);
     const accountIndex = mockDb[userId].accounts.findIndex(acc => acc.id === accountId);
     if (accountIndex !== -1) {
         mockDb[userId].accounts[accountIndex].balance = finalBalance;
     }
};

// Helper to check if slip number exists
export const slipNumberExists = (slipNumber: string, userId: string = "user1"): boolean => {
    const userTransactions = mockDb[userId]?.transactions || [];
    return userTransactions.some(t => t.slipNumber.toLowerCase() === slipNumber.toLowerCase());
}
