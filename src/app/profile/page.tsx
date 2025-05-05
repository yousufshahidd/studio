"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { updatePassword } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";

const passwordFormSchema = z.object({
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ProfilePage() {
  const { user, loading: authLoading, auth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/"); // Redirect if not logged in
    }
  }, [user, authLoading, router]);

  async function onSubmitPassword(values: z.infer<typeof passwordFormSchema>) {
    if (!user || !auth) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(user, values.newPassword);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
      form.reset(); // Clear the form
    } catch (error: any) {
      console.error("Password update failed:", error);
      let errorMessage = "Failed to update password. Please try again.";
      // Firebase might require recent login for password change, handle re-authentication if needed
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log out and log back in before changing your password.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The new password is too weak.";
      }
      toast({
        title: "Update Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
            </CardContent>
             <CardFooter>
                <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
      </div>
    );
  }

  if (!user) return null; // Should be redirected

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 p-4">
      <main className="flex-1 md:gap-8">
        <Card className="w-full max-w-2xl mx-auto mt-6">
          <CardHeader>
            <div className="flex items-center gap-4 mb-2">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <CardTitle>User Profile</CardTitle>
            </div>
            <CardDescription>Manage your account settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Display User Info */}
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Account Information</h3>
                 <p className="text-sm text-muted-foreground">Email: {user.email}</p>
                 {/* Add more profile details here if stored (e.g., in Firestore) */}
            </div>

             {/* Change Password Form */}
            <div className="space-y-2">
                 <h3 className="text-lg font-medium">Change Password</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitPassword)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" {...field} type="password" disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" {...field} type="password" disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Password"}
                    </Button>
                  </form>
                </Form>
             </div>

            {/* TODO: Add other profile settings like 2FA management, etc. */}

          </CardContent>
           {/* <CardFooter>
              Optional footer content
           </CardFooter> */}
        </Card>
      </main>
    </div>
  );
}
