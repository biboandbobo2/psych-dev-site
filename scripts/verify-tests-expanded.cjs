const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

async function verifyTests() {
    try {
        console.log('🔍 Verifying tests...');

        // 1. Verify Sensation and Perception (general-3)
        const snapshot3 = await db.collection('tests').where('rubric', '==', 'general-3').get();
        if (snapshot3.empty) {
            console.error('❌ general-3 test not found!');
        } else {
            const doc = snapshot3.docs[0].data();
            console.log(`✅ general-3 found: "${doc.title}"`);
            console.log(`   Questions: ${doc.questions.length} (Expected: 10)`);
            if (doc.questions.length !== 10) console.error('   ❌ Incorrect question count!');
        }

        // 2. Verify Attention (general-4)
        const snapshot4 = await db.collection('tests').where('rubric', '==', 'general-4').get();
        if (snapshot4.empty) {
            console.error('❌ general-4 test not found!');
        } else {
            const doc = snapshot4.docs[0].data();
            console.log(`✅ general-4 found: "${doc.title}"`);
            console.log(`   Questions: ${doc.questions.length} (Expected: 10)`);
            if (doc.questions.length !== 10) console.error('   ❌ Incorrect question count!');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await admin.app().delete();
    }
}

verifyTests();
