const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Basic .env parser since we might not have dotenv installed or configured in this script context
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error("Could not load .env.local", e);
        return {};
    }
}

const env = loadEnv();
const key = env.FIREBASE_PRIVATE_KEY;

console.log("Loaded Key Length:", key ? key.length : "undefined");

if (!key) {
    console.error("No key found!");
    process.exit(1);
}

// Emulate the logic in lib/firebase-admin.ts
const getPrivateKey = (key) => {
    if (!key) return undefined;

    // Handle literal \n replacement
    let cleanKey = key.replace(/\\n/g, '\n');

    // Strip surrounding quotes if present (handled by simple parser above too, but let's be safe)
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
        cleanKey = cleanKey.slice(1, -1);
    }

    const beginTag = "-----BEGIN PRIVATE KEY-----";
    const endTag = "-----END PRIVATE KEY-----";
    const beginIdx = cleanKey.indexOf(beginTag);
    const endIdx = cleanKey.indexOf(endTag);

    if (beginIdx !== -1 && endIdx !== -1) {
        return cleanKey.substring(beginIdx, endIdx + endTag.length);
    }

    return cleanKey.trim();
};

const finalKey = getPrivateKey(key);
console.log("Processed Key Start:", finalKey.substring(0, 40));
console.log("Processed Key End:", finalKey.substring(finalKey.length - 40));
console.log("Processed Key contains newlines:", finalKey.includes('\n'));

try {
    const cert = admin.credential.cert({
        projectId: 'test-project',
        clientEmail: 'test@example.com',
        privateKey: finalKey
    });
    console.log("SUCCESS: Credential created successfully.");
} catch (e) {
    console.error("FAILURE: Credential creation failed.");
    console.error(e);
}
