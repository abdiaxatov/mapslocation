import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const serviceAccount = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Handle both quoted and unquoted keys, and standard \n escapes
            privateKey: process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
                : undefined,
        };

        if (serviceAccount.privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            console.warn("FIREBASE_PRIVATE_KEY is missing, skipping admin init");
        }
    } catch (error) {
        console.error("Firebase Admin Init Error:", error);
    }
}

// Export safely - check if app exists before getting services
// This prevents build-time crashes if init failed
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
