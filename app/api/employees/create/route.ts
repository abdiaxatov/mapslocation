import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
    try {
        if (!adminAuth || !adminDb) {
            console.error("Firebase Admin services are null. Checks: apps.length=", admin.apps.length);
            throw new Error("Server Configuration Error: Firebase Admin not initialized. Please check server logs for 'Firebase Admin Initialization FAILED'.");
        }

        const { email, password, firstName, lastName, profession, role, phoneNumber } = await request.json();

        // Create user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
            phoneNumber: phoneNumber || undefined, // Only pass if provided
        });

        // Create user document in Firestore
        await adminDb.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            firstName,
            lastName,
            profession,
            role,
            phoneNumber: phoneNumber || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            locationEnabled: false,
        });

        return NextResponse.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
        console.error("Error creating employee:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create employee" },
            { status: 500 }
        );
    }
}
