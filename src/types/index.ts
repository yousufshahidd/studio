// src/types/index.ts

/**
 * Represents a financial account.
 */
export interface Account {
  id: string;
  name: string;
  // Balance might be calculated on the fly or stored, depending on implementation
  // For mock data, we might store it, but for Firestore, calculating is often better.
   balance?: number; // Make optional as it might be calculated
}

/**
 * Represents a single transaction entry.
 */
export interface Transaction {
  id: string; // Unique ID for this specific transaction entry document
  number: number; // Sequential number within its account ledger
  date: string; // ISO string or Firestore Timestamp string representation
  description: string;
  slipNumber: string; // Identifier linking debit/credit entries across accounts
  debit?: number; // Amount debited from this account
  credit?: number; // Amount credited to this account
  code?: string; // Name of the linked account for this transaction part
  accountId: string; // ID of the account this transaction belongs to
}

/**
 * Represents a transaction with its calculated running balance within an account.
 */
export interface TransactionWithBalance extends Transaction {
  balance: number;
}
