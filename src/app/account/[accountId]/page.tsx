
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
// import { useAuth } from "@/lib/firebase/client"; // Firebase removed
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Edit, Trash2, FileText, MoreVertical, Loader2, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
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
import type { DocumentContent } from "@/services/pdf-generator";
import {
    getAccountById as getLocalAccountById,
    getAccounts as getLocalAccounts,
    calculateRunningBalance as calculateLocalRunningBalance,
    addTransaction as addLocalTransaction,
    editTransaction as editLocalTransaction,
    deleteTransaction as deleteLocalTransaction,
    slipNumberExists as localSlipNumberExists,
    updateAccountBalance as updateLocalAccountBalance, // if needed directly
} from "@/lib/local-data-manager";
import { format } from "date-fns";

async function prepareAccountHtmlForDownload(accountName: string, transactions: TransactionWithBalance[]): Promise<DocumentContent> {
  const finalBalanceEntry = transactions.length > 0 ? transactions[transactions.length - 1] : null;
  const finalBalanceValue = finalBalanceEntry?.balance ?? 0;
  const finalBalanceStatus = finalBalanceValue >= 0 ? "CR" : "DR";
  const absFinalBalance = Math.abs(finalBalanceValue);

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
        td.number, th.number { text-align: right; }
        td.currency, th.currency { text-align: right; font-family: monospace; }
        td.balance-status { font-weight: bold; padding-left: 4px; }
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
            <th class="number">No.</th>
            <th>Date</th>
            <th>Description</th>
            <th>Slip No.</th>
            <th class="currency">Debit</th>
            <th class="currency">Credit</th>
            <th class="currency">Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => {
            const balanceStatus = t.balance >= 0 ? "CR" : "DR";
            const absBalance = Math.abs(t.balance);
            return `
            <tr>
              <td class="number">${t.number}</td>
              <td>${new Date(t.date).toLocaleDateString()}</td>
              <td>${t.description}</td>
              <td>${t.slipNumber}</td>
              <td class="currency">${t.debit ? `$${t.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
              <td class="currency">${t.credit ? `$${t.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
              <td class="currency">$${absBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="balance-status">${balanceStatus}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
      ${transactions.length > 0 ? `
      <p class="balance-summary">Final Balance: $${absFinalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${finalBalanceStatus}</p>
      ` : '<p>No transactions to display.</p>'}
    </body>
    </html>
  `;
  try {
    const docDetails = await generatePdf(htmlContent);
    return docDetails;
  } catch (error) {
    console.error("Error preparing HTML document via service:", error);
    throw new Error("Failed to prepare HTML document.");
  }
}


export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [account, setAccount] = React.useState<Account | null>(null);
  const [transactionsWithBalance, setTransactionsWithBalance] = React.useState<TransactionWithBalance[]>([]);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isStatementGenerating, setIsStatementGenerating] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TransactionWithBalance | null>(null);
  const [showFirstDeleteConfirm, setShowFirstDeleteConfirm] = React.useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Transaction | null>(null);
  const [showEditConfirm, setShowEditConfirm] = React.useState(false);
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = React.useState(false);
  const [isEditTransactionDialogOpen, setIsEditTransactionDialogOpen] = React.useState(false);
  const [isSavingTransaction, setIsSavingTransaction] = React.useState(false);
  const [isPartialStatementDialogOpen, setIsPartialStatementDialogOpen] = React.useState(false);
  const [partialStatementTransactionNumber, setPartialStatementTransactionNumber] = React.useState<string>("");

   const [transactionDate, setTransactionDate] = React.useState<Date | undefined>(new Date());
   const [transactionDesc, setTransactionDesc] = React.useState("");
   const [transactionSlip, setTransactionSlip] = React.useState("");
   const [transactionAmount, setTransactionAmount] = React.useState<number | string>("");
   const [transactionType, setTransactionType] = React.useState<"debit" | "credit">("debit");
   const [linkedAccountId, setLinkedAccountId] = React.useState<string>("");

  const loadAccountData = React.useCallback(() => {
    if (!accountId) {
       toast({ title: "Error", description: "Account ID not available.", variant: "destructive" });
       router.push("/dashboard");
       return;
    }
     setIsLoading(true);
     setTimeout(() => { // Simulate async
       try {
        const currentAccountData = getLocalAccountById(accountId);
        if (currentAccountData) {
          setAccount(currentAccountData);
          const allLocalAccounts = getLocalAccounts();
          setAllAccounts(allLocalAccounts.filter(acc => acc.id !== accountId));

          const { transactions, finalBalance } = calculateLocalRunningBalance(accountId);
          setTransactionsWithBalance(transactions);
          setAccount(prev => prev ? { ...prev, balance: finalBalance } : null);
        } else {
          toast({ title: "Error", description: "Account not found.", variant: "destructive" });
          router.push("/dashboard");
        }
       } catch (error) {
         console.error("Error loading account data from localStorage:", error);
         toast({ title: "Error", description: "Could not load account data.", variant: "destructive" });
         router.push("/dashboard");
       }
       setIsLoading(false);
     }, 300);
  }, [accountId, router, toast]);

  React.useEffect(() => {
    if (accountId) {
        loadAccountData();
    }
  }, [accountId, loadAccountData]);


  const openAddTransactionDialog = () => {
      setTransactionDate(new Date());
      setTransactionDesc("");
      setTransactionSlip("");
      setTransactionAmount("");
      setTransactionType("debit");
      setLinkedAccountId("");
      setIsAddTransactionDialogOpen(true);
  };

 const handleAddTransaction = () => {
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
      const slipCheck = localSlipNumberExists(slip);
      if (slipCheck.exists) {
         toast({
             title: "Duplicate Slip Error",
             description: `Slip number "${slip}" already exists in transaction (No. ${slipCheck.conflictingTransaction?.number}) of account "${slipCheck.conflictingAccountName}". Please use a unique one.`,
             variant: "destructive",
             duration: 7000 
         });
         return;
     }
      const linkedAccExists = allAccounts.some(acc => acc.id === linkedAccountId);
      if (!linkedAccExists) {
           toast({ title: "Validation Error", description: "Selected linked account is invalid.", variant: "destructive" });
           return;
      }

     setIsSavingTransaction(true);
     setTimeout(() => {
       try {
         const details = {
           date: transactionDate.toISOString().split('T')[0],
           description: transactionDesc.trim(),
           slipNumber: slip,
           type: transactionType,
           amount: amount,
         };
         const result = addLocalTransaction(accountId!, linkedAccountId, details);
         if (result) {
           loadAccountData();
           toast({
               title: "Transaction Added",
               description: `Transaction ${slip} recorded.`,
           });
         } else {
            toast({ title: "Error", description: "Failed to add transaction. Accounts might be invalid.", variant: "destructive" });
         }
       } catch (error) {
            toast({ title: "Error", description: "An error occurred while adding transaction.", variant: "destructive" });
       } finally {
         setIsSavingTransaction(false);
         setIsAddTransactionDialogOpen(false);
       }
     }, 500);
 };


  const handleEditTransaction = (transaction: Transaction) => {
    const linkedAcc = allAccounts.find(acc => acc.name === transaction?.code);
    const isLinkedToSelf = account?.name === transaction?.code;

    if (!linkedAcc && !isLinkedToSelf) {
        toast({ title: "Error", description: `Cannot edit: Linked account "${transaction?.code}" not found or is inactive.`, variant: "destructive" });
        return;
    }
    setEditTarget(transaction);
    setShowEditConfirm(true);
  };

  const confirmEditIntent = () => {
     setShowEditConfirm(false);
     if (editTarget) {
         setTransactionDate(new Date(editTarget.date));
         setTransactionDesc(editTarget.description);
         setTransactionSlip(editTarget.slipNumber);
         const amountValue = editTarget.debit ?? editTarget.credit ?? 0;
         setTransactionAmount(amountValue);
         setTransactionType(editTarget.debit ? "debit" : "credit");
          const linkedAcc = allAccounts.find(acc => acc.name === editTarget?.code);
          setLinkedAccountId(linkedAcc?.id || "");
         setIsEditTransactionDialogOpen(true);
     }
  };

   const handleSaveEditedTransaction = () => {
      if (!editTarget) {
            toast({ title: "Error", description: "No transaction selected for editing.", variant: "destructive" });
            return;
      }
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
      if (slip !== editTarget.slipNumber) {
          const slipCheck = localSlipNumberExists(slip);
          if (slipCheck.exists) {
              toast({
                  title: "Duplicate Slip Error",
                  description: `Slip number "${slip}" already exists in transaction (No. ${slipCheck.conflictingTransaction?.number}) of account "${slipCheck.conflictingAccountName}". Please use a unique one.`,
                  variant: "destructive",
                  duration: 7000
              });
              return;
          }
      }
      const linkedAccExists = allAccounts.some(acc => acc.id === linkedAccountId);
      if (!linkedAccExists) {
         toast({ title: "Validation Error", description: "Selected linked account is invalid.", variant: "destructive" });
         return;
      }

      setIsSavingTransaction(true);
      setTimeout(() => {
        try {
            const details = {
                date: transactionDate.toISOString().split('T')[0],
                description: transactionDesc.trim(),
                slipNumber: slip, // new slip from form
                type: transactionType,
                amount: amount,
            };
            const success = editLocalTransaction(
                editTarget.slipNumber, // original slip number
                accountId!,
                editTarget.code!, // old linked account name
                linkedAccountId, // new linked account ID from form
                details
            );

            if (success) {
                loadAccountData();
                toast({
                    title: "Transaction Updated",
                    description: `Transaction ${slip} updated.`,
                });
            } else {
                toast({ title: "Error", description: "Failed to update transaction. Original transaction or accounts might not be found.", variant: "destructive" });
            }
        } catch(error) {
            toast({ title: "Error", description: "An error occurred while saving transaction.", variant: "destructive" });
        } finally {
            setIsSavingTransaction(false);
            setIsEditTransactionDialogOpen(false);
            setEditTarget(null);
        }
      }, 500);
   };


  const handleDeleteTransaction = (transaction: TransactionWithBalance) => {
     const linkedAccount = allAccounts.find(acc => acc.name === transaction.code);
     if (!linkedAccount && account?.name !== transaction.code) { 
          toast({ title: "Deletion Error", description: `Cannot delete: Linked account "${transaction.code}" not found or is inactive. Resolve linked account issue first.`, variant: "destructive" });
          return;
     }
    setDeleteTarget(transaction);
    setShowFirstDeleteConfirm(true);
  };

  const confirmFirstDelete = () => {
    setShowFirstDeleteConfirm(false);
    setShowSecondDeleteConfirm(true);
  };

   const confirmSecondDelete = () => {
     setShowSecondDeleteConfirm(false);
     if (deleteTarget) {
        setIsLoading(true); // Use main loading state or a specific one for delete
       setTimeout(() => {
         try {
            const success = deleteLocalTransaction(deleteTarget.slipNumber);
            if (success) {
                loadAccountData();
                toast({
                  title: "Transaction Deleted",
                  description: `Transaction ${deleteTarget.slipNumber} and its linked entry removed. Balances updated.`,
                });
            } else {
                toast({ title: "Deletion Error", description: `Could not delete transaction ${deleteTarget.slipNumber}.`, variant: "destructive" });
            }
         } catch(error) {
            toast({ title: "Deletion Error", description: "An error occurred while deleting.", variant: "destructive" });
         } finally {
            setIsLoading(false);
            setDeleteTarget(null);
         }
      }, 500);
     } else {
         setDeleteTarget(null);
     }
   };

  const handleGenerateStatement = async (type: 'whole' | 'upto') => {
     if (!account) {
          toast({ title: "Error", description: "Account data not loaded.", variant: "destructive" });
          return;
     }
     if (transactionsWithBalance.length === 0 && type === 'whole') {
         toast({ title: "Info", description: "No transactions in this account to generate a statement.", variant: "default" });
         return;
     }
     if (type === 'upto') {
       setPartialStatementTransactionNumber("");
       setIsPartialStatementDialogOpen(true);
       return;
     }

     setIsStatementGenerating(true);
     let transactionsToInclude: TransactionWithBalance[] = [];
     let toastMessage = "";
     let filename = `Account_Statement_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

     try {
       if (type === 'whole') {
         transactionsToInclude = transactionsWithBalance;
         toastMessage = `Generating HTML statement for the whole account '${account.name}'...`;
         filename = `Account_Statement_${account.name.replace(/\s+/g, '_')}_Whole_${new Date().toISOString().split('T')[0]}`;
       }
        if (transactionsToInclude.length === 0 && type === 'whole') {
            throw new Error("No transactions available to include in the statement.");
        }
       toast({ title: "Processing...", description: toastMessage });
       const docDetails = await prepareAccountHtmlForDownload(account.name, transactionsToInclude);
       downloadPdf(docDetails.content, filename, docDetails.mimeType);
       toast({ title: "Statement Ready", description: `HTML Statement '${filename}${docDetails.fileExtension}' generated and download started.` });
     } catch (error: any) {
        console.error("HTML Statement generation/download failed:", error);
        toast({ title: "Statement Error", description: error.message || "Could not generate or download statement.", variant: "destructive" });
     } finally {
        setIsStatementGenerating(false);
     }
   };

   const handleGeneratePartialStatement = async () => {
     if (!account) return;
     setIsPartialStatementDialogOpen(false);

     const targetNumberStr = partialStatementTransactionNumber.trim();
     if (!targetNumberStr) {
         toast({ title: "Input Required", description: "Please enter a transaction number.", variant: "destructive" });
         return;
     }
     const targetNumber = parseInt(targetNumberStr, 10);
     if (isNaN(targetNumber) || targetNumber <= 0) {
          toast({ title: "Invalid Input", description: "Please enter a valid positive transaction number.", variant: "destructive" });
          return;
     }
     const targetIndex = transactionsWithBalance.findIndex(t => t.number === targetNumber);
     if (targetIndex === -1) {
         toast({ title: "Not Found", description: `Transaction number ${targetNumber} not found in this account.`, variant: "destructive" });
         return;
     }

     setIsStatementGenerating(true);
     let transactionsToInclude: TransactionWithBalance[] = [];
     let toastMessage = "";
     let filename = "";

     try {
       transactionsToInclude = transactionsWithBalance.slice(0, targetIndex + 1);
       if (transactionsToInclude.length === 0) {
         throw new Error("No transactions found up to the specified number.");
       }
       const targetSlip = transactionsWithBalance[targetIndex].slipNumber;
       toastMessage = `Generating HTML statement for '${account.name}' up to transaction number ${targetNumber} (Slip: ${targetSlip})...`;
       filename = `Account_Statement_${account.name.replace(/\s+/g, '_')}_Upto_No${targetNumber}_${new Date().toISOString().split('T')[0]}`;

       toast({ title: "Processing...", description: toastMessage });
       const docDetails = await prepareAccountHtmlForDownload(account.name, transactionsToInclude);
       downloadPdf(docDetails.content, filename, docDetails.mimeType);
       toast({ title: "Statement Ready", description: `HTML Statement '${filename}${docDetails.fileExtension}' generated and download started.` });
     } catch (error: any) {
       console.error("Partial HTML Statement generation/download failed:", error);
       toast({ title: "Statement Error", description: error.message || "Could not generate or download partial statement.", variant: "destructive" });
     } finally {
       setIsStatementGenerating(false);
     }
   };

   const currentBalance = account?.balance ?? 0;
   const balanceStatus = currentBalance >= 0 ? "CR" : "DR";
   const absCurrentBalance = Math.abs(currentBalance);

    if (isLoading) { // Covers initial load
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
                                 <TableHead className="w-[70px]"><Skeleton className="h-4 w-10" /></TableHead>
                                 <TableHead className="w-[150px]"><Skeleton className="h-4 w-28" /></TableHead>
                                 <TableHead className="w-[80px]"><Skeleton className="h-4 w-12" /></TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {[...Array(5)].map((_, i) => (
                                 <TableRow key={i}>
                                     <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                     <TableCell><Skeleton className="h-8 w-8" /></TableCell>
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

      if (!account) {
          return (
              <div className="flex min-h-screen items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                      <CardHeader>
                          <CardTitle>Error</CardTitle>
                          <CardDescription>Account not found. It might have been deleted or an error occurred.</CardDescription>
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
                 <Badge variant={balanceStatus === "CR" ? "secondary" : "destructive"} className="ml-2 font-mono text-sm">
                      {`$${absCurrentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balanceStatus}`}
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
                         <Button variant="outline" disabled={isStatementGenerating}>
                           {isStatementGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                           Create Statement
                          </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent>
                          <DropdownMenuItem
                              onClick={() => handleGenerateStatement('whole')}
                              disabled={isStatementGenerating || transactionsWithBalance.length === 0}
                              title={transactionsWithBalance.length === 0 ? "No transactions to export" : "Export all transactions"}>
                             Whole Account
                          </DropdownMenuItem>
                          <DropdownMenuItem
                              onSelect={(e) => { e.preventDefault(); handleGenerateStatement('upto'); }}
                              disabled={isStatementGenerating || transactionsWithBalance.length === 0}
                              title={transactionsWithBalance.length === 0 ? "No transactions to export" : "Generate up to a specific transaction number"}>
                             Up to Transaction No...
                          </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                 </div>
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
                   <TableHead className="w-[70px]">Status</TableHead>
                   <TableHead className="w-[150px]">Code (Linked)</TableHead>
                   <TableHead className="w-[80px] text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {transactionsWithBalance.length > 0 ? (
                   transactionsWithBalance.map((t) => {
                     const rowBalanceStatus = t.balance >= 0 ? "CR" : "DR";
                     const rowAbsBalance = Math.abs(t.balance);
                     return (
                       <TableRow key={t.id} className={cn("hover:bg-muted/80")}>
                         <TableCell>{t.number}</TableCell>
                         <TableCell>{new Date(t.date + 'T00:00:00').toLocaleDateString()}</TableCell>
                         <TableCell className="max-w-[250px] truncate" title={t.description}>{t.description}</TableCell>
                         <TableCell>{t.slipNumber}</TableCell>
                         <TableCell className="text-right font-mono">
                           {t.debit ? `$${t.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                         </TableCell>
                         <TableCell className="text-right font-mono">
                            {t.credit ? `$${t.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                         </TableCell>
                         <TableCell className="text-right font-mono">
                            {`$${rowAbsBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                         </TableCell>
                         <TableCell
                            className={cn(
                                "font-semibold",
                                rowBalanceStatus === "CR" ? "text-status-cr" : "text-status-dr"
                            )}
                         >
                             {rowBalanceStatus}
                         </TableCell>
                         <TableCell className="max-w-[150px] truncate" title={t.code}>{t.code || "-"}</TableCell>
                         <TableCell className="text-right">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button aria-haspopup="true" size="icon" variant="ghost" aria-label={`Actions for transaction ${t.slipNumber}`}>
                                 <MoreVertical className="h-4 w-4" />
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
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </TableCell>
                       </TableRow>
                     );
                   })
                 ) : (
                   <TableRow>
                     <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                       No transactions found for this account.
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </CardContent>
           <CardFooter>
             <div className="text-xs text-muted-foreground">
               Showing <strong>{transactionsWithBalance.length}</strong> transaction(s).
             </div>
           </CardFooter>
         </Card>
       </main>

        <Dialog open={isPartialStatementDialogOpen} onOpenChange={setIsPartialStatementDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Generate Statement Up To Transaction</DialogTitle>
                    <DialogDescription>
                        Enter the transaction number (No.) up to which you want to include entries in the HTML statement.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="partial-statement-number" className="text-right">
                            Trans. No.
                        </Label>
                        <Input
                            id="partial-statement-number"
                            type="number"
                            value={partialStatementTransactionNumber}
                            onChange={(e) => setPartialStatementTransactionNumber(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., 5"
                            min="1"
                            step="1"
                            disabled={isStatementGenerating}
                            required
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isStatementGenerating}>Cancel</Button>
                    </DialogClose>
                    <Button
                       type="button"
                       onClick={handleGeneratePartialStatement}
                       disabled={isStatementGenerating || !partialStatementTransactionNumber.trim()}
                    >
                       {isStatementGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Statement"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

       <Dialog open={isAddTransactionDialogOpen} onOpenChange={(open) => { if(!isSavingTransaction) setIsAddTransactionDialogOpen(open);}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Transaction to {account?.name}</DialogTitle>
              <DialogDescription>
                Enter details for the new transaction. A corresponding entry will be created in the linked account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="date" className="text-right">Date</Label>
                      <Popover>
                         <PopoverTrigger asChild>
                             <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                     "w-full justify-start text-left font-normal col-span-3",
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
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="amount" className="text-right">Amount</Label>
                      <Input
                          id="amount"
                          type="number"
                          value={transactionAmount}
                          onChange={(e) => setTransactionAmount(e.target.value)}
                          className="col-span-2"
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

        <Dialog open={isEditTransactionDialogOpen} onOpenChange={(open) => { if(!isSavingTransaction) { setIsEditTransactionDialogOpen(open); if (!open) setEditTarget(null); }}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Transaction (Slip: {editTarget?.slipNumber})</DialogTitle>
              <DialogDescription>
                Modify the details for this transaction. Changes will impact linked accounts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="edit-date" className="text-right">Date</Label>
                      <Popover>
                         <PopoverTrigger asChild>
                             <Button
                                id="edit-date"
                                variant={"outline"}
                                className={cn(
                                     "w-full justify-start text-left font-normal col-span-3",
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
                              {allAccounts.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                              ))}
                               {editTarget && !allAccounts.some(a => a.id === allAccounts.find(acc => acc.name === editTarget.code)?.id) && editTarget.code &&
                                  <SelectItem value={editTarget.accountId} disabled>
                                      {editTarget.code} (Original - Inactive/Deleted?)
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
                      ( editTarget &&
                          transactionDate.toISOString().split('T')[0] === editTarget.date &&
                          transactionDesc.trim() === editTarget.description &&
                          transactionSlip.trim() === editTarget.slipNumber &&
                          parseFloat(transactionAmount.toString()) === (editTarget.debit ?? editTarget.credit ?? 0) &&
                          transactionType === (editTarget.debit ? "debit" : "credit") &&
                          linkedAccountId === allAccounts.find(a=>a.name === editTarget?.code)?.id
                      )
                 }
               >
                 {isSavingTransaction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
             <AlertDialogAction onClick={confirmFirstDelete} variant="destructive">Continue</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

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
              <Button onClick={confirmSecondDelete} variant="destructive" disabled={isLoading}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Delete Transaction"}
              </Button>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
