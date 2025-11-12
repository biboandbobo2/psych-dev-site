import { addDoc, collection, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it, beforeAll } from 'vitest';
import { db } from '../../src/lib/firebase';
import { initializeIntegrationApp, resetIntegrationData } from './helper';

beforeAll(async () => {
  await initializeIntegrationApp();
});

beforeEach(async () => {
  await resetIntegrationData();
});

describe('topics CRUD', () => {
  it('создаёт, обновляет и удаляет тему в Firestore', async () => {
    const topicsCol = collection(db, 'topics');
    const docRef = await addDoc(topicsCol, {
      ageRange: 'infancy',
      text: 'Первый топик',
      order: 1,
      createdAt: new Date(),
      createdBy: 'integration-user',
    });

    let snapshot = await getDoc(docRef);
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()?.text).toBe('Первый топик');

    await updateDoc(docRef, { text: 'Обновлённый топик', order: 2 });
    snapshot = await getDoc(docRef);
    expect(snapshot.data()?.text).toBe('Обновлённый топик');
    expect(snapshot.data()?.order).toBe(2);

    await deleteDoc(docRef);
    const deletedSnapshot = await getDoc(docRef);
    expect(deletedSnapshot.exists()).toBe(false);
  });
});
