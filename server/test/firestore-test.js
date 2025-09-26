const admin = require('firebase-admin');

// Initialize Firebase Admin with GCP service account
const serviceAccount = require('/Users/ryanmaulin/CoolCoolCoding/SnapDesign/server/certs/firebase-sdk-key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'revibe-8d4e5',
    databaseURL: 'https://revibe-8d4e5.firebaseio.com'
});

// Test write
async function testFirestore() {
    try {
        const db = admin.firestore();

        // Try to write to a test collection
        await db.collection('test').doc('test1').set({
            message: 'Test write at ' + new Date().toISOString()
        });
        console.log('✅ Write successful');

        // Try to read it back
        const doc = await db.collection('test').doc('test1').get();
        console.log('📖 Read data:', doc.data());

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Details:', error);
    }
}

testFirestore();
