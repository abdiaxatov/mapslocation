import * as admin from 'firebase-admin';

// Helper to safely parse private key
const getPrivateKey = (key: string | undefined) => {
    if (!key) return undefined;

    // Handle literal \n replacement
    let cleanKey = key.replace(/\\n/g, '\n');

    // Strip surrounding quotes if present
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
        cleanKey = cleanKey.slice(1, -1);
    }

    // Strictly extract the PEM block to avoid "Unparsed DER bytes" errors
    const beginTag = "-----BEGIN PRIVATE KEY-----";
    const endTag = "-----END PRIVATE KEY-----";
    const beginIdx = cleanKey.indexOf(beginTag);
    const endIdx = cleanKey.indexOf(endTag);

    if (beginIdx !== -1 && endIdx !== -1) {
        return cleanKey.substring(beginIdx, endIdx + endTag.length);
    }

    return cleanKey.trim();
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: getPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
    });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
