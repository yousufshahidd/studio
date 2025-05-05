
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Edit, Trash2, FileText, MoreVertical, Loader2, AlertCircle, CheckCircle } from "lucide-react";
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
  DropdownMenuSeparator,
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // Import cn for conditional classes

// Mock data for transactions - replace with actual data fetching from Firestore
interface Transaction {
  id: string;
  number: number; // Unique transaction identifier within the account
  date: string; // Store as ISO string or Firestore Timestamp
  description: string;
  slipNumber: string; // Unique identifier across the application
  debit?: number;
  credit?: number;
  code?: string; // Linked account name
}

// Mock account data (fetch based on accountId)
const mockAccounts = {
  "1": { name: "Cash", transactions: [
    { id: "t1", number: 1, date: "2024-07-20", description: "Initial Balance", slipNumber: "S001", credit: 2000.00 },
    { id: "t2", number: 2, date: "2024-07-21", description: "Office Supplies Purchase", slipNumber: "S002", debit: 150.50, code: "Office Supplies" },
    { id: "t3", number: 3, date: "2024-07-22", description: "Client Payment Received", slipNumber: "S003", credit: 500.25, code: "Accounts Receivable" },
    { id: "t7", number: 4, date: "2024-07-23", description: "Rent Payment", slipNumber: "S005", debit: 800.00, code: "Rent Expense" },
  ]},
  "2": { name: "Accounts Receivable", transactions: [
     { id: "t4", number: 1, date: "2024-07-19", description: "Invoice #INV001", slipNumber: "S004", debit: 5200.00 },
     { id: "t5", number: 2, date: "2024-07-22", description: "Payment for INV001", slipNumber: "S003", credit: 500.25 }, // Linked via slipNumber S003
  ]},
   "3": { name: "Office Supplies", transactions: [
     { id: "t6", number: 1, date: "2024-07-21", description: "Purchase from Cash", slipNumber: "S002", credit: 150.50 }, // Linked via slipNumber S002
   ]},
   "4": { name: "Rent Expense", transactions: [
       { id: "t8", number: 1, date: "2024-07-23", description: "Paid from Cash", slipNumber: "S005", credit: 800.00 }, // Linked via slipNumber S005
   ]},
};

