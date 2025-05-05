"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  // Changed username to email for standard Firebase auth
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

// Initial Credentials (Store these securely, ideally not hardcoded)
const INITIAL_USERNAME = "Yousuf"; // Keep for initial logic if needed
const INITIAL_PASSWORD = "Yousuf Shahid";

export function LoginForm() {
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "", // Default to empty, user needs to enter their email
      password: "",
    },
  });

   React.useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
       // Check for initial default login (special case)
       // This requires careful handling. A better approach is to pre-create this user
       // in Firebase or guide the first user through a setup process.
       // Simulating the check here for demonstration:
       if (values.email === "yousuf@example.com" && values.password === INITIAL_PASSWORD) {
          // Note: Firebase doesn't have usernames, using a predefined email for the initial user
          // You would need to create this user in your Firebase console first.
          // Replace "yousuf@example.com" with the actual email for the 'Yousuf' user.
          await signIn(values.email, values.password);
          toast({
            title: "Login Successful",
            description: "Welcome back, Yousuf!",
          });
          router.push("/dashboard"); // Redirect after successful login
       } else {
         // Standard login for other users or if the initial user changed credentials
         await signIn(values.email, values.password);
         toast({
           title: "Login Successful",
           description: "Welcome back!",
         });
         router.push("/dashboard"); // Redirect after successful login
       }
    } catch (error: any) {
      console.error("Login failed:", error);
      // Provide more specific error messages if possible
      let errorMessage = "Login failed. Please check your credentials and try again.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/too-many-requests') {
         errorMessage = "Too many login attempts. Please try again later.";
      }
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your.email@example.com" {...field} type="email" disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="••••••••" {...field} type="password" disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
        </Button>
      </form>
    </Form>
  );
}
