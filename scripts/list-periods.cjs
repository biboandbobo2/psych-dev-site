const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function listPeriods() {
    console.log('--- Listing Periods ---');
    const snapshot = await db.collection('periods').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Title: ${data.title}, Subtitle: ${data.subtitle}`);
    });
}

listPeriods().catch(console.error);
