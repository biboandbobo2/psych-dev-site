const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

async function verifyTest() {
    try {
        const testId = 'bAPj73LrieFrKNXOIDDe';
        const doc = await db.collection('tests').doc(testId).get();

        if (!doc.exists) {
            throw new Error('Test not found!');
        }

        const data = doc.data();
        console.log('✅ Verification Successful!');
        console.log(`Title: ${data.title}`);
        console.log(`Questions: ${data.questions.length}`);
        console.log(`Rubric: ${data.rubric}`);

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await admin.app().delete();
    }
}

verifyTest();
