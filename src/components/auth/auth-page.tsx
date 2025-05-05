"use client";

import { useState } from "react";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form"; // Assuming you will create this
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpenCheck } from "lucide-react"; // Icon for branding

export function AuthPage() {
  const [showRegister, setShowRegister] = useState(false);

  // For simplicity, we'll use Tabs to switch between Login and Register
  // In a real app, you might use routing or conditional rendering based on state

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
       <Card className="w-full max-w-md">
         <CardHeader className="text-center">
           <div className="mb-4 inline-flex justify-center">
            <BookOpenCheck className="h-10 w-10 text-primary" />
           </div>
           <CardTitle className="text-2xl font-bold">AccountBook Pro</CardTitle>
           <CardDescription>
             Welcome back! Please login or register to continue.
           </CardDescription>
         </CardHeader>
         <CardContent>
           <Tabs defaultValue="login" className="w-full">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="login">Login</TabsTrigger>
               {/* Registration might not be needed based on the prompt focusing on initial user, but adding for completeness */}
               <TabsTrigger value="register">Register</TabsTrigger>
             </TabsList>
             <TabsContent value="login">
                <LoginForm />
             </TabsContent>
             <TabsContent value="register">
               {/* You would place your RegisterForm component here */}
               <RegisterForm />
               {/* Placeholder if RegisterForm is not yet created */}
               {/* <p className="text-center text-sm text-muted-foreground pt-4">Registration feature coming soon.</p> */}
             </TabsContent>
           </Tabs>
         </CardContent>
       </Card>
     </div>
  );
}
