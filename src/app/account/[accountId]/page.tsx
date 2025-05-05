"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Edit, Trash2, FileText, MoreVertical, Loader2, AlertCircle } from "lucide-react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuPortal
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
  ]},
  "2": { name: "Accounts Receivable", transactions: [
     { id: "t4", number: 1, date: "2024-07-19", description: "Invoice #INV001", slipNumber: "S004", debit: 5200.00 },
     { id: "t5", number: 2, date: "2024-07-22", description: "Payment for INV001", slipNumber: "S003", credit: 500.25 }, // Linked via slipNumber S003
  ]},
   "3": { name: "Office Supplies", transactions: [
     { id: "t6", number: 1, date: "2024-07-21", description: "Purchase from Cash", slipNumber: "S002", credit: 150.50 }, // Linked via slipNumber S002
   ]},
};

// Function to generate PDF (Placeholder)
async function generateAccountPdf(accountId: string, transactionIds?: string[]) {
  // TODO: Integrate with src/services/pdf-generator.ts
  console.log("Generating PDF for account:", accountId, "Transactions:", transactionIds || "All");
  // const htmlContent = generateHtmlForPdf(accountData, transactionIds);
  // const pdfDoc = await generatePdf(htmlContent);
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


  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/"); // Redirect if not logged in
    } else if (user && accountId) {
      // Simulate fetching account details and transactions
      setIsLoading(true);
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
       setTransactions(transactions.filter(t => t.id !== deleteTarget.id));
       toast({
         title: "Transaction Deleted",
         description: `Transaction ${deleteTarget.slipNumber} permanently removed.`,
         variant: "destructive",
       });
       // Simulate deleting linked transaction (if any)
       if (deleteTarget.code) {
         console.log(`Also need to delete corresponding transaction with slip ${deleteTarget.slipNumber} in account ${deleteTarget.code}`);
         // Find the linked account and remove the transaction with the same slipNumber
       }
     }
     setDeleteTarget(null); // Reset delete target
   };

  const handleGeneratePdf = async (type: 'whole' | 'specific', transaction?: Transaction) => {
     setIsPdfGenerating(true);
     try {
       const ids = type === 'specific' && transaction ? [transaction.id] : undefined;
       await generateAccountPdf(accountId, ids);
       toast({ title: "PDF Generated", description: `PDF for ${type === 'specific' && transaction ? `transaction ${transaction.slipNumber}` : 'the whole account'} is ready for download (Simulation).` });
       // In real implementation, trigger download here
     } catch (error) {
        console.error("PDF generation failed:", error);
        toast({ title: "PDF Error", description: "Could not generate PDF.", variant: "destructive" });
     } finally {
        setIsPdfGenerating(false);
     }
   };

   // Calculate current balance
   const currentBalance = transactions.reduce((bal, t) => {
     return bal + (t.credit || 0) - (t.debit || 0);
   }, 0);


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
                           {/* Option for specific line might require selecting rows, complex UI */}
                          {/* <DropdownMenuItem disabled>Specific Line (Select rows first)</DropdownMenuItem> */}
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
                     <TableRow key={t.id}>
                       <TableCell>{t.number}</TableCell>
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
                       <TableCell>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button aria-haspopup="true" size="icon" variant="ghost">
                               <MoreVertical className="h-4 w-4" />
                               <span className="sr-only">Toggle menu</span>
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => handleEditTransaction(t)}>
                               <Edit className="mr-2 h-4 w-4" /> Edit
                             </DropdownMenuItem>
                             <DropdownMenuItem
                                onSelect={(e) => { e.preventDefault(); handleDeleteTransaction(t); }}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                             </DropdownMenuItem>
                              <DropdownMenuSeparator />
                               <DropdownMenuItem onClick={() => handleGeneratePdf('specific', t)} disabled={isPdfGenerating}>
                                 <FileText className="mr-2 h-4 w-4" /> PDF this Line
                              </DropdownMenuItem>
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
               Showing <strong>{transactions.length}</strong> transactions.
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
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setEditTarget(null)}>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={confirmEditTransaction}>Yes, Edit</AlertDialogAction>
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
                This action cannot be undone. Permanently deleting transaction <strong>{deleteTarget?.slipNumber}</strong>.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={confirmSecondDelete} variant="destructive">Yes, Delete Permanently</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
