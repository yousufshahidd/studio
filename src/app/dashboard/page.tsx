
// src/app/dashboard/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/client";
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
import { mockDb, getNextAccountId, updateAccountBalance } from "@/lib/mock-data"; // Import mock data and helpers
import { cn } from "@/lib/utils"; // Import cn for conditional classes

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
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

  const userId = user?.uid || "user1"; // Use actual UID if available, else default mock user

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/"); // Redirect to login if not authenticated
    } else if (user) {
      setIsLoadingAccounts(true);
      // Simulate fetching accounts from mock data
      setTimeout(() => {
        // Recalculate all balances on load (simple approach for mock data)
        const currentAccounts = mockDb[userId]?.accounts || [];
        currentAccounts.forEach(acc => updateAccountBalance(acc.id, userId));

        setAccounts([...(mockDb[userId]?.accounts || [])]); // Use spread to trigger re-render
        setIsLoadingAccounts(false);
      }, 500); // Shorter delay now
    }
  }, [user, loading, router, userId]);

  // --- Account Management Functions ---

  const openAddAccountDialog = () => {
    setNewAccountName(""); // Reset name field
    setIsAddAccountDialogOpen(true);
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      toast({ title: "Error", description: "Account name cannot be empty.", variant: "destructive" });
      return;
    }
     // Check for duplicate name (case-insensitive)
     if (accounts.some(acc => acc.name.toLowerCase() === newAccountName.trim().toLowerCase())) {
        toast({ title: "Error", description: "An account with this name already exists.", variant: "destructive" });
        return;
      }

    setIsSavingAccount(true);
    // Simulate adding account to mock data
    setTimeout(() => {
      const newAccount: Account = {
        id: getNextAccountId(),
        name: newAccountName.trim(),
        balance: 0, // Initial balance is 0
      };
      if (!mockDb[userId]) {
        mockDb[userId] = { accounts: [], transactions: [] };
      }
      mockDb[userId].accounts.push(newAccount);
      setAccounts([...mockDb[userId].accounts]); // Update state

      toast({
        title: "Account Added",
        description: `Account "${newAccount.name}" has been successfully added.`,
      });
      setIsSavingAccount(false);
      setIsAddAccountDialogOpen(false);
    }, 500); // Simulate save delay
  };

  const openEditAccountDialog = (account: Account, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click when clicking edit action
    setAccountToEdit(account);
    setEditAccountName(account.name); // Pre-fill current name
    setIsEditAccountDialogOpen(true);
  };

  const handleEditAccount = () => {
    if (!accountToEdit || !editAccountName.trim()) {
        toast({ title: "Error", description: "Account name cannot be empty.", variant: "destructive" });
        return;
    }
     // Check for duplicate name (excluding the account being edited)
     if (accounts.some(acc => acc.id !== accountToEdit.id && acc.name.toLowerCase() === editAccountName.trim().toLowerCase())) {
        toast({ title: "Error", description: "Another account with this name already exists.", variant: "destructive" });
        return;
      }

    setIsSavingAccount(true);
    // Simulate editing account in mock data
    setTimeout(() => {
      const accountIndex = mockDb[userId].accounts.findIndex(acc => acc.id === accountToEdit.id);
      if (accountIndex !== -1) {
         const updatedName = editAccountName.trim();
         const oldName = mockDb[userId].accounts[accountIndex].name; // Store old name before update

         // Update account name
         mockDb[userId].accounts[accountIndex].name = updatedName;

         // Update the 'code' (linked account name) in all transactions referencing this account
         mockDb[userId].transactions = mockDb[userId].transactions.map(t => {
           if (t.code === oldName) { // Use old name to find references
             return { ...t, code: updatedName };
           }
           return t;
         });

         setAccounts([...mockDb[userId].accounts]); // Update state

         toast({
           title: "Account Updated",
           description: `Account "${oldName}" has been renamed to "${updatedName}". References updated.`,
         });
      } else {
         toast({ title: "Error", description: "Account not found for editing.", variant: "destructive" });
      }

      setIsSavingAccount(false);
      setIsEditAccountDialogOpen(false);
      setAccountToEdit(null); // Clear editing state
    }, 500); // Simulate save delay
  };

 const promptDeleteAccount = (account: Account, event: React.MouseEvent) => {
     event.stopPropagation(); // Prevent row click when clicking delete action
     setAccountToDelete(account);
     // The AlertDialogTrigger handles opening the dialog
 };

  const handleDeleteAccount = () => {
    if (!accountToDelete) return;

    setIsLoadingAccounts(true); // Use loading state during deletion
    // Simulate deleting account and its transactions from mock data
    setTimeout(() => {
      const accountIdToDelete = accountToDelete.id;
      const accountName = accountToDelete.name;

      // Filter out the account
      mockDb[userId].accounts = mockDb[userId].accounts.filter(acc => acc.id !== accountIdToDelete);

      // Filter out transactions belonging to the deleted account
      // AND transactions linked TO the deleted account (via code)
      const transactionsToDelete = mockDb[userId].transactions.filter(t => t.accountId === accountIdToDelete || t.code === accountName);
      const slipsToDelete = transactionsToDelete.map(t => t.slipNumber);

      // Remove transactions belonging to the account OR linked TO the account OR sharing a slip number with affected transactions
      mockDb[userId].transactions = mockDb[userId].transactions.filter(t =>
          t.accountId !== accountIdToDelete && // Not in the deleted account
          t.code !== accountName && // Not linked TO the deleted account
          !slipsToDelete.includes(t.slipNumber) // Not part of the same double-entry
       );

      // Recalculate balances for *all remaining* accounts (simplest for mock data)
       mockDb[userId].accounts.forEach(acc => updateAccountBalance(acc.id, userId));

      setAccounts([...mockDb[userId].accounts]); // Update state

      toast({
        title: "Account Deleted",
        description: `Account "${accountName}" and its associated transactions have been removed.`,
        variant: "destructive",
      });
      setIsLoadingAccounts(false);
      setAccountToDelete(null); // Clear delete state
    }, 500); // Simulate delete delay
  };


  // --- Other Handlers ---

  const handleViewAccount = (accountId: string) => {
    router.push(`/account/${accountId}`);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ title: "Logout Failed", description: "Could not log you out. Please try again.", variant: "destructive" });
    }
  };

  // --- Render Logic ---

  if (loading || isLoadingAccounts) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-4xl mx-auto">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-2xl font-bold">Dashboard</CardTitle>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8 rounded-full" />
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

  if (!user) {
    return null; // Should be redirected by useEffect
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
         <h1 className="text-xl font-semibold">AccountBook Pro</h1>
         <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                   <span className="sr-only">User menu</span>
                   {/* Fallback for missing email */}
                   {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Logout <LogOut className="ml-2 h-4 w-4" /></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  <TableHead className="text-right">Current Balance ($)</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length > 0 ? (
                  accounts.map((account) => {
                    const balance = account.balance ?? 0;
                    const balanceType = balance >= 0 ? 'CR' : 'DR'; // Assuming positive is Credit
                    const displayBalance = Math.abs(balance);
                    return (
                      <TableRow
                        key={account.id}
                        onClick={() => handleViewAccount(account.id)} // Navigate on row click
                        className="cursor-pointer hover:bg-muted/80"
                        aria-label={`View account ${account.name}`}
                       >
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell className={cn("text-right font-mono", balanceType === 'DR' ? 'text-destructive' : '')}>
                            {/* Display calculated/stored balance */}
                            {`${displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balanceType}`}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default"> {/* Prevent row click on actions cell */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Toggle menu for {account.name}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => openEditAccountDialog(account, e)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Name
                              </DropdownMenuItem>
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <DropdownMenuItem
                                      onSelect={(e) => { e.preventDefault(); promptDeleteAccount(account, e); }}
                                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    >
                                     <Trash2 className="mr-2 h-4 w-4" /> Delete
                                   </DropdownMenuItem>
                                 </AlertDialogTrigger>
                                 {/* Delete Confirmation Dialog Content */}
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle className="flex items-center"><AlertCircle className="text-destructive mr-2 h-5 w-5" />Are you absolutely sure?</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       This action cannot be undone. This will permanently delete the account
                                       <strong> "{accountToDelete?.name}"</strong> and all its associated transactions, including linked entries in other accounts.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancel</AlertDialogCancel>
                                     <AlertDialogAction
                                        variant="destructive"
                                        onClick={handleDeleteAccount} // Call the actual delete handler
                                        disabled={isLoadingAccounts} // Disable while deleting
                                      >
                                       {isLoadingAccounts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, delete account"}
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
                    <TableCell colSpan={3} className="text-center h-24">
                      No accounts found. Add your first account!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
           <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>{accounts.length}</strong> account(s). Click row to view details.
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
              <DialogTitle>Edit Account Name</DialogTitle>
              <DialogDescription>
                Update the name for the account: <strong>{accountToEdit?.name}</strong>. Linked transaction references will be updated.
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
