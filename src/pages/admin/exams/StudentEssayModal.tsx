import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import type { ExamEssay } from '../../../types/exam';

interface StudentEssayModalProps {
  examId: string;
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
}

export function StudentEssayModal({
  examId,
  userId,
  userName,
  userEmail,
  onClose,
}: StudentEssayModalProps) {
  const [essay, setEssay] = useState<ExamEssay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDoc(doc(db, 'exams', examId, 'essays', userId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setEssay(null);
          setError('Эссе не найдено');
        } else {
          const data = snap.data() as Record<string, unknown>;
          setEssay({
            userId: typeof data.userId === 'string' ? data.userId : userId,
            slotId: typeof data.slotId === 'string' ? data.slotId : '',
            groupId: typeof data.groupId === 'string' ? data.groupId : '',
            text: typeof data.text === 'string' ? data.text : '',
            charCount:
              typeof data.charCount === 'number'
                ? data.charCount
                : typeof data.text === 'string'
                ? data.text.length
                : 0,
            createdAt: (data.createdAt as Timestamp) ?? Timestamp.now(),
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        debugError('StudentEssayModal: get essay failed', err);
        setError('Ошибка загрузки эссе');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examId, userId]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-card p-6 shadow-brand"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 rounded-full p-1 text-muted transition hover:bg-card2"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-fg">{userName}</h3>
        <p className="mt-1 text-xs text-muted">{userEmail}</p>
        <div className="mt-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-fg">
          {loading
            ? 'Загрузка…'
            : error
            ? error
            : essay
            ? essay.text
            : 'Пусто'}
        </div>
        {essay && (
          <p className="mt-3 text-xs text-muted">{essay.charCount} символов</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
