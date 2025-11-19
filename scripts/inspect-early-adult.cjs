const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

const db = admin.firestore();

async function inspectPeriod() {
    console.log('--- Inspecting earlyAdult ---');
    const doc = await db.collection('periods').doc('earlyAdult').get();
    if (!doc.exists) {
        console.log('Document not found!');
        return;
    }
    console.log(JSON.stringify(doc.data(), null, 2));
}

inspectPeriod().catch(console.error);
