import { collection, doc, getDocs, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { debugError } from '../../lib/debug';

/** users/{uid}/achievements/{badgeId} — «храповик» полученных наклеек (см. firestore.rules). */
const achievementsRef = (uid: string) => collection(db, 'users', uid, 'achievements');

export async function loadEarnedAchievements(uid: string): Promise<Map<string, Date>> {
  const snap = await getDocs(achievementsRef(uid));
  const earned = new Map<string, Date>();
  snap.docs.forEach((d) => {
    const at = d.data().earnedAt as Timestamp | undefined;
    earned.set(d.id, at?.toDate?.() ?? new Date());
  });
  return earned;
}

/**
 * Записывает новые наклейки. Документ можно только создать: если он уже есть
 * (вторая вкладка, другое устройство) — rules отклонят запись, это нормально.
 */
export async function recordEarnedAchievements(
  uid: string,
  entries: { id: string; earnedAt?: Date }[],
): Promise<void> {
  await Promise.all(
    entries.map(async ({ id, earnedAt }) => {
      const ref = doc(achievementsRef(uid), id);
      try {
        await setDoc(ref, { earnedAt: earnedAt ? Timestamp.fromDate(earnedAt) : serverTimestamp() });
      } catch (error) {
        // Дата события могла оказаться «из будущего» из-за часов устройства — пробуем серверную.
        if (!earnedAt) return debugError('[achievements] record failed', { id, error });
        await setDoc(ref, { earnedAt: serverTimestamp() }).catch((retryError) =>
          debugError('[achievements] record failed', { id, error: retryError }),
        );
      }
    }),
  );
}
