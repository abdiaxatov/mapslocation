import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        if (!adminAuth || !adminDb) {
            throw new Error("Firebase Admin not initialized");
        }

        const { email, password, firstName, lastName, profession, role } = await request.json();

        // Create user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
        });

        // Create user document in Firestore
        await adminDb.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            firstName,
            lastName,
            profession,
            role,
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
