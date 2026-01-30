import * as admin from 'firebase-admin';

// Helper to safely parse private key
// Helper to safely parse private key
const getPrivateKey = (key: string | undefined) => {
    if (!key) return undefined;

    // 1. Remove surrounding quotes if any
    let cleanKey = key;
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
        cleanKey = cleanKey.slice(1, -1);
    }

    // 2. Normalize standard tags
    const beginTag = "-----BEGIN PRIVATE KEY-----";
    const endTag = "-----END PRIVATE KEY-----";

    const beginIdx = cleanKey.indexOf(beginTag);
    const endIdx = cleanKey.indexOf(endTag);

    if (beginIdx === -1 || endIdx === -1) {
        // Fallback
        return cleanKey.replace(/\\n/g, '\n').trim();
    }

    // 3. Extract the body
    let body = cleanKey.substring(beginIdx + beginTag.length, endIdx);

    // 4. Sanitize body: remove literal \n, real newlines, and spaces
    body = body.replace(/\\n/g, '').replace(/\s+/g, '');

    // 5. Reconstruct standard PEM format
    return `${beginTag}\n${body}\n${endTag}`;
};

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: getPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
            }),
        });
    } catch (error) {
        console.error("Firebase Admin Initialization Error:", error);
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
