const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

console.log("Original Key Length:", key ? key.length : "undefined");

const getPrivateKey = (key) => {
    if (!key) return undefined;

    // Handle literal \n replacement
    let cleanKey = key.replace(/\\n/g, '\n');

    // Strip surrounding quotes
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
        cleanKey = cleanKey.slice(1, -1);
    }

    const beginTag = "-----BEGIN PRIVATE KEY-----";
    const endTag = "-----END PRIVATE KEY-----";
    const beginIdx = cleanKey.indexOf(beginTag);
    const endIdx = cleanKey.indexOf(endTag);

    if (beginIdx !== -1 && endIdx !== -1) {
        // Extract base64 body
        let body = cleanKey.substring(beginIdx + beginTag.length, endIdx);
        // Remove all whitespace (newlines, spaces)
        body = body.replace(/\s/g, '');

        // Chunk into 64 chars
        const chunks = body.match(/.{1,64}/g) || [];

        return `${beginTag}\n${chunks.join('\n')}\n${endTag}`;
    }

    // Fallback
    return cleanKey.replace(/\\n/g, '\n').trim();
};

const finalKey = getPrivateKey(key);
console.log("Reconstructed Key:");
console.log(finalKey);

try {
    const cert = admin.credential.cert({
        projectId: 'test-project',
        clientEmail: 'test@example.com',
        privateKey: finalKey
    });
    console.log("SUCCESS: Credential created successfully with reconstructed key.");
} catch (e) {
    console.error("FAILURE: Credential creation failed.");
    console.error(e);
}
