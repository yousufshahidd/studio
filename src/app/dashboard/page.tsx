"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, Eye, LogOut, MoreVertical } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/theme-toggle"; // Import ThemeToggle

// Mock data for accounts - replace with actual data fetching
interface Account {
  id: string;
  name: string;
  balance: number;
}

const initialAccounts: Account[] = [
  { id: "1", name: "Cash", balance: 1500.75 },
  { id: "2", name: "Accounts Receivable", balance: 5200.00 },
  { id: "3", name: "Office Supplies", balance: 350.20 },
];

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = React.useState(true);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/"); // Redirect to login if not authenticated
    } else if (user) {
      // Simulate fetching accounts
      setTimeout(() => {
        setAccounts(initialAccounts);
        setIsLoadingAccounts(false);
      }, 1500); // Simulate network delay
    }
  }, [user, loading, router]);

  const handleAddAccount = () => {
    // TODO: Implement Add Account functionality (e.g., open a modal or navigate to a new page)
    toast({
      title: "Feature Coming Soon",
      description: "Adding new accounts will be available shortly.",
    });
  };

  const handleViewAccount = (accountId: string) => {
    router.push(`/account/${accountId}`);
  };

  const handleEditAccount = (accountId: string) => {
    // TODO: Implement Edit Account functionality
    toast({
      title: "Feature Coming Soon",
      description: `Editing account ${accountId} will be available shortly.`,
    });
  };

  const handleDeleteAccount = (accountId: string) => {
    // TODO: Implement Delete Account functionality with confirmation
    // This is a placeholder implementation
    setAccounts(accounts.filter(acc => acc.id !== accountId));
    toast({
      title: "Account Deleted",
      description: `Account ${accountId} has been successfully deleted.`,
      variant: "destructive",
    });
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
    return null; // Or a loading indicator, although useEffect should redirect
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
                   {/* Placeholder for user avatar or initial */}
                   <span className="sr-only">User menu</span>
                   {user.email?.charAt(0).toUpperCase() || 'U'}
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
              <Button onClick={handleAddAccount}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length > 0 ? (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="text-right">
                        ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewAccount(account.id)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditAccount(account.id)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                             <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the account
                                    and all its associated transactions.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                     variant="destructive"
                                     onClick={() => handleDeleteAccount(account.id)}
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
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
    </div>
  );
}
