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
  // DropdownMenuSeparator, // Not used currently
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


// Function to generate PDF (uses pdf-generator service) - remains the same
async function generateAccountPdf(accountName: string, transactions: TransactionWithBalance[]) {
  console.log(`Generating PDF for account: ${accountName}`);
  console.log("Including Transactions:", transactions.map(t => t.slipNumber));

  // Generate HTML content for the PDF, excluding the 'Code' column
  const htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: sans-serif; margin: 20px; }
        h1 { color: #333; }
        p { color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
        th { background-color: #f2f2f2; }
        td.number, td.currency { text-align: right; font-family: monospace; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .balance-summary { margin-top: 20px; font-weight: bold; text-align: right; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>Account Statement: ${accountName}</h1>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Description</th>
            <th>Slip No.</th>
            <th style="text-align: right;">Debit</th>
            <th style="text-align: right;">Credit</th>
            <th style="text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td class="number">${t.number}</td>
              <td>${new Date(t.date).toLocaleDateString()}</td>
              <td>${t.description}</td>
              <td>${t.slipNumber}</td>
              <td class="currency">${t.debit ? `$${t.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
              <td class="currency">${t.credit ? `$${t.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
              <td class="currency">$${t.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${transactions.length > 0 ? `
      <p class="balance-summary">Final Balance: $${transactions[transactions.length - 1].balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      ` : '<p>No transactions to display.</p>'}
    </body>
    </html>
  `;

  try {
    const pdfDoc = await generatePdf(htmlContent); // Call the actual service
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

  // Add/Edit Transaction Form State
   const [transactionDate, setTransactionDate] = React.useState<Date | undefined>(new Date());
   const [transactionDesc, setTransactionDesc] = React.useState("");
   const [transactionSlip, setTransactionSlip] = React.useState("");
   const [transactionAmount, setTransactionAmount] = React.useState<number | string>("");
   const [transactionType, setTransactionType] = React.useState<"debit" | "credit">("debit");
   const [linkedAccountId, setLinkedAccountId] = React.useState<string>("");


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
         // Update the main account object's balance (optional, might not be needed if always calculated)
         setAccount(prev => prev ? { ...prev, balance: finalBalance } : null);

       } else {
         toast({ title: "Error", description: "Account not found.", variant: "destructive" });
         router.push("/dashboard"); // Redirect if account doesn't exist
       }
       setIsLoading(false);
     }, 500); // Simulate network delay
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
       toast({ title: "Error", description: "Please fill all transaction fields.", variant: "destructive" });
       return;
     }
     const amount = parseFloat(transactionAmount.toString());
     if (isNaN(amount) || amount <= 0) {
       toast({ title: "Error", description: "Please enter a valid positive amount.", variant: "destructive" });
       return;
     }
      const slip = transactionSlip.trim();
      if (slipNumberExists(slip, userId)) {
         toast({ title: "Error", description: `Slip number "${slip}" already exists. Please use a unique one.`, variant: "destructive" });
         return;
     }

     setIsSavingTransaction(true);
     // Simulate adding transaction to mock data (Double Entry)
     setTimeout(() => {
         const currentAccId = accountId!;
         const linkedAccId = linkedAccountId;
         const linkedAcc = mockDb[userId].accounts.find(a => a.id === linkedAccId);
         if(!linkedAcc || !account) { // Add check for current account existence
             toast({ title: "Error", description: "Account details are missing.", variant: "destructive" });
             setIsSavingTransaction(false);
             return;
         }

         const dateISO = transactionDate.toISOString();
         const desc = transactionDesc.trim();
         const currentAccName = account.name;
         const linkedAccName = linkedAcc.name;

         // Transaction 1 (Current Account)
         const t1: Transaction = {
             id: getNextTransactionId(),
             accountId: currentAccId,
             number: getNextTransactionNumber(currentAccId, userId),
             date: dateISO,
             description: desc,
             slipNumber: slip,
             code: linkedAccName, // Link to the other account
             [transactionType]: amount, // Set debit or credit based on selection
         };

         // Transaction 2 (Linked Account - opposite entry)
         const t2: Transaction = {
             id: getNextTransactionId(),
             accountId: linkedAccId,
             number: getNextTransactionNumber(linkedAccId, userId),
             date: dateISO,
             description: desc, // Can customize description slightly if needed, e.g., "From/To [CurrentAccountName]"
             slipNumber: slip,
             code: currentAccName, // Link back to the current account
             // Opposite entry type
             [transactionType === 'debit' ? 'credit' : 'debit']: amount,
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


  const handleEditTransaction = (transaction: Transaction) => {
    setEditTarget(transaction);
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
          const linkedAcc = allAccounts.find(acc => acc.name === editTarget?.code);
          setLinkedAccountId(linkedAcc?.id || "");

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
           toast({ title: "Error", description: "Please fill all transaction fields.", variant: "destructive" });
           return;
        }
        const amount = parseFloat(transactionAmount.toString());
        if (isNaN(amount) || amount <= 0) {
           toast({ title: "Error", description: "Please enter a valid positive amount.", variant: "destructive" });
           return;
        }
        const slip = transactionSlip.trim();
        // Allow the same slip number if it's the same transaction, otherwise, ensure uniqueness
        if (slip !== editTarget.slipNumber && slipNumberExists(slip, userId)) {
           toast({ title: "Error", description: `Slip number "${slip}" already exists. Please use a unique one.`, variant: "destructive" });
           return;
        }

      setIsSavingTransaction(true);
      setTimeout(() => {
          const currentAccId = accountId!;
          const linkedAccId = linkedAccountId;

          // Retrieve current account and linked account objects.
          const currentAcc = mockDb[userId].accounts.find(a => a.id === currentAccId);
          const linkedAcc = mockDb[userId].accounts.find(a => a.id === linkedAccId);

          if (!linkedAcc || !currentAcc) {
              toast({ title: "Error", description: "Account details are missing.", variant: "destructive" });
              setIsSavingTransaction(false);
              return;
          }

          const dateISO = transactionDate.toISOString();
          const desc = transactionDesc.trim();
          const currentAccName = currentAcc.name;
          const linkedAccName = linkedAcc.name;
          const slipToUpdate = editTarget.slipNumber; // Using the original slip to find transactions

          // Find both transactions (current and linked) by the original slip number.
          const transactionIndex1 = mockDb[userId].transactions.findIndex(t => t.slipNumber === slipToUpdate && t.accountId === currentAccId);
          const transactionIndex2 = mockDb[userId].transactions.findIndex(t => t.slipNumber === slipToUpdate && t.accountId === linkedAccId);

          if (transactionIndex1 === -1 ) {
              toast({ title: "Error", description: "Could not find original transaction in current account.", variant: "destructive" });
              setIsSavingTransaction(false);
              return;
          }

          if( transactionIndex2 === -1) {
               toast({ title: "Error", description: "Could not find linked transaction.", variant: "destructive" });
               setIsSavingTransaction(false);
               return;
          }

          // Transaction 1 (Current Account) - Update with new values
          const updatedT1: Transaction = {
              ...mockDb[userId].transactions[transactionIndex1], // Keep existing properties
              date: dateISO,
              description: desc,
              slipNumber: slip,
              code: linkedAccName, // Link to the other account
              [transactionType]: amount, // Set debit or credit based on selection
              debit: transactionType === 'debit' ? amount : undefined,
              credit: transactionType === 'credit' ? amount : undefined,
          };

          // Transaction 2 (Linked Account) - Update with new values and opposite entry
          const oppositeType = transactionType === 'debit' ? 'credit' : 'debit';

          const updatedT2: Transaction = {
              ...mockDb[userId].transactions[transactionIndex2], // Keep existing properties
              date: dateISO,
              description: desc,
              slipNumber: slip,
              code: currentAccName, // Link back to the current account
              [oppositeType]: amount, // Opposite entry type
              debit: oppositeType === 'debit' ? amount : undefined,
              credit: oppositeType === 'credit' ? amount : undefined,
          };

          // Update both transactions in mock DB
          mockDb[userId].transactions[transactionIndex1] = updatedT1;
          mockDb[userId].transactions[transactionIndex2] = updatedT2;

          // Recalculate balances for BOTH accounts
          updateAccountBalance(currentAccId, userId);
          updateAccountBalance(linkedAccId, userId);

          // Refresh data for the current page
          loadAccountData();

          toast({
              title: "Transaction Updated",
              description: `Transaction ${slip} updated in ${currentAccName} and ${linkedAccName}.`,
          });

          setIsSavingTransaction(false);
          setIsEditTransactionDialogOpen(false);
          setEditTarget(null);

      }, 500);
   };



  const handleDeleteTransaction = (transaction: TransactionWithBalance) => {
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

         // Filter out both transactions (current and linked) by slip number
         mockDb[userId].transactions = mockDb[userId].transactions.filter(t => t.slipNumber !== slipToDelete);

         // Recalculate balances for BOTH accounts
         updateAccountBalance(currentAccountId, userId);
         if (linkedAccountId) {
           updateAccountBalance(linkedAccountId, userId);
         }

         // Refresh data for the current page
         loadAccountData(); // This will set isLoading back to false

         toast({
           title: "Transaction Deleted",
           description: `Transaction ${slipToDelete} and its linked entry removed. Balances updated.`,
           variant: "destructive",
         });

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
  const handleGeneratePdf = async (type: 'whole' | 'upto') => {
     setIsPdfGenerating(true);
     let transactionsToInclude: TransactionWithBalance[] = [];
     let toastMessage = "";
     let filename = `Account_${account?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

     try {
       if (transactionsWithBalance.length === 0) {
           throw new Error("No transactions available to generate PDF.");
       }

       if (type === 'whole') {
         transactionsToInclude = transactionsWithBalance; // Use all currently displayed transactions
         toastMessage = `PDF for the whole account '${account?.name}' is being generated.`;
         filename = `Account_${account?.name?.replace(/\s+/g, '_')}_Whole_${new Date().toISOString().split('T')[0]}.pdf`;
       } else if (type === 'upto' && selectedTransactionId) {
          const selectedIndex = transactionsWithBalance.findIndex(t => t.id === selectedTransactionId);
          if (selectedIndex !== -1) {
             // Get all transactions up to and including the selected one
             transactionsToInclude = transactionsWithBalance.slice(0, selectedIndex + 1);
             const selectedSlip = transactionsWithBalance[selectedIndex].slipNumber;
             toastMessage = `PDF for '${account?.name}' up to transaction ${selectedSlip} is being generated.`;
             filename = `Account_${account?.name?.replace(/\s+/g, '_')}_Upto_${selectedSlip}_${new Date().toISOString().split('T')[0]}.pdf`;
          } else {
             throw new Error("Selected transaction not found.");
          }
       } else if (type === 'upto' && !selectedTransactionId) {
           throw new Error("Please select a transaction row first to generate a PDF up to that line.");
       } else {
           throw new Error("Invalid PDF generation type.");
       }

       if (transactionsToInclude.length === 0) {
          throw new Error("No transactions selected to generate PDF.");
       }

       toast({ title: "Generating PDF...", description: toastMessage });
       const pdfDoc = await generateAccountPdf(account?.name || "Unknown Account", transactionsToInclude);
       downloadPdf(pdfDoc.content, filename); // Trigger download using helper
       toast({ title: "PDF Ready", description: `PDF '${filename}' generated and download started.` });

     } catch (error: any) {
        console.error("PDF generation/download failed:", error);
        toast({ title: "PDF Error", description: error.message || "Could not generate or download PDF.", variant: "destructive" });
     } finally {
        setIsPdfGenerating(false);
     }
   };

   // Calculate current balance (get from the last transaction's balance)
   const currentBalance = transactionsWithBalance.length > 0
        ? transactionsWithBalance[transactionsWithBalance.length - 1].balance
        : 0;

   const handleRowClick = (transactionId: string) => {
      setSelectedTransactionId(prevId => (prevId === transactionId ? null : transactionId)); // Toggle selection
   };


  if (authLoading || isLoading) {
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

  if (!user || !account) return null; // Should be redirected or handled by loading state

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 p-4">
       <main className="flex-1 md:gap-8">
         <Card className="w-full max-w-7xl mx-auto">
           <CardHeader>
             <div className="flex items-center gap-4 mb-2">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <CardTitle className="text-2xl">{account?.name || "Account Details"}</CardTitle>
             </div>
             <CardDescription>
                 View and manage transactions for this account. Current Balance:
                 <Badge variant={currentBalance >= 0 ? "secondary" : "destructive"} className="ml-2 font-mono">
                     ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </Badge>
                  {selectedTransactionId && <Badge variant="outline" className="ml-2">Row Selected</Badge>}
                  {!selectedTransactionId && <Badge variant="ghost" className="ml-2 text-muted-foreground">Click row to select</Badge>}
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
                         <Button variant="outline" disabled={isPdfGenerating || transactionsWithBalance.length === 0}>
                           {isPdfGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                           Create PDF
                          </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent>
                          <DropdownMenuItem
                              onClick={() => handleGeneratePdf('whole')}
                              disabled={isPdfGenerating || transactionsWithBalance.length === 0}>
                             Whole Account
                          </DropdownMenuItem>
                          <DropdownMenuItem
                              onClick={() => handleGeneratePdf('upto')}
                              disabled={!selectedTransactionId || isPdfGenerating}
                              title={!selectedTransactionId ? "Select a row first" : `Generate up to Slip No. ${transactionsWithBalance.find(t=>t.id===selectedTransactionId)?.slipNumber}`}>
                             Up to Selected Line
                          </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                 </div>
                 {/* TODO: Add Search Input */}
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
                   <TableHead className="w-[150px]">Code (Linked Acct)</TableHead>
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
                       <TableCell>
                          <div className="flex items-center gap-1">
                             {selectedTransactionId === t.id && <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />}
                             <span className="flex-grow">{t.number}</span>
                          </div>
                       </TableCell>
                       <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                       <TableCell>{t.description}</TableCell>
                       <TableCell>{t.slipNumber}</TableCell>
                       <TableCell className="text-right font-mono">
                         {t.debit ? `$${t.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                       </TableCell>
                       <TableCell className="text-right font-mono">
                          {t.credit ? `$${t.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                       </TableCell>
                       <TableCell className="text-right font-mono">
                          {`$${t.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                       </TableCell>
                       <TableCell>{t.code || "-"}</TableCell>
                       <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default">
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button aria-haspopup="true" size="icon" variant="ghost">
                               <MoreVertical className="h-4 w-4" />
                               <span className="sr-only">Toggle menu</span>
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
                     <TableCell colSpan={9} className="text-center h-24">
                       No transactions found for this account.
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </CardContent>
           <CardFooter>
             <div className="text-xs text-muted-foreground">
               Showing <strong>{transactionsWithBalance.length}</strong> transactions. {selectedTransactionId ? '1 row selected.' : ''}
             </div>
           </CardFooter>
         </Card>
       </main>

       {/* --- Dialogs --- */}

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
                                     "w-[280px] justify-start text-left font-normal col-span-3", // Adjusted width via w-[]
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
                      />
                      <Select
                          value={transactionType}
                          onValueChange={(value) => setTransactionType(value as "debit" | "credit")}
                          disabled={isSavingTransaction}
                      >
                           {/* Adjusted width via w-full within the col-span-1 implicit container */}
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
                      >
                          <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent>
                              {allAccounts.length > 0 ? (
                                  allAccounts.map(acc => (
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
              <Button type="button" onClick={handleAddTransaction} disabled={isSavingTransaction || !linkedAccountId || !transactionAmount || !transactionDesc.trim() || !transactionSlip.trim()}>
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
               Preparing to edit transaction with Slip No. <strong>{editTarget?.slipNumber}</strong>.
               This involves modifying linked entries and recalculating balances.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setEditTarget(null)}>Cancel</AlertDialogCancel>
             {/* Change this from Button to AlertDialogAction if preferred */}
              <AlertDialogAction onClick={confirmEditIntent}>Continue to Edit Form</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

        {/* Edit Transaction Form Dialog (similar to Add, pre-filled) */}
        <Dialog open={isEditTransactionDialogOpen} onOpenChange={(open) => { if(!isSavingTransaction) { setIsEditTransactionDialogOpen(open); if (!open) setEditTarget(null); }}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Transaction (Slip: {editTarget?.slipNumber})</DialogTitle>
              <DialogDescription>
                Modify the details for this transaction. Changes impact linked accounts.
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
                                     "w-[280px] justify-start text-left font-normal col-span-3",
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
                         PopoverContent>
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
                    />
                 </div>
                 {/* Slip Number (Read-only usually) */}
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="edit-slip" className="text-right">Slip No.</Label>
                     <Input
                         id="edit-slip"
                         value={transactionSlip}
                         onChange={(e) => setTransactionSlip(e.target.value)} // Make editable
                         className="col-span-3"
                         //readOnly // Typically slip number shouldn't be editable easily
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
                      />
                      <Select
                          value={transactionType}
                          onValueChange={(value) => setTransactionType(value as "debit" | "credit")}
                          disabled={isSavingTransaction}
                      >
                           <SelectTrigger className="w-full"> {/* Adjusted width */}
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
                      >
                          <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent>
                              {allAccounts.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
             </div>
            <DialogFooter>
              <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSavingTransaction}>Cancel</Button>
              </DialogClose>
              {/* Disable Save Button for Edit */}
              <Button
                 type="button"
                 onClick={handleSaveEditedTransaction}
                 disabled={isSavingTransaction}
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
               This will also remove the corresponding entry in the linked account ({deleteTarget?.code || 'N/A'}). Account balances will be recalculated. This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={confirmFirstDelete} variant="destructive">Continue</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

        {/* Second Delete Confirmation Dialog */}
        <AlertDialog open={showSecondDeleteConfirm} onOpenChange={setShowSecondDeleteConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle className="flex items-center"><AlertCircle className="text-destructive mr-2 h-5 w-5" />Are you absolutely sure?</AlertDialogTitle>
             <AlertDialogDescription>
                Permanently deleting transaction <strong>{deleteTarget?.slipNumber}</strong> and its linked entry from account <strong>{deleteTarget?.code || 'N/A'}</strong>. Balances will be updated. This action cannot be reversed.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
              <Button onClick={confirmSecondDelete} variant="destructive">Yes, Delete Transaction</Button>
           AlertDialogFooter>
         AlertDialogContent>
       </AlertDialog>
    </div>
  );
}

