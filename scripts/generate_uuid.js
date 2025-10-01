const crypto = require('crypto');

function generateUUID() {
    // Generate 64 bytes of random data
    const buffer = crypto.randomBytes(32);
    // Convert to 64 character hex string
    return buffer.toString('hex');
}

console.log(generateUUID());
