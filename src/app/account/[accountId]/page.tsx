
// src/app/account/[accountId]/page.tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Edit, Trash2, FileText, MoreVertical, Loader2, AlertCircle, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogFooter,
   DialogClose,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { generatePdf, downloadPdf } from "@/services/pdf-generator";
import type { Account, Transaction, TransactionWithBalance } from "@/types";
import {
    mockDb,
    calculateRunningBalance,
    updateAccountBalance,
    getNextTransactionNumber,
    getNextTransactionId,
    slipNumberExists
} from "@/lib/mock-data";
import { format } from "date-fns";


// Function to generate PDF (uses pdf-generator service)
async function generateAccountPdf(accountName: string, transactions: TransactionWithBalance[]) {
  console.log(`Generating PDF for account: ${accountName}`);
  console.log("Including Transactions:", transactions.map(t => t.number)); // Log transaction numbers

  // Generate HTML content for the PDF, excluding the 'Code' column and showing Dr/Cr
  const htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: sans-serif; margin: 20px; }
        h1 { color: #333; }
        p { color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
        th { background-color: #f2f2f2; font-weight: bold;}
        td.number, th.number { text-align: right; width: 40px;}
        td.currency, th.currency { text-align: right; font-family: monospace; width: 100px; }
        td.balance, th.balance { text-align: right; font-family: monospace; width: 110px; }
        td.description, th.description { width: auto; }
        td.slip, th.slip { width: 80px; }
        td.date, th.date { width: 70px; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .balance-summary { margin-top: 20px; font-weight: bold; text-align: right; font-size: 12px; }
        .dr { color: #c0392b; } /* Red for Debit balance */
        .cr { color: #27ae60; } /* Green for Credit balance */
        .balance-suffix { font-size: 8px; margin-left: 2px; vertical-align: middle; }
      </style>
    </head>
    <body>
      <h1>Account Statement: ${accountName}</h1>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            <th class="number">No.</th>
            <th class="date">Date</th>
            <th class="description">Description</th>
            <th class="slip">Slip No.</th>
            <th class="currency">Debit</th>
            <th class="currency">Credit</th>
            <th class="balance">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td class="number">${t.number}</td>
              <td class="date">${new Date(t.date).toLocaleDateString()}</td>
              <td class="description">${t.description}</td>
              <td class="slip">${t.slipNumber}</td>
              <td class="currency">${t.debit ? `$${t.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
              <td class="currency">${t.credit ? `$${t.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
              <td class="balance ${t.balance >= 0 ? 'cr' : 'dr'}">
                 $${Math.abs(t.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 <span class="balance-suffix">${t.balance >= 0 ? 'Cr' : 'Dr'}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${transactions.length > 0 ? `
      <p class="balance-summary">Final Balance:
         <span class="${transactions[transactions.length - 1].balance >= 0 ? 'cr' : 'dr'}">
           $${Math.abs(transactions[transactions.length - 1].balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           <span class="balance-suffix">${transactions[transactions.length - 1].balance >= 0 ? 'Cr' : 'Dr'}</span>
         </span>
      </p>
      ` : '<p>No transactions to display.</p>'}
    </body>
    </html>
  `;

  try {
    // NOTE: The generatePdf service currently returns base64 encoded HTML,
    // not a real PDF. Downloading this as application/pdf will result in a corrupt file.
    // For testing, you might change the mimeType in downloadPdf to 'text/html'.
    // A real PDF generation library (like jsPDF or Puppeteer on server) is needed for functional PDFs.
    const pdfDoc = await generatePdf(htmlContent);
    return pdfDoc;
  } catch (error) {
    console.error("Error generating PDF via service:", error);
    throw new Error("Failed to generate PDF document.");
  }
}


export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [account, setAccount] = React.useState<Account | null>(null);
  const [transactionsWithBalance, setTransactionsWithBalance] = React.useState<TransactionWithBalance[]>([]);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]); // For dropdowns
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TransactionWithBalance | null>(null);
  const [showFirstDeleteConfirm, setShowFirstDeleteConfirm] = React.useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Transaction | null>(null); // Keep simple Transaction for edit form
  const [showEditConfirm, setShowEditConfirm] = React.useState(false); // Dialog before showing full edit form
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = React.useState(false);
  const [isEditTransactionDialogOpen, setIsEditTransactionDialogOpen] = React.useState(false); // The actual edit form dialog
  const [isSavingTransaction, setIsSavingTransaction] = React.useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null);
  const [isPdfLinePromptOpen, setIsPdfLinePromptOpen] = React.useState(false);
  const [pdfLineNumber, setPdfLineNumber] = React.useState<string>(""); // State for line number input


  const userId = user?.uid || "user1"; // Use actual UID if available, else default mock user

  // --- Data Fetching and Calculation ---
  const loadAccountData = React.useCallback(() => {
    if (!accountId || !mockDb[userId]) {
       toast({ title: "Error", description: "Account data not available.", variant: "destructive" });
       router.push("/dashboard");
       return;
    }
     setIsLoading(true);
     setSelectedTransactionId(null); // Reset selection on load/reload

     // Simulate fetching
     setTimeout(() => {
       const currentAccount = mockDb[userId].accounts.find(acc => acc.id === accountId);
       if (currentAccount) {
         setAccount(currentAccount);
         setAllAccounts(mockDb[userId].accounts.filter(acc => acc.id !== accountId)); // Other accounts for linking

         // Calculate balances for the current account
         const { transactions, finalBalance } = calculateRunningBalance(accountId, userId);
         setTransactionsWithBalance(transactions);
         // Update the main account object's balance using the calculated final balance
         setAccount(prev => prev ? { ...prev, balance: finalBalance } : null);

       } else {
         toast({ title: "Error", description: "Account not found.", variant: "destructive" });
         router.push("/dashboard"); // Redirect if account doesn't exist
       }
       setIsLoading(false);
     }, 300); // Shorter delay for mock data
  }, [accountId, userId, router, toast]);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/"); // Redirect if not logged in
    } else if (user && accountId) {
        loadAccountData();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, accountId, router]); // loadAccountData is stable

  // --- Transaction Actions ---

  const openAddTransactionDialog = () => {
      // Reset form fields
      setTransactionDate(new Date());
      setTransactionDesc("");
      setTransactionSlip(""); // TODO: Suggest next slip number?
      setTransactionAmount("");
      setTransactionType("debit");
      setLinkedAccountId("");
      setIsAddTransactionDialogOpen(true);
  };

 const handleAddTransaction = () => {
     // Validation
     if (!transactionDate || !transactionDesc.trim() || !transactionSlip.trim() || !transactionAmount || !linkedAccountId) {
       toast({ title: "Validation Error", description: "Please fill all transaction fields.", variant: "destructive" });
       return;
     }
     const amount = parseFloat(transactionAmount.toString());
     if (isNaN(amount) || amount <= 0) {
       toast({ title: "Validation Error", description: "Please enter a valid positive amount.", variant: "destructive" });
       return;
     }
      const slip = transactionSlip.trim();
      if (slipNumberExists(slip, userId)) {
         toast({ title: "Duplicate Slip Error", description: `Slip number "${slip}" already exists. Please use a unique one.`, variant: "destructive" });
         return;
     }
      const linkedAccExists = mockDb[userId].accounts.some(acc => acc.id === linkedAccountId); // Check against all accounts, not just 'allAccounts'
      if (!linkedAccExists) {
           toast({ title: "Validation Error", description: "Selected linked account is invalid.", variant: "destructive" });
           return;
      }

     setIsSavingTransaction(true);
     // Simulate adding transaction to mock data (Double Entry)
     setTimeout(() => {
         const currentAccId = accountId!;
         const linkedAccId = linkedAccountId;
         const linkedAcc = mockDb[userId].accounts.find(a => a.id === linkedAccId);
         const currentAcc = mockDb[userId].accounts.find(a => a.id === currentAccId); // Get current account details

         if(!linkedAcc || !currentAcc) { // Ensure both accounts exist
             toast({ title: "Error", description: "Account details could not be retrieved.", variant: "destructive" });
             setIsSavingTransaction(false);
             return;
         }

         const dateISO = transactionDate.toISOString().split('T')[0]; // Store date as YYYY-MM-DD
         const desc = transactionDesc.trim();
         const currentAccName = currentAcc.name;
         const linkedAccName = linkedAcc.name;

         // Transaction 1 (Current Account)
         const t1: Transaction = {
             id: getNextTransactionId(),
             accountId: currentAccId,
             number: getNextTransactionNumber(currentAccId, userId),
             date: dateISO,
             description: desc,
             slipNumber: slip,
             code: linkedAccName, // Link to the other account's name
             [transactionType]: amount, // Set debit or credit based on selection
             // Ensure the opposite type is explicitly undefined or null
             ...(transactionType === 'debit' ? { credit: undefined } : { debit: undefined }),
         };

         // Transaction 2 (Linked Account - opposite entry)
          const oppositeType = transactionType === 'debit' ? 'credit' : 'debit';
         const t2: Transaction = {
             id: getNextTransactionId(),
             accountId: linkedAccId,
             number: getNextTransactionNumber(linkedAccId, userId),
             date: dateISO,
             description: desc, // Can customize description slightly if needed, e.g., "From/To [CurrentAccountName]"
             slipNumber: slip,
             code: currentAccName, // Link back to the current account's name
             // Opposite entry type
             [oppositeType]: amount,
              // Ensure the opposite type is explicitly undefined or null
             ...(oppositeType === 'debit' ? { credit: undefined } : { debit: undefined }),
         };

         // Add both transactions to mock DB
         mockDb[userId].transactions.push(t1, t2);

         // Recalculate balances for BOTH accounts
         updateAccountBalance(currentAccId, userId);
         updateAccountBalance(linkedAccId, userId);

         // Refresh data for the current page
         loadAccountData();

         toast({
             title: "Transaction Added",
             description: `Transaction ${slip} recorded in ${currentAccName} and ${linkedAccName}.`,
         });
         setIsSavingTransaction(false);
         setIsAddTransactionDialogOpen(false);
     }, 500); // Simulate save delay
 };


  const handleEditTransaction = (transaction: TransactionWithBalance) => { // Use TransactionWithBalance here
    const linkedAccExists = mockDb[userId].accounts.some(acc => acc.name === transaction?.code);
    if (!linkedAccExists) {
        toast({ title: "Error", description: `Cannot edit: Linked account "${transaction?.code}" not found or is inactive.`, variant: "destructive" });
        return;
    }
    setEditTarget(transaction); // Store the full transaction including balance initially
    setShowEditConfirm(true); // Show the initial confirmation dialog
  };

  const confirmEditIntent = () => {
     setShowEditConfirm(false); // Close confirmation dialog
     if (editTarget) {
         // --- Pre-fill Edit Form State ---
         setTransactionDate(new Date(editTarget.date)); // Assuming date is stored as string/timestamp
         setTransactionDesc(editTarget.description);
         setTransactionSlip(editTarget.slipNumber);
         const amountValue = editTarget.debit ?? editTarget.credit ?? 0;
         setTransactionAmount(amountValue);
         setTransactionType(editTarget.debit ? "debit" : "credit");

          // Find the linked account ID based on the 'code' (name). Handle potential missing linked account.
          const linkedAcc = mockDb[userId].accounts.find(acc => acc.name === editTarget?.code); // Check against all accounts
          setLinkedAccountId(linkedAcc?.id || ""); // Set linked account ID

         // --- Open the Actual Edit Dialog ---
         setIsEditTransactionDialogOpen(true);
     }
  };

   const handleSaveEditedTransaction = () => {
      if (!editTarget) {
            toast({ title: "Error", description: "No transaction selected for editing.", variant: "destructive" });
            return;
      }

        // Validation
        if (!transactionDate || !transactionDesc.trim() || !transactionSlip.trim() || !transactionAmount || !linkedAccountId) {
           toast({ title: "Validation Error", description: "Please fill all transaction fields.", variant: "destructive" });
           return;
        }
        const amount = parseFloat(transactionAmount.toString());
        if (isNaN(amount) || amount <= 0) {
           toast({ title: "Validation Error", description: "Please enter a valid positive amount.", variant: "destructive" });
           return;
        }
        const slip = transactionSlip.trim();
        // Allow the same slip number if it's the same transaction, otherwise, ensure uniqueness
        if (slip !== editTarget.slipNumber && slipNumberExists(slip, userId)) {
           toast({ title: "Duplicate Slip Error", description: `Slip number "${slip}" already exists. Please use a unique one.`, variant: "destructive" });
           return;
        }
        const linkedAccExists = mockDb[userId].accounts.some(acc => acc.id === linkedAccountId); // Check against all accounts
        if (!linkedAccExists) {
           toast({ title: "Validation Error", description: "Selected linked account is invalid.", variant: "destructive" });
           return;
        }

      setIsSavingTransaction(true);
      setTimeout(() => {
          const currentAccId = accountId!;
          const newLinkedAccId = linkedAccountId; // The ID selected in the form

          // Retrieve current account and NEW linked account objects.
          const currentAcc = mockDb[userId].accounts.find(a => a.id === currentAccId);
          const newLinkedAcc = mockDb[userId].accounts.find(a => a.id === newLinkedAccId);

           // Find the OLD linked account using the original transaction's code (name)
           const oldLinkedAcc = mockDb[userId].accounts.find(a => a.id !== currentAccId && a.name === editTarget.code);
           const oldLinkedAccId = oldLinkedAcc?.id;


          if (!newLinkedAcc || !currentAcc || !oldLinkedAccId) {
              toast({ title: "Error", description: "Account details are missing or invalid.", variant: "destructive" });
              setIsSavingTransaction(false);
              return;
          }

          const dateISO = transactionDate.toISOString().split('T')[0]; // Store date as YYYY-MM-DD
          const desc = transactionDesc.trim();
          const currentAccName = currentAcc.name;
          const newLinkedAccName = newLinkedAcc.name;
          const originalSlip = editTarget.slipNumber; // Using the original slip to find transactions

          // Find both original transactions (current and old linked) by the original slip number.
          const transactionIndex1 = mockDb[userId].transactions.findIndex(t => t.slipNumber === originalSlip && t.accountId === currentAccId);
          const transactionIndex2 = mockDb[userId].transactions.findIndex(t => t.slipNumber === originalSlip && t.accountId === oldLinkedAccId); // Use oldLinkedAccId

          if (transactionIndex1 === -1 ) {
              toast({ title: "Error", description: "Could not find original transaction in current account.", variant: "destructive" });
              setIsSavingTransaction(false);
              return;
          }

          if( transactionIndex2 === -1) {
               toast({ title: "Error", description: `Could not find the original linked transaction in account "${editTarget.code}". It might have been deleted or modified separately.`, variant: "destructive" });
               setIsSavingTransaction(false);
               return;
          }

          // --- Update Transaction 1 (Current Account) ---
          const updatedT1: Transaction = {
              ...mockDb[userId].transactions[transactionIndex1], // Keep existing ID and number
              date: dateISO,
              description: desc,
              slipNumber: slip, // Use new slip number
              code: newLinkedAccName, // Link to the NEW linked account's name
              debit: transactionType === 'debit' ? amount : undefined,
              credit: transactionType === 'credit' ? amount : undefined,
          };

          // --- Update Transaction 2 (Linked Account) ---
          const oppositeType = transactionType === 'debit' ? 'credit' : 'debit';
          const updatedT2: Transaction = {
              ...mockDb[userId].transactions[transactionIndex2], // Keep existing ID and number
              accountId: newLinkedAccId, // Point to the NEW linked account ID
              date: dateISO,
              description: desc,
              slipNumber: slip, // Use new slip number
              code: currentAccName, // Link back to the current account's name
              debit: oppositeType === 'debit' ? amount : undefined,
              credit: oppositeType === 'credit' ? amount : undefined,
          };

          // Update both transactions in mock DB
          mockDb[userId].transactions[transactionIndex1] = updatedT1;
          mockDb[userId].transactions[transactionIndex2] = updatedT2;

          // Recalculate balances for CURRENT, OLD linked, and NEW linked accounts
          updateAccountBalance(currentAccId, userId);
          updateAccountBalance(oldLinkedAccId, userId); // Recalculate old linked account
          if (oldLinkedAccId !== newLinkedAccId) {
             updateAccountBalance(newLinkedAccId, userId); // Recalculate new linked account if different
          }

          // Refresh data for the current page
          loadAccountData();

          toast({
              title: "Transaction Updated",
              description: `Transaction ${slip} updated. Entries in ${currentAccName} and ${newLinkedAccName} modified.`,
          });

          setIsSavingTransaction(false);
          setIsEditTransactionDialogOpen(false);
          setEditTarget(null); // Clear edit target

      }, 500); // Simulate save delay
   };



  const handleDeleteTransaction = (transaction: TransactionWithBalance) => {
     // Check if the linked account exists before allowing deletion
     const linkedAccount = mockDb[userId].accounts.find(acc => acc.name === transaction.code);
     if (!linkedAccount) {
          toast({ title: "Deletion Error", description: `Cannot delete: Linked account "${transaction.code}" not found or is inactive. Resolve linked account issue first.`, variant: "destructive" });
          return;
     }
    setDeleteTarget(transaction);
    setShowFirstDeleteConfirm(true);
  };

  const confirmFirstDelete = () => {
    setShowFirstDeleteConfirm(false);
    setShowSecondDeleteConfirm(true); // Show the second confirmation
  };

   const confirmSecondDelete = () => {
     setShowSecondDeleteConfirm(false);
     if (deleteTarget) {
        setIsLoading(true); // Show loading while deleting
       // Simulate deletion from mock data
       setTimeout(() => {
         const slipToDelete = deleteTarget.slipNumber;
         const currentAccountId = deleteTarget.accountId;
         const linkedAccountName = deleteTarget.code;

         // Find the ID of the linked account based on its name (code)
         const linkedAccount = mockDb[userId].accounts.find(acc => acc.name === linkedAccountName);
         const linkedAccountId = linkedAccount?.id;

         if (!linkedAccountId) {
             toast({ title: "Deletion Error", description: `Could not find linked account "${linkedAccountName}" to remove the corresponding entry.`, variant: "destructive" });
             setIsLoading(false); // Stop loading
             setDeleteTarget(null); // Reset delete target
             return;
         }

         // Filter out both transactions (current and linked) by slip number
         const initialLength = mockDb[userId].transactions.length;
         mockDb[userId].transactions = mockDb[userId].transactions.filter(t => t.slipNumber !== slipToDelete);
         const deletedCount = initialLength - mockDb[userId].transactions.length;

         if (deletedCount < 2 && deletedCount > 0) { // Only warn if some but not all deleted
             console.warn(`Attempted to delete slip ${slipToDelete}, but found ${deletedCount} matching transactions instead of 2. Data might be inconsistent.`);
              toast({ title: "Partial Deletion", description: `Only found ${deletedCount} entry/entries for slip ${slipToDelete}. Data might be inconsistent.`, variant: "destructive" });
         } else if (deletedCount === 0) {
              console.warn(`Attempted to delete slip ${slipToDelete}, but no matching transactions found.`);
              toast({ title: "Deletion Failed", description: `No transactions found for slip number ${slipToDelete}.`, variant: "destructive" });
         }


         // Recalculate balances for BOTH accounts if deletion occurred
         if (deletedCount > 0) {
            updateAccountBalance(currentAccountId, userId);
            if (linkedAccountId) {
               updateAccountBalance(linkedAccountId, userId);
            }
             toast({
                 title: "Transaction Deleted",
                 description: `Transaction ${slipToDelete} and its linked entry removed. Balances updated.`,
                 variant: "default",
             });
         }

         // Refresh data for the current page regardless
         loadAccountData(); // This will set isLoading back to false

         if (selectedTransactionId === deleteTarget.id) {
             setSelectedTransactionId(null); // Deselect if the deleted row was selected
         }
         setDeleteTarget(null); // Reset delete target
      }, 500); // Simulate deletion delay
     } else {
         setDeleteTarget(null); // Reset delete target if it was somehow null
     }
   };

  // --- PDF Generation ---

    const openPdfLinePrompt = () => {
        setPdfLineNumber(""); // Reset line number input
        setIsPdfLinePromptOpen(true);
    };

    const handleGeneratePdfUptoLine = async () => {
        if (!account) {
            toast({ title: "Error", description: "Account data not loaded.", variant: "destructive" });
            return;
        }
        const lineNum = parseInt(pdfLineNumber, 10);
        if (isNaN(lineNum) || lineNum <= 0 || lineNum > transactionsWithBalance.length) {
            toast({
                title: "Invalid Line Number",
                description: `Please enter a valid transaction number between 1 and ${transactionsWithBalance.length}.`,
                variant: "destructive"
            });
            return;
        }

        setIsPdfLinePromptOpen(false); // Close the prompt dialog
        setIsPdfGenerating(true);
        let transactionsToInclude: TransactionWithBalance[] = [];
        let toastMessage = "";
        let filename = `Account_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

        try {
            // Find the transaction by its 'number' property (which corresponds to the line number)
             const transactionIndex = transactionsWithBalance.findIndex(t => t.number === lineNum);

             if (transactionIndex === -1) {
                  throw new Error(`Transaction number ${lineNum} not found.`);
             }

            // Get all transactions up to and including the selected line number
            transactionsToInclude = transactionsWithBalance.slice(0, transactionIndex + 1);

            if (transactionsToInclude.length === 0) {
                throw new Error("No transactions found up to the specified line.");
            }

            const selectedSlip = transactionsWithBalance[transactionIndex].slipNumber;
            toastMessage = `Generating PDF for '${account.name}' up to transaction no. ${lineNum}...`;
            filename = `Account_${account.name.replace(/\s+/g, '_')}_Upto_No_${lineNum}_${new Date().toISOString().split('T')[0]}.pdf`;

            toast({ title: "Processing...", description: toastMessage });

            const pdfDoc = await generateAccountPdf(account.name, transactionsToInclude);
            downloadPdf(pdfDoc.content, filename); // Trigger download using helper
            toast({ title: "PDF Ready", description: `PDF '${filename}' generated and download started.` });

        } catch (error: any) {
            console.error("PDF generation/download failed:", error);
            toast({ title: "PDF Error", description: error.message || "Could not generate or download PDF.", variant: "destructive" });
        } finally {
            setIsPdfGenerating(false);
        }
    };


  const handleGeneratePdf = async (type: 'whole' | 'upto') => {
     if (!account) {
          toast({ title: "Error", description: "Account data not loaded.", variant: "destructive" });
          return;
     }

     if (transactionsWithBalance.length === 0 && type === 'whole') {
         toast({ title: "Info", description: "No transactions in this account to generate a PDF.", variant: "default" });
         return;
     }

     if (type === 'upto') {
         openPdfLinePrompt(); // Open the line number prompt dialog
         return; // Stop further execution, handleGeneratePdfUptoLine will take over
     }

     // --- Handle 'whole' case ---
     setIsPdfGenerating(true);
     let transactionsToInclude: TransactionWithBalance[] = [];
     let toastMessage = "";
     let filename = `Account_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

     try {
         transactionsToInclude = transactionsWithBalance; // Use all currently displayed transactions
         toastMessage = `Generating PDF for the whole account '${account.name}'...`;
         filename = `Account_${account.name.replace(/\s+/g, '_')}_Whole_${new Date().toISOString().split('T')[0]}.pdf`;

         toast({ title: "Processing...", description: toastMessage });

         // Ensure there are transactions to include before generating
         if (transactionsToInclude.length === 0) {
             throw new Error("No transactions available to include in the PDF.");
         }

         const pdfDoc = await generateAccountPdf(account.name, transactionsToInclude);
         downloadPdf(pdfDoc.content, filename); // Trigger download using helper
         toast({ title: "PDF Ready", description: `PDF '${filename}' generated and download started.` });

     } catch (error: any) {
        console.error("PDF generation/download failed:", error);
        toast({ title: "PDF Error", description: error.message || "Could not generate or download PDF.", variant: "destructive" });
     } finally {
        setIsPdfGenerating(false);
     }
   };

   // Calculate current balance from the loaded account state
   const currentBalance = account?.balance ?? 0;

   const handleRowClick = (transactionId: string) => {
      setSelectedTransactionId(prevId => (prevId === transactionId ? null : transactionId)); // Toggle selection
   };


  // --- Conditional Rendering for Loading/Error States ---
    if (authLoading) {
     return (
        <div className="flex min-h-screen items-center justify-center p-4">
           <Card className="w-full max-w-6xl">
              <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-48" />
                  </div>
                  <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                  <div className="flex justify-between items-center mb-6">
                      <Skeleton className="h-10 w-36" />
                      <Skeleton className="h-10 w-32" />
                  </div>
                  <Skeleton className="h-80 w-full" />
              </CardContent>
              <CardFooter>
                  <Skeleton className="h-4 w-40" />
              </CardFooter>
           </Card>
        </div>
     );
    }

    if (!user) {
        return null;
    }

    if (isLoading) { // Separate loading state for account data fetching
        return (
         <div className="flex min-h-screen items-center justify-center p-4">
             <Card className="w-full max-w-6xl">
                 <CardHeader>
                     <div className="flex items-center gap-4 mb-4">
                         <Button variant="outline" size="icon" disabled>
                             <ArrowLeft className="h-4 w-4" />
                         </Button>
                         <Skeleton className="h-8 w-48" />
                     </div>
                     <Skeleton className="h-4 w-64" />
                 </CardHeader>
                 <CardContent>
                     <div className="flex justify-between items-center mb-6">
                         <Skeleton className="h-10 w-36" />
                         <Skeleton className="h-10 w-32" />
                     </div>
                     {/* Skeleton Table */}
                     <Table>
                         <TableHeader>
                             <TableRow>
                                 <TableHead className="w-[50px]"><Skeleton className="h-4 w-8" /></TableHead>
                                 <TableHead className="w-[100px]"><Skeleton className="h-4 w-20" /></TableHead>
                                 <TableHead><Skeleton className="h-4 w-48" /></TableHead>
                                 <TableHead className="w-[100px]"><Skeleton className="h-4 w-16" /></TableHead>
                                 <TableHead className="text-right w-[120px]"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                                 <TableHead className="text-right w-[120px]"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                                 <TableHead className="text-right w-[130px]"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                                 <TableHead className="w-[150px]"><Skeleton className="h-4 w-28" /></TableHead>
                                 <TableHead className="w-[80px]"><Skeleton className="h-4 w-12" /></TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {[...Array(5)].map((_, i) => ( // Show 5 skeleton rows
                                 <TableRow key={i}>
                                     <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                     <TableCell><Skeleton className="h-8 w-8" /></TableCell> {/* Action button skeleton */}
                                 </TableRow>
                             ))}
                         </TableBody>
                     </Table>
                 </CardContent>
                 <CardFooter>
                     <Skeleton className="h-4 w-40" />
                 </CardFooter>
             </Card>
         </div>
       );
     }

     // If account data loading finished but account is still null (e.g., not found)
      if (!account) {
          return (
              <div className="flex min-h-screen items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                      <CardHeader>
                          <CardTitle>Error</CardTitle>
                          <CardDescription>Account not found or you do not have permission to view it.</CardDescription>
                      </CardHeader>
                      <CardFooter>
                          <Button onClick={() => router.push("/dashboard")}>
                              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                          </Button>
                      </CardFooter>
                  </Card>
              </div>
          );
      }


  // --- Main Render ---
  // This part only renders if authLoading is false, user exists, isLoading is false, and account is found.
  return (
    <div className="flex min-h-screen flex-col bg-muted/40 p-4">
       <main className="flex-1 md:gap-8">
         <Card className="w-full max-w-7xl mx-auto">
           <CardHeader>
             <div className="flex items-center gap-4 mb-2">
                <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl">{account.name}</CardTitle>
             </div>
             <CardDescription>
                 View and manage transactions for this account. Current Balance:
                  <Badge
                    variant={currentBalance >= 0 ? "secondary" : "destructive"}
                    className="ml-2 font-mono text-sm"
                  >
                    ${Math.abs(currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="ml-1 text-xs font-normal">
                        {currentBalance >= 0 ? 'Cr' : 'Dr'}
                    </span>
                  </Badge>
             </CardDescription>
           </CardHeader>
           <CardContent>
              <div className="flex justify-between items-center mb-4">
                 <div className="flex gap-2">
                    <Button onClick={openAddTransactionDialog}>
                       <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
                    </Button>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="outline" disabled={isPdfGenerating}>
                           {isPdfGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                           Create PDF
                          </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent>
                          <DropdownMenuItem
                              onClick={() => handleGeneratePdf('whole')}
                              disabled={isPdfGenerating || transactionsWithBalance.length === 0}
                              title={transactionsWithBalance.length === 0 ? "No transactions to export" : "Export all transactions"}>
                             Whole Account
                          </DropdownMenuItem>
                          <DropdownMenuItem
                              onClick={() => handleGeneratePdf('upto')}
                              disabled={isPdfGenerating || transactionsWithBalance.length === 0}
                              title={transactionsWithBalance.length === 0 ? "No transactions available" : "Generate PDF up to a specific line number"}>
                             Up to Line No...
                          </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                 </div>
                 {/* TODO: Add Search/Filter Input */}
              </div>

             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-[50px]">No.</TableHead>
                   <TableHead className="w-[100px]">Date</TableHead>
                   <TableHead>Description</TableHead>
                   <TableHead className="w-[100px]">Slip No.</TableHead>
                   <TableHead className="text-right w-[120px]">Debit</TableHead>
                   <TableHead className="text-right w-[120px]">Credit</TableHead>
                   <TableHead className="text-right w-[130px]">Balance</TableHead>
                   <TableHead className="w-[150px]">Code (Linked)</TableHead>
                   <TableHead className="w-[80px]">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {transactionsWithBalance.length > 0 ? (
                   transactionsWithBalance.map((t) => (
                     <TableRow
                       key={t.id}
                       onClick={() => handleRowClick(t.id)}
                       className={cn(
                         "cursor-pointer hover:bg-muted/80",
                         selectedTransactionId === t.id && "bg-primary/10 hover:bg-primary/15"
                       )}
                       aria-selected={selectedTransactionId === t.id}
                      >
                       <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                             {selectedTransactionId === t.id && <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />}
                             <span className="flex-grow text-right">{t.number}</span>
                          </div>
                       </TableCell>
                       <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                       <TableCell className="max-w-[250px] truncate" title={t.description}>{t.description}</TableCell>
                       <TableCell>{t.slipNumber}</TableCell>
                       <TableCell className="text-right font-mono">
                         {t.debit ? `$${t.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                       </TableCell>
                       <TableCell className="text-right font-mono">
                          {t.credit ? `$${t.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                       </TableCell>
                       <TableCell className={cn(
                           "text-right font-mono",
                           t.balance < 0 ? "text-destructive" : ""
                        )}>
                          {`$${Math.abs(t.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          <span className="ml-1 text-xs text-muted-foreground">{t.balance >= 0 ? 'Cr' : 'Dr'}</span>
                       </TableCell>
                       <TableCell className="max-w-[150px] truncate" title={t.code}>{t.code || "-"}</TableCell>
                       <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default"> {/* Prevent row click when clicking actions */}
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button aria-haspopup="true" size="icon" variant="ghost" aria-label={`Actions for transaction ${t.slipNumber}`}>
                               <MoreVertical className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleEditTransaction(t); }}>
                               <Edit className="mr-2 h-4 w-4" /> Edit
                             </DropdownMenuItem>
                             <DropdownMenuItem
                                onSelect={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteTransaction(t); }}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </TableCell>
                     </TableRow>
                   ))
                 ) : (
                   <TableRow>
                     <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                       No transactions found for this account.
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </CardContent>
           <CardFooter>
             <div className="text-xs text-muted-foreground">
               Showing <strong>{transactionsWithBalance.length}</strong> transaction(s). {selectedTransactionId ? '1 row selected.' : ''}
             </div>
           </CardFooter>
         </Card>
       </main>

       {/* --- Dialogs --- */}

        {/* PDF Line Number Prompt Dialog */}
        <Dialog open={isPdfLinePromptOpen} onOpenChange={setIsPdfLinePromptOpen}>
           <DialogContent className="sm:max-w-xs">
             <DialogHeader>
               <DialogTitle>Generate PDF Up To Line</DialogTitle>
               <DialogDescription>
                 Enter the transaction number (No.) you want to include up to.
               </DialogDescription>
             </DialogHeader>
             <div className="grid gap-4 py-4">
               <div className="grid grid-cols-3 items-center gap-4">
                 <Label htmlFor="line-number" className="text-right">
                   Line No.
                 </Label>
                 <Input
                   id="line-number"
                   type="number"
                   value={pdfLineNumber}
                   onChange={(e) => setPdfLineNumber(e.target.value)}
                   className="col-span-2"
                   placeholder={`1-${transactionsWithBalance.length}`}
                   min="1"
                   max={transactionsWithBalance.length}
                   disabled={isPdfGenerating}
                 />
               </div>
             </div>
             <DialogFooter>
               <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isPdfGenerating}>Cancel</Button>
               </DialogClose>
               <Button
                 type="button"
                 onClick={handleGeneratePdfUptoLine}
                 disabled={isPdfGenerating || !pdfLineNumber || parseInt(pdfLineNumber, 10) <= 0 || parseInt(pdfLineNumber, 10) > transactionsWithBalance.length}
               >
                 {isPdfGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate"}
               </Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>


       {/* Add Transaction Dialog */}
       <Dialog open={isAddTransactionDialogOpen} onOpenChange={(open) => { if(!isSavingTransaction) setIsAddTransactionDialogOpen(open);}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Transaction to {account?.name}</DialogTitle>
              <DialogDescription>
                Enter details for the new transaction. A corresponding entry will be created in the linked account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 {/* Date */}
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="date" className="text-right">Date</Label>
                      <Popover>
                         <PopoverTrigger asChild>
                             <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                     "w-full justify-start text-left font-normal col-span-3", // Use w-full
                                     !transactionDate && "text-muted-foreground"
                                )}
                                disabled={isSavingTransaction}
                             >
                                 <CalendarIcon className="mr-2 h-4 w-4" />
                                 {transactionDate ? format(transactionDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0">
                             <Calendar
                                 mode="single"
                                 selected={transactionDate}
                                 onSelect={setTransactionDate}
                                 initialFocus
                             />
                         </PopoverContent>
                      </Popover>
                 </div>
                  {/* Description */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Textarea
                        id="description"
                        value={transactionDesc}
                        onChange={(e) => setTransactionDesc(e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., Payment for invoice #123"
                        disabled={isSavingTransaction}
                        required
                    />
                 </div>
                 {/* Slip Number */}
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="slip" className="text-right">Slip No.</Label>
                     <Input
                         id="slip"
                         value={transactionSlip}
                         onChange={(e) => setTransactionSlip(e.target.value)}
                         className="col-span-3"
                         placeholder="Unique slip number"
                         disabled={isSavingTransaction}
                         required
                     />
                 </div>
                  {/* Amount & Type */}
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="amount" className="text-right">Amount</Label>
                      <Input
                          id="amount"
                          type="number"
                          value={transactionAmount}
                          onChange={(e) => setTransactionAmount(e.target.value)}
                          className="col-span-2" // Adjusted span
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          disabled={isSavingTransaction}
                          required
                      />
                      <Select
                          value={transactionType}
                          onValueChange={(value) => setTransactionType(value as "debit" | "credit")}
                          disabled={isSavingTransaction}
                          required
                      >
                          <SelectTrigger className="w-full">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="debit">Debit</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                          </SelectContent>
                       </Select>
                 </div>
                  {/* Linked Account (Code) */}
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="linkedAccount" className="text-right">Linked Acct.</Label>
                      <Select
                          value={linkedAccountId}
                          onValueChange={setLinkedAccountId}
                          disabled={isSavingTransaction}
                          required
                      >
                          <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent>
                              {mockDb[userId].accounts.filter(acc => acc.id !== accountId).length > 0 ? ( // Filter out current account and check if others exist
                                  mockDb[userId].accounts.filter(acc => acc.id !== accountId).map(acc => (
                                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                  ))
                              ) : (
                                 <SelectItem value="-" disabled>No other accounts available</SelectItem>
                              )}
                          </SelectContent>
                      </Select>
                  </div>
             </div>
            <DialogFooter>
              <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSavingTransaction}>Cancel</Button>
              </DialogClose>
              <Button
                 type="button"
                 onClick={handleAddTransaction}
                 disabled={
                     isSavingTransaction ||
                     !transactionDate ||
                     !transactionDesc.trim() ||
                     !transactionSlip.trim() ||
                     !transactionAmount ||
                     !linkedAccountId ||
                     isNaN(parseFloat(transactionAmount.toString())) ||
                      parseFloat(transactionAmount.toString()) <= 0
                 }
              >
                 {isSavingTransaction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Transaction"}
              </Button>
            </DialogFooter>
          </DialogContent>
       </Dialog>


       {/* Edit Transaction Confirmation Dialog */}
       <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Edit Transaction?</AlertDialogTitle>
             <AlertDialogDescription>
               You are about to edit transaction with Slip No. <strong>{editTarget?.slipNumber}</strong>.
               This will modify entries in both this account and the linked account (<strong>{editTarget?.code}</strong>), and recalculate balances.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setEditTarget(null)}>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={confirmEditIntent}>Continue to Edit Form</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

        {/* Edit Transaction Form Dialog */}
        <Dialog open={isEditTransactionDialogOpen} onOpenChange={(open) => { if(!isSavingTransaction) { setIsEditTransactionDialogOpen(open); if (!open) setEditTarget(null); }}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Transaction (Slip: {editTarget?.slipNumber})</DialogTitle>
              <DialogDescription>
                Modify the details for this transaction. Changes will impact linked accounts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                {/* Date */}
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="edit-date" className="text-right">Date</Label>
                      <Popover>
                         <PopoverTrigger asChild>
                             <Button
                                id="edit-date"
                                variant={"outline"}
                                className={cn(
                                     "w-full justify-start text-left font-normal col-span-3", // Use w-full
                                     !transactionDate && "text-muted-foreground"
                                )}
                                disabled={isSavingTransaction}
                             >
                                 <CalendarIcon className="mr-2 h-4 w-4" />
                                 {transactionDate ? format(transactionDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0">
                             <Calendar
                                 mode="single"
                                 selected={transactionDate}
                                 onSelect={setTransactionDate}
                                 initialFocus
                             />
                         </PopoverContent>
                      </Popover>
                 </div>
                  {/* Description */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-description" className="text-right">Description</Label>
                    <Textarea
                        id="edit-description"
                        value={transactionDesc}
                        onChange={(e) => setTransactionDesc(e.target.value)}
                        className="col-span-3"
                        disabled={isSavingTransaction}
                        required
                    />
                 </div>
                 {/* Slip Number (Editable) */}
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="edit-slip" className="text-right">Slip No.</Label>
                     <Input
                         id="edit-slip"
                         value={transactionSlip}
                         onChange={(e) => setTransactionSlip(e.target.value)}
                         className="col-span-3"
                         disabled={isSavingTransaction}
                         required
                     />
                 </div>
                  {/* Amount & Type */}
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="edit-amount" className="text-right">Amount</Label>
                      <Input
                          id="edit-amount"
                          type="number"
                          value={transactionAmount}
                          onChange={(e) => setTransactionAmount(e.target.value)}
                          className="col-span-2"
                          step="0.01"
                          min="0.01"
                          disabled={isSavingTransaction}
                          required
                      />
                      <Select
                          value={transactionType}
                          onValueChange={(value) => setTransactionType(value as "debit" | "credit")}
                          disabled={isSavingTransaction}
                          required
                      >
                           <SelectTrigger className="w-full">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="debit">Debit</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                          </SelectContent>
                       </Select>
                 </div>
                  {/* Linked Account (Code) */}
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-linkedAccount" className="text-right">Linked Acct.</Label>
                      <Select
                          value={linkedAccountId}
                          onValueChange={setLinkedAccountId}
                          disabled={isSavingTransaction}
                          required
                      >
                          <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent>
                              {mockDb[userId].accounts.filter(acc => acc.id !== accountId).map(acc => ( // Filter out current account
                                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                              ))}
                               {/* Add the original linked account if it's the current account (edge case, shouldn't happen with filter) or inactive */}
                               {editTarget && !mockDb[userId].accounts.some(a => a.name === editTarget.code && a.id !== accountId) &&
                                  <SelectItem value={mockDb[userId].accounts.find(a => a.name === editTarget.code)?.id || ""} disabled>
                                      {editTarget.code} (Original)
                                  </SelectItem>
                               }
                          </SelectContent>
                      </Select>
                  </div>
             </div>
            <DialogFooter>
              <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSavingTransaction}>Cancel</Button>
              </DialogClose>
              <Button
                 type="button"
                 onClick={handleSaveEditedTransaction}
                  disabled={
                      isSavingTransaction ||
                      !transactionDate ||
                      !transactionDesc.trim() ||
                      !transactionSlip.trim() ||
                      !transactionAmount ||
                      !linkedAccountId ||
                      isNaN(parseFloat(transactionAmount.toString())) ||
                      parseFloat(transactionAmount.toString()) <= 0 ||
                      // Disable if no changes were made (optional but good UX)
                      ( editTarget &&
                          transactionDate.toISOString().split('T')[0] === editTarget.date &&
                          transactionDesc.trim() === editTarget.description &&
                          transactionSlip.trim() === editTarget.slipNumber &&
                          parseFloat(transactionAmount.toString()) === (editTarget.debit ?? editTarget.credit ?? 0) &&
                          transactionType === (editTarget.debit ? "debit" : "credit") &&
                          linkedAccountId === mockDb[userId].accounts.find(a=>a.name === editTarget?.code)?.id // Check against full DB
                      )
                 }
               >
                 {isSavingTransaction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

       {/* First Delete Confirmation Dialog */}
        <AlertDialog open={showFirstDeleteConfirm} onOpenChange={setShowFirstDeleteConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><AlertCircle className="text-destructive mr-2 h-5 w-5" />Confirm Deletion</AlertDialogTitle>
             <AlertDialogDescription>
               Do you really want to delete transaction with Slip No. <strong>{deleteTarget?.slipNumber}</strong>?
               This will also remove the corresponding entry in the linked account (<strong>{deleteTarget?.code || 'N/A'}</strong>). Account balances will be recalculated. This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={confirmFirstDelete} variant="default">Continue</AlertDialogAction> {/* Changed variant */}
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

        {/* Second Delete Confirmation Dialog */}
        <AlertDialog open={showSecondDeleteConfirm} onOpenChange={setShowSecondDeleteConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle className="flex items-center"><AlertCircle className="text-destructive mr-2 h-5 w-5" />Are you absolutely sure?</AlertDialogTitle>
             <AlertDialogDescription>
                You are about to permanently delete transaction <strong>{deleteTarget?.slipNumber}</strong> and its linked entry from account <strong>{deleteTarget?.code || 'N/A'}</strong>. Balances will be updated. This action cannot be reversed.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
              <Button onClick={confirmSecondDelete} variant="destructive">
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Delete Transaction"}
              </Button>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}

