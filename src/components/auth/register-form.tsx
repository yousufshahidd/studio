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
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // path of error
});


export function RegisterForm() {
  const { signUp } = useAuth(); // Assuming signUp function exists in useAuth
  const { toast } = useToast();
  const router = useRouter();
   const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
     setIsLoading(true);
    try {
      await signUp(values.email, values.password);
      toast({
        title: "Registration Successful",
        description: "Your account has been created. Please login.",
      });
      // Optional: Redirect to login or directly to dashboard if auto-login after signup
      // For now, we assume user needs to login after registration
      // Consider switching the active tab to 'login' automatically here if using Tabs
       form.reset(); // Clear the form
       // Potentially switch tab focus or navigate
       // router.push('/'); // Or stay on page and switch tab
    } catch (error: any) {
      console.error("Registration failed:", error);
      let errorMessage = "Registration failed. Please try again.";
       if (error.code === 'auth/email-already-in-use') {
         errorMessage = "This email address is already registered.";
       } else if (error.code === 'auth/weak-password') {
         errorMessage = "The password is too weak.";
       }
      toast({
        title: "Registration Error",
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
                <Input placeholder="your.email@example.com" {...field} type="email" disabled={isLoading}/>
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
                <Input placeholder="••••••••" {...field} type="password" disabled={isLoading}/>
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
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input placeholder="••••••••" {...field} type="password" disabled={isLoading}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
           {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register"}
        </Button>
      </form>
    </Form>
  );
}
