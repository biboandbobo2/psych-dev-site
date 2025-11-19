import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { HomePageContent } from '../types/homePage';
import { DEFAULT_HOME_PAGE_CONTENT } from '../data/defaultHomePageContent';
import { debugLog, debugError } from '../lib/debug';

export function useHomePageContent() {
  const [content, setContent] = useState<HomePageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    try {
      setLoading(true);
      setError(null);

      const docRef = doc(db, 'pages', 'home');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as HomePageContent;
        debugLog('HomePage content loaded from Firestore', data);
        setContent(data);
      } else {
        debugLog('HomePage content not found, using default');
        setContent(DEFAULT_HOME_PAGE_CONTENT);
      }
    } catch (err) {
      debugError('Error loading HomePage content', err);
      setError(err as Error);
      // Fallback to default content on error
      setContent(DEFAULT_HOME_PAGE_CONTENT);
    } finally {
      setLoading(false);
    }
  }

  async function saveContent(newContent: HomePageContent): Promise<void> {
    try {
      const docRef = doc(db, 'pages', 'home');
      const dataToSave = {
        ...newContent,
        lastModified: new Date().toISOString(),
      };

      await setDoc(docRef, dataToSave);
      debugLog('HomePage content saved', dataToSave);
      setContent(dataToSave);
    } catch (err) {
      debugError('Error saving HomePage content', err);
      throw err;
    }
  }

  return {
    content,
    loading,
    error,
    saveContent,
    reload: loadContent,
  };
}
