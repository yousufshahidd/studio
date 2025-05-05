"use client";

import type { FirebaseApp } from "firebase/app";
import { initializeApp, getApps } from "firebase/app";
import type { Auth } from "firebase/auth";
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import type { User } from "firebase/auth";
import * as React from "react";

interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  user: User | null;
  loading: boolean;
  signIn: typeof signInWithEmailAndPassword;
  signUp: typeof createUserWithEmailAndPassword;
  signOut: () => Promise<void>;
}

const FirebaseContext = React.createContext<FirebaseContextValue | null>(null);

interface FirebaseProviderProps {
  children: React.ReactNode;
  config: Record<string, string>;
}

export function FirebaseProvider({ children, config }: FirebaseProviderProps) {
  const [app, setApp] = React.useState<FirebaseApp | null>(null);
  const [auth, setAuth] = React.useState<Auth | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined" && !getApps().length) {
      try {
        const firebaseApp = initializeApp(config);
        const firebaseAuth = getAuth(firebaseApp);
        setApp(firebaseApp);
        setAuth(firebaseAuth);

        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          setUser(user);
          setLoading(false);
        }, (error) => {
           console.error("Auth state change error:", error);
           setUser(null); // Ensure user is null on error
           setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error("Firebase initialization error:", error);
        setLoading(false); // Stop loading even if initialization fails
      }
    } else if (getApps().length) {
       // Handle case where app is already initialized (e.g., HMR)
       const existingApp = getApps()[0];
       const existingAuth = getAuth(existingApp);
       setApp(existingApp);
       setAuth(existingAuth);
       // Check current user status immediately if auth exists
       if (existingAuth.currentUser) {
         setUser(existingAuth.currentUser);
       }
       setLoading(false); // Assume loading finished if app already exists

        const unsubscribe = onAuthStateChanged(existingAuth, (user) => {
          setUser(user);
          setLoading(false); // Ensure loading state is updated
        }, (error) => {
           console.error("Auth state change error:", error);
           setUser(null);
           setLoading(false);
        });
        return () => unsubscribe();
    }
  }, [config]); // Re-run effect if config changes

  const signOut = async () => {
    if (auth) {
      try {
        await firebaseSignOut(auth);
        // State update will happen via onAuthStateChanged
      } catch (error) {
        console.error("Sign out error:", error);
        // Handle sign-out errors appropriately (e.g., show a toast)
        throw error; // Re-throw error for component-level handling
      }
    } else {
        console.warn("Auth not initialized, cannot sign out.");
        throw new Error("Auth not initialized");
    }
  };

  const contextValue = React.useMemo(() => ({
    app,
    auth,
    user,
    loading,
    signIn: (email: string, pass: string) => {
      if (!auth) throw new Error("Auth not initialized");
      return signInWithEmailAndPassword(auth, email, pass);
    },
    signUp: (email: string, pass: string) => {
       if (!auth) throw new Error("Auth not initialized");
       return createUserWithEmailAndPassword(auth, email, pass);
    },
    signOut,
  }), [app, auth, user, loading, signOut]);


  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}

// Custom hook to use the Firebase context
export const useAuth = () => {
  const context = React.useContext(FirebaseContext);
  if (context === null) {
    throw new Error("useAuth must be used within a FirebaseProvider");
  }
  return context;
};
