
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
// import { useAuth } from "@/lib/firebase/client"; // Firebase removed
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, Eye, LogOut, MoreVertical, Loader2, AlertCircle } from "lucide-react";
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
  AlertDialogTrigger,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/theme-toggle";
import type { Account } from "@/types";
import { 
    getAccounts as getLocalAccounts, 
    addAccount as addLocalAccount,
    updateAccount as updateLocalAccount,
    deleteAccount as deleteLocalAccount,
    updateAccountBalance as updateLocalAccountBalance // Re-exporting for direct use if needed
} from "@/lib/local-data-manager"; 
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = React.useState(true);
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = React.useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = React.useState(false);
  const [accountToEdit, setAccountToEdit] = React.useState<Account | null>(null);
  const [newAccountName, setNewAccountName] = React.useState("");
  const [editAccountName, setEditAccountName] = React.useState("");
  const [isSavingAccount, setIsSavingAccount] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<Account | null>(null);

  const fetchAccountsData = React.useCallback(() => {
    setIsLoadingAccounts(true);
    try {
      // Simulate async for consistency, though localStorage is sync
      setTimeout(() => {
        const localAccounts = getLocalAccounts();
        // Balances should be managed by local-data-manager now
        setAccounts(localAccounts);
        setIsLoadingAccounts(false);
      }, 200); // Shorter delay
    } catch (error: any) {
      console.error("Dashboard: Error fetching accounts from localStorage:", error);
      toast({
        title: "Error Loading Accounts",
        description: "Could not load accounts data. Check console for details.",
        variant: "destructive",
      });
      setIsLoadingAccounts(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAccountsData();
  }, [fetchAccountsData]);

  const openAddAccountDialog = () => {
    setNewAccountName("");
    setIsAddAccountDialogOpen(true);
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      toast({ title: "Validation Error", description: "Account name cannot be empty.", variant: "destructive" });
      return;
    }
     if (accounts.some(acc => acc.name.toLowerCase() === newAccountName.trim().toLowerCase())) {
        toast({ title: "Duplicate Name", description: "An account with this name already exists.", variant: "destructive" });
        return;
      }

    setIsSavingAccount(true);
    setTimeout(() => {
      try {
        const newAccount = addLocalAccount(newAccountName.trim());
        fetchAccountsData(); // Refresh list
        toast({
          title: "Account Added",
          description: `Account "${newAccount.name}" has been successfully added.`,
        });
      } catch (error) {
         toast({ title: "Error", description: "Failed to add account.", variant: "destructive" });
      } finally {
        setIsSavingAccount(false);
        setIsAddAccountDialogOpen(false);
      }
    }, 300);
  };

  const openEditAccountDialog = (account: Account) => {
    setAccountToEdit(account);
    setEditAccountName(account.name);
    setIsEditAccountDialogOpen(true);
  };

  const handleEditAccount = () => {
    if (!accountToEdit || !editAccountName.trim()) {
        toast({ title: "Validation Error", description: "Account name cannot be empty.", variant: "destructive" });
        return;
    }
     if (accounts.some(acc => acc.id !== accountToEdit.id && acc.name.toLowerCase() === editAccountName.trim().toLowerCase())) {
        toast({ title: "Duplicate Name", description: "Another account with this name already exists.", variant: "destructive" });
        return;
      }

    setIsSavingAccount(true);
    setTimeout(() => {
      try {
        const updatedAccount = updateLocalAccount(accountToEdit.id, editAccountName.trim());
        if (updatedAccount) {
           fetchAccountsData(); // Refresh list
           toast({
             title: "Account Updated",
             description: `Account "${accountToEdit.name}" has been renamed to "${updatedAccount.name}". References updated.`,
           });
        } else {
            toast({ title: "Error", description: "Account not found for editing.", variant: "destructive" });
        }
      } catch (error) {
           toast({ title: "Error", description: "Failed to update account.", variant: "destructive" });
      } finally {
        setIsSavingAccount(false);
        setIsEditAccountDialogOpen(false);
        setAccountToEdit(null);
      }
    }, 300);
  };

 const promptDeleteAccount = (account: Account) => {
    setAccountToDelete(account);
  };

  const handleDeleteAccount = () => {
    if (!accountToDelete) return;

    setIsLoadingAccounts(true); 
    setTimeout(() => {
      try {
        const success = deleteLocalAccount(accountToDelete.id);
        if (success) {
          fetchAccountsData(); // Refresh list
          toast({
            title: "Account Deleted",
            description: `Account "${accountToDelete.name}" and its transactions have been removed.`,
            variant: "destructive", // Or default
          });
        } else {
            toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" });
        }
      } catch (error) {
         toast({ title: "Error", description: "An error occurred while deleting the account.", variant: "destructive" });
      } finally {
        setIsLoadingAccounts(false);
        setAccountToDelete(null);
      }
    }, 300);
  };

  const handleAccountClick = (accountId: string) => {
    router.push(`/account/${accountId}`);
  };

  // Logout functionality removed as there is no auth

  if (isLoadingAccounts) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-4xl mx-auto">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-2xl font-bold">Dashboard</CardTitle>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20" /> {/* Placeholder for theme toggle or other actions */}
              </div>
           </CardHeader>
           <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-10 w-32" />
              </div>
             <Skeleton className="h-64 w-full" />
           </CardContent>
         </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
         <h1 className="text-xl font-semibold">AccountBook Pro (Local)</h1>
         <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            {/* User menu removed */}
         </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card className="w-full max-w-6xl mx-auto mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Accounts Overview</CardTitle>
                <CardDescription>Manage your financial accounts.</CardDescription>
              </div>
              <Button onClick={openAddAccountDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right w-[200px]">Current Balance</TableHead>
                   <TableHead className="text-right w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length > 0 ? (
                  accounts.map((account) => {
                     const balance = account.balance ?? 0;
                     const balanceStatus = balance >= 0 ? "CR" : "DR";
                     const absBalance = Math.abs(balance);
                     return (
                        <TableRow
                            key={account.id}
                            onClick={() => handleAccountClick(account.id)}
                            className="cursor-pointer hover:bg-muted/80"
                            role="link"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAccountClick(account.id); }}
                        >
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell className="text-right font-mono">
                                ${absBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                             <TableCell
                                className={cn(
                                    "text-right font-semibold w-[80px]",
                                    balanceStatus === "CR" ? "text-status-cr" : "text-status-dr"
                                )}
                             >
                                 {balanceStatus}
                             </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        aria-haspopup="true"
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()} 
                                        aria-label={`Actions for ${account.name}`}
                                    >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAccountClick(account.id); }}>
                                    <Eye className="mr-2 h-4 w-4" /> View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditAccountDialog(account); }}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                            onSelect={(e) => { e.preventDefault(); e.stopPropagation(); promptDeleteAccount(account); }}
                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                        >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}> 
                                        <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center"><AlertCircle className="text-destructive mr-2 h-5 w-5" />Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the account
                                            <strong> "{accountToDelete?.name}"</strong> and all its associated transactions.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            variant="destructive"
                                            onClick={handleDeleteAccount}
                                            >
                                            Yes, delete account
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        );
                        })
                    ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                        No accounts found. Add your first account!
                        </TableCell>
                    </TableRow>
                    )}
              </TableBody>
            </Table>
          </CardContent>
           <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>{accounts.length}</strong> accounts.
            </div>
          </CardFooter>
        </Card>
      </main>

       {/* Add Account Dialog */}
       <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Enter the name for the new financial account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-account-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="add-account-name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Savings Account"
                  disabled={isSavingAccount}
                />
              </div>
            </div>
            <DialogFooter>
               <DialogClose asChild>
                   <Button type="button" variant="outline" disabled={isSavingAccount}>Cancel</Button>
               </DialogClose>
              <Button type="button" onClick={handleAddAccount} disabled={isSavingAccount || !newAccountName.trim()}>
                 {isSavingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
       </Dialog>

       {/* Edit Account Dialog */}
        <Dialog open={isEditAccountDialogOpen} onOpenChange={(open) => { if(!isSavingAccount) { setIsEditAccountDialogOpen(open); if(!open) setAccountToEdit(null); } }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>
                Update the name for the account: <strong>{accountToEdit?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-account-name" className="text-right">
                  New Name
                </Label>
                <Input
                  id="edit-account-name"
                  value={editAccountName}
                  onChange={(e) => setEditAccountName(e.target.value)}
                  className="col-span-3"
                  disabled={isSavingAccount}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSavingAccount}>Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleEditAccount} disabled={isSavingAccount || !editAccountName.trim() || editAccountName.trim() === accountToEdit?.name}>
                 {isSavingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
       </Dialog>
    </div>
  );
}
