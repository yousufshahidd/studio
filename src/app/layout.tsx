import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { FirebaseProvider } from "@/lib/firebase/client"; // Import FirebaseProvider
import { Toaster } from "@/components/ui/toaster"; // Import Toaster for notifications
import { ThemeProvider } from "@/components/theme-provider"; // Import ThemeProvider for dark mode

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AccountBook Pro",
  description: "Advanced Accounting Application",
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCZ0tNDaSm2sZ2CTex2ICif-CPlCR1ZFYw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "accountbook-791ce.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "accountbook-791ce",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "accountbook-791ce.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "666529519931",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:666529519931:web:9af5f6e5696a1dbdf13f1e",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-32Q90RCRS1"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <FirebaseProvider config={firebaseConfig}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
             <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
            <Toaster />
          </ThemeProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
