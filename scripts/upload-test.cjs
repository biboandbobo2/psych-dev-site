const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

async function uploadTest() {
  try {
    // Get file path from command line args
    const filePathArg = process.argv[2];

    if (!filePathArg) {
      throw new Error('Please provide the path to the test JSON file as an argument.');
    }

    const testFilePath = path.resolve(process.cwd(), filePathArg);

    if (!fs.existsSync(testFilePath)) {
      throw new Error(`File not found: ${testFilePath}`);
    }

    console.log(`📖 Reading file: ${testFilePath}`);
    const fileContent = fs.readFileSync(testFilePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    if (!jsonData.test) {
      throw new Error('Invalid JSON format: missing "test" property');
    }

    const testData = jsonData.test;

    const docData = {
      ...testData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system-script',
      status: 'published'
    };

    // Check if test with this rubric already exists to update it instead of creating duplicate
    // Note: This is a simple check. Ideally we should check by ID if provided, or by rubric.
    // For now, we will just add a new one as per original script, but logging the rubric is helpful.
    // OPTIONAL: Query for existing test with this rubric to prevent duplicates?
    // Let's query first.

    const snapshot = await db.collection('tests')
      .where('rubric', '==', testData.rubric)
      .limit(1)
      .get();

    let docRef;
    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      console.log(`⚠️ Test with rubric '${testData.rubric}' already exists (ID: ${existingDoc.id}). Updating...`);
      await existingDoc.ref.update({
        ...docData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      docRef = existingDoc.ref;
    } else {
      docRef = await db.collection('tests').add(docData);
    }

    console.log(`\n✅ Test uploaded successfully!`);
    console.log(`🆔 Test ID: ${docRef.id}`);
    console.log(`📂 Rubric: ${testData.rubric}`);
    console.log(`📄 Title: ${testData.title}`);

    console.log('\n📋 Check in Firestore Console:');
    console.log(`https://console.firebase.google.com/project/psych-dev-site-prod/firestore/data/tests/${docRef.id}`);

  } catch (error) {
    console.error('❌ Error uploading test:', error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

uploadTest();
