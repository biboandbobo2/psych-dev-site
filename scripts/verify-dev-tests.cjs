const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

async function verifyDevTests() {
    try {
        console.log('🔍 Verifying Developmental Psychology tests...');

        const rubrics = ['19-22', '22-27', '28-40'];

        for (const rubric of rubrics) {
            const snapshot = await db.collection('tests').where('rubric', '==', rubric).get();
            if (snapshot.empty) {
                console.error(`❌ Test for rubric '${rubric}' not found!`);
            } else {
                const doc = snapshot.docs[0].data();
                console.log(`✅ Found '${rubric}': "${doc.title}"`);
                console.log(`   Questions: ${doc.questionCount} (Expected: 10)`);
                if (doc.questionCount !== 10) console.error('   ❌ Incorrect question count!');
            }
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await admin.app().delete();
    }
}

verifyDevTests();
