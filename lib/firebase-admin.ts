import * as admin from 'firebase-admin';

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
        // If tags are missing, it might be an already-cleaned key or a raw format
        // Try to just fix newlines and return as-is
        return cleanKey.replace(/\\n/g, '\n').trim();
    }

    // 3. Extract the body
    let body = cleanKey.substring(beginIdx + beginTag.length, endIdx);

    // 4. Sanitize body: remove literal \n, real newlines, spaces, and quotes/apostrophes
    body = body.replace(/\\n/g, '').replace(/\s+/g, '').replace(/["']/g, '');

    // 5. Reconstruct standard PEM format
    return `${beginTag}\n${body}\n${endTag}`;
};

if (!admin.apps.length) {
    try {
        const privateKey = getPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

        if (privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            console.log("Firebase Admin Initialized successfully");
        } else {
            console.warn("FIREBASE_PRIVATE_KEY is missing or invalid");
        }
    } catch (error) {
        console.error("Firebase Admin Initialization FAILED:", error);
    }
}

// Export safely - check if app exists before getting services
// This prevents build-time crashes if init failed
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
