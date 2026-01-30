import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
    try {
        if (!adminAuth || !adminDb) {
            console.error("Firebase Admin services are null");
            throw new Error("Server Configuration Error: Firebase Admin not initialized");
        }

        const { uid } = await request.json();

        if (!uid) {
            return NextResponse.json(
                { error: "User UID is required" },
                { status: 400 }
            );
        }

        // Delete from Firebase Auth
        await adminAuth.deleteUser(uid);

        // Delete from Firestore
        await adminDb.collection("users").doc(uid).delete();

        return NextResponse.json({ success: true, uid });
    } catch (error: any) {
        console.error("Error deleting employee:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete employee" },
            { status: 500 }
        );
    }
}
