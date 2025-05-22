
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

// This page is no longer functional as user authentication has been removed.
// It will redirect to the dashboard.

export default function ProfilePage() {
  const router = useRouter();

  React.useEffect(() => {
    // Redirect to dashboard as profile management is not applicable without users
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redirecting...</CardTitle>
          <CardDescription>
            User profiles are not available in this version. Redirecting you to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p>If you are not redirected automatically, please click the button below.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
