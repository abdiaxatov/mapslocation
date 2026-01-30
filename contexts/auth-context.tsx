"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  type User
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  profession: string;
  role: "admin" | "employee";
  phoneNumber?: string;
  createdAt: Date;
  locationEnabled?: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createEmployee: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    profession: string;
    role: "admin" | "employee";
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserData(null);
  };

  const createEmployee = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    profession: string;
    role: "admin" | "employee";
  }) => {
    // Store current admin's credentials
    const currentUser = auth.currentUser;
    const currentUserData = userData;

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

    // Create user document in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      profession: data.profession,
      role: data.role,
      createdAt: serverTimestamp(),
      locationEnabled: false
    });

    // Sign out the newly created user and restore admin session
    await firebaseSignOut(auth);

    // Restore admin session state (user will need to refresh or we handle it)
    if (currentUser && currentUserData) {
      setUser(currentUser);
      setUserData(currentUserData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signIn, signOut, createEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