// Function to generate PDF (Placeholder)
async function generateAccountPdf(accountId: string, transactionIds?: string[]) {
  // TODO: Integrate with src/services/pdf-generator.ts
  const account = (mockAccounts as any)[accountId];
  let transactionsToInclude = account?.transactions || [];

  if (transactionIds) {
    const idSet = new Set(transactionIds);
    transactionsToInclude = transactionsToInclude.filter((t: Transaction) => idSet.has(t.id));
  }

  console.log(`Generating PDF for account: ${accountId}`);
  console.log("Including Transactions:", transactionsToInclude.map((t: Transaction) => t.slipNumber));

  // Placeholder HTML generation (In real app, use pdf-generator service)
  const htmlContent = `
    <h1>Account Statement: ${account?.name}</h1>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Date</th>
          <th>Description</th>
          <th>Slip No.</th>
          <th>Debit</th>
          <th>Credit</th>
        </tr>
      </thead>
      <tbody>
        ${transactionsToInclude.map((t: Transaction) => `
          <tr>
            <td>${t.number}</td>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>${t.description}</td>
            <td>${t.slipNumber}</td>
            <td style="text-align: right;">${t.debit ? `$${t.debit.toFixed(2)}` : '-'}</td>
            <td style="text-align: right;">${t.credit ? `$${t.credit.toFixed(2)}` : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p>Final Balance: $${transactionsToInclude.reduce((bal: number, t: Transaction) => bal + (t.credit || 0) - (t.debit || 0), 0).toFixed(2)}</p>
  `;
  console.log("HTML Content for PDF:", htmlContent);
  // const pdfDoc = await generatePdf(htmlContent); // Call the actual service
  // downloadPdf(pdfDoc.content, `account_${accountId}_report.pdf`);
  return new Promise(resolve => setTimeout(resolve, 1000)); // Simulate generation time
}

export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [accountName, setAccountName] = React.useState<string>("");
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{id: string; slipNumber: string; code?: string} | null>(null);
  const [showFirstDeleteConfirm, setShowFirstDeleteConfirm] = React.useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Transaction | null>(null);
  const [showEditConfirm, setShowEditConfirm] = React.useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null); // State for selected row

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/"); // Redirect if not logged in
    } else if (user && accountId) {
      // Simulate fetching account details and transactions
      setIsLoading(true);
      setSelectedTransactionId(null); // Reset selection on account change
      setTimeout(() => {
        const accountData = (mockAccounts as any)[accountId];
        if (accountData) {
          setAccountName(accountData.name);
          setTransactions(accountData.transactions.sort((a: Transaction, b: Transaction) => a.number - b.number)); // Sort by number
        } else {
          toast({ title: "Error", description: "Account not found.", variant: "destructive" });
          router.push("/dashboard"); // Redirect if account doesn't exist
        }
        setIsLoading(false);
      }, 1000); // Simulate network delay
    }
  }, [user, authLoading, accountId, router, toast]);

   const handleAddTransaction = () => {
    // TODO: Implement Add Transaction functionality (e.g., open a modal form)
    // Should handle duplicate slip number check before saving
    toast({
      title: "Feature Coming Soon",
      description: "Adding new transactions will be available shortly.",
    });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditTarget(transaction);
    setShowEditConfirm(true);
  };

  const confirmEditTransaction = () => {
     setShowEditConfirm(false);
     // TODO: Open edit modal/form with data from editTarget
     // On save, update both the current transaction and the linked one if 'code' exists
     toast({
       title: "Edit Confirmed (WIP)",
       description: `Editing transaction ${editTarget?.slipNumber}. Implementation pending.`,
     });
     setEditTarget(null); // Reset edit target
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setDeleteTarget({ id: transaction.id, slipNumber: transaction.slipNumber, code: transaction.code });
    setShowFirstDeleteConfirm(true);
  };

  const confirmFirstDelete = () => {
    setShowFirstDeleteConfirm(false);
    setShowSecondDeleteConfirm(true); // Show the second confirmation
  };

   const confirmSecondDelete = () => {
     setShowSecondDeleteConfirm(false);
     if (deleteTarget) {
       // TODO: Implement actual deletion logic in Firestore
       // This includes finding and deleting the linked transaction if 'code' exists
       // IMPORTANT: Need to handle cascading deletes or updates based on double-entry rules.
       // For now, just remove from the current view and log the linked action.
       const slipToDelete = deleteTarget.slipNumber;
       const linkedAccountCode = deleteTarget.code;

       setTransactions(prev => prev.filter(t => t.id !== deleteTarget.id));
       if (selectedTransactionId === deleteTarget.id) {
         setSelectedTransactionId(null); // Deselect if the deleted row was selected
       }

       toast({
         title: "Transaction Deleted",
         description: `Transaction ${slipToDelete} removed from ${accountName}.`,
         variant: "destructive",
       });

       // Simulate finding and deleting linked transaction
       if (linkedAccountCode) {
         console.log(`Need to delete transaction with slip ${slipToDelete} in account ${linkedAccountCode}`);
         // In a real app: Find account by name `linkedAccountCode`, find transaction by `slipToDelete`, delete it.
         // Example of updating mock data (not ideal for real app):
         Object.keys(mockAccounts).forEach(key => {
             const acc = (mockAccounts as any)[key];
             if(acc.name === linkedAccountCode) {
                 acc.transactions = acc.transactions.filter((t: Transaction) => t.slipNumber !== slipToDelete);
                 console.log(`Simulated deletion from linked account: ${linkedAccountCode}`);
             }
         });
       } else {
          console.log(`Transaction ${slipToDelete} had no linked account code.`);
       }
     }
     setDeleteTarget(null); // Reset delete target
   };

  const handleGeneratePdf = async (type: 'whole' | 'upto') => {
     setIsPdfGenerating(true);
     let transactionIds: string[] | undefined = undefined;
     let toastMessage = "";

     try {
       if (type === 'whole') {
         // Use all transaction IDs (or simply pass undefined to generateAccountPdf)
         transactionIds = undefined; // Or transactions.map(t => t.id) if the function requires it
         toastMessage = `PDF for the whole account is ready for download (Simulation).`;
       } else if (type === 'upto' && selectedTransactionId) {
          const selectedIndex = transactions.findIndex(t => t.id === selectedTransactionId);
          if (selectedIndex !== -1) {
             // Get all transactions up to and including the selected one
             transactionIds = transactions.slice(0, selectedIndex + 1).map(t => t.id);
             const selectedSlip = transactions[selectedIndex].slipNumber;
             toastMessage = `PDF up to transaction ${selectedSlip} is ready for download (Simulation).`;
          } else {
             throw new Error("Selected transaction not found.");
          }
       } else {
           throw new Error("Invalid PDF generation type or no transaction selected.");
       }

       await generateAccountPdf(accountId, transactionIds);
       toast({ title: "PDF Generated", description: toastMessage });
       // In real implementation, trigger download here
     } catch (error: any) {
        console.error("PDF generation failed:", error);
        toast({ title: "PDF Error", description: error.message || "Could not generate PDF.", variant: "destructive" });
     } finally {
        setIsPdfGenerating(false);
     }
   };

   // Calculate current balance
   const currentBalance = transactions.reduce((bal, t) => {
     return bal + (t.credit || 0) - (t.debit || 0);
   }, 0);

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

  if (!user) return null; // Should be redirected by useEffect

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 p-4">
       <main className="flex-1 md:gap-8">
         <Card className="w-full max-w-6xl mx-auto">
           <CardHeader>
             <div className="flex items-center gap-4 mb-2">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <CardTitle className="text-2xl">{accountName || "Account Details"}</CardTitle>
             </div>
             <CardDescription>
                 View and manage transactions for this account. Current Balance:
                 <Badge variant={currentBalance >= 0 ? "secondary" : "destructive"} className="ml-2">
                     ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </Badge>
                  {selectedTransactionId && <Badge variant="outline" className="ml-2">Row Selected</Badge>}
             </CardDescription>
           </CardHeader>
           <CardContent>
              <div className="flex justify-between items-center mb-4">
                 <div className="flex gap-2">
                    <Button onClick={handleAddTransaction}>
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
                          <DropdownMenuItem onClick={() => handleGeneratePdf('whole')} disabled={isPdfGenerating}>
                             Whole Account
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGeneratePdf('upto')} disabled={!selectedTransactionId || isPdfGenerating}>
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
                   <TableHead className="w-[150px]">Code (Linked Acct)</TableHead>
                   <TableHead className="w-[80px]">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {transactions.length > 0 ? (
                   transactions.map((t) => (
                     <TableRow
                       key={t.id}
                       onClick={() => handleRowClick(t.id)}
                       className={cn(
                         "cursor-pointer hover:bg-muted/80", // General hover effect
                         selectedTransactionId === t.id && "bg-primary/10 hover:bg-primary/15" // Selected style
                       )}
                       aria-selected={selectedTransactionId === t.id}
                      >
                       <TableCell>
                          <div className="flex items-center gap-2">
                             {selectedTransactionId === t.id && <CheckCircle className="h-4 w-4 text-primary" />}
                             {t.number}
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
                       <TableCell>{t.code || "-"}</TableCell>
                       <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default"> {/* Prevent row selection when clicking actions */}
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
                             {/* Removed PDF this Line */}
                             {/* <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleGeneratePdf('specific', t);}} disabled={isPdfGenerating}>
                               <FileText className="mr-2 h-4 w-4" /> PDF this Line
                              </DropdownMenuItem> */}
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </TableCell>
                     </TableRow>
                   ))
                 ) : (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center h-24">
                       No transactions found for this account.
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </CardContent>
           <CardFooter>
             <div className="text-xs text-muted-foreground">
               Showing <strong>{transactions.length}</strong> transactions. {selectedTransactionId ? '1 row selected.' : ''}
             </div>
           </CardFooter>
         </Card>
       </main>

       {/* Edit Confirmation Dialog */}
       <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Edit Transaction?</AlertDialogTitle>
             <AlertDialogDescription>
               Do you really want to edit transaction with Slip No. <strong>{editTarget?.slipNumber}</strong>?
               Changes will also affect the linked account ({editTarget?.code || 'N/A'}) if applicable.
               <br/><br/>
               <span className="font-semibold text-foreground">Note:</span> Edit functionality is not yet fully implemented.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setEditTarget(null)}>Cancel</AlertDialogCancel>
             {/* <AlertDialogAction onClick={confirmEditTransaction}>Yes, Edit</AlertDialogAction> */}
              <Button onClick={confirmEditTransaction} disabled>Yes, Edit (WIP)</Button> {/* Keep disabled until implemented */}
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       {/* First Delete Confirmation Dialog */}
        <AlertDialog open={showFirstDeleteConfirm} onOpenChange={setShowFirstDeleteConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><AlertCircle className="text-destructive mr-2 h-5 w-5" />Confirm Deletion</AlertDialogTitle>
             <AlertDialogDescription>
               Do you really want to delete transaction with Slip No. <strong>{deleteTarget?.slipNumber}</strong>?
               This will also remove the corresponding entry in the linked account ({deleteTarget?.code || 'N/A'}) if applicable.
               <br/><br/>
                <span className="font-semibold text-destructive">Warning:</span> This operation requires careful handling of linked entries and is currently simulated.
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
                This action cannot be undone. Permanently deleting transaction <strong>{deleteTarget?.slipNumber}</strong> and its linked entry (if any).
                <br/><br/>
                 <span className="font-semibold text-destructive">Note:</span> This is a simulation. Actual database deletion needs implementation.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
             {/* <AlertDialogAction onClick={confirmSecondDelete} variant="destructive">Yes, Delete Permanently</AlertDialogAction> */}
              <Button onClick={confirmSecondDelete} variant="destructive">Yes, Delete (Simulated)</Button> {/* Indicate simulation */}
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}

    