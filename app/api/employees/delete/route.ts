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

        // Try to delete from Firebase Auth (may not exist if created manually in Firestore)
        try {
            await adminAuth.deleteUser(uid);
            console.log(`Deleted user ${uid} from Firebase Auth`);
        } catch (authError: any) {
            // User might not exist in Auth, that's okay - continue with Firestore deletion
            console.warn(`Could not delete from Auth (user may not exist): ${authError.message}`);
        }

        // Delete from Firestore
        await adminDb.collection("users").doc(uid).delete();
        console.log(`Deleted user ${uid} from Firestore`);

        return NextResponse.json({ success: true, uid });
    } catch (error: any) {
        console.error("Error deleting employee:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete employee" },
            { status: 500 }
        );
    }
}
