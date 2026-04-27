import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ageToRange } from '../utils/ageToRange';
import { AGE_RANGE_LABELS, type AgeRange } from '../../../types/notes';
import { debugLog, debugWarn, debugError } from '../../../lib/debug';
import type { Sphere } from '../types';

// Метаданные сфер жизни
const SPHERE_LABELS: Record<Sphere, string> = {
  education: 'Образование',
  career: 'Карьера',
  family: 'Семья',
  health: 'Здоровье',
  friends: 'Друзья',
  place: 'Место/переезд',
  finance: 'Финансы',
  hobby: 'Хобби',
  other: 'Другое',
};

interface SaveEventAsNoteButtonProps {
  eventTitle: string;
  eventAge: number;
  eventNotes: string;
  eventSphere?: Sphere;
  onSuccess?: () => void;
  createNote: (
    title: string,
    content: string,
    ageRange: AgeRange | null,
    topicId: string | null,
    topicTitle: string | null
  ) => Promise<string>;
}

/**
 * Кнопка-иконка для сохранения события в заметки
 */
export function SaveEventAsNoteButton({
  eventTitle,
  eventAge,
  eventNotes,
  eventSphere,
  onSuccess,
  createNote,
}: SaveEventAsNoteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Детектор состояния модального окна
  useEffect(() => {
    if (showConfirm) {
      debugLog('✅ [DETECTOR] Modal window is NOW OPEN (showConfirm = true)');
      debugLog('✅ [DETECTOR] Z-index should be: z-[9999]');
      debugLog('✅ [DETECTOR] Modal should be visible on screen');

      // Проверяем через небольшую задержку, что элемент действительно в DOM
      setTimeout(() => {
        const modalElement = document.querySelector('[data-modal="save-note"]');
        if (modalElement) {
          debugLog('✅ [DETECTOR] Modal element FOUND in DOM!');
          const styles = window.getComputedStyle(modalElement);
          debugLog('✅ [DETECTOR] Modal computed z-index:', styles.zIndex);
          debugLog('✅ [DETECTOR] Modal position:', styles.position);
          debugLog('✅ [DETECTOR] Modal display:', styles.display);
        } else {
          debugWarn('⚠️ [DETECTOR] Modal element NOT FOUND in DOM!');
        }
      }, 100);
    } else {
      debugLog('❌ [DETECTOR] Modal window is CLOSED (showConfirm = false)');
    }
  }, [showConfirm]);

  const handleSaveAsNote = async () => {
    debugLog('🔵 SaveEventAsNote: Starting save process...');
    debugLog('Event data:', { eventTitle, eventAge, eventNotes, eventSphere });

    setSaving(true);
    try {
      // Определяем возрастной период
      debugLog('🔵 Determining age range for age:', eventAge);
      const ageRange = ageToRange(eventAge);
      debugLog('🔵 Age range determined:', ageRange);

      const periodTitle = ageRange ? AGE_RANGE_LABELS[ageRange] : null;
      debugLog('🔵 Period title:', periodTitle);

      // Формируем содержание заметки
      let content = '';

      // Добавляем возраст
      content += `**Возраст:** ${eventAge} лет\n\n`;

      // Добавляем период
      if (periodTitle) {
        content += `**Период:** ${periodTitle}\n\n`;
      }

      // Добавляем сферу жизни
      if (eventSphere) {
        const sphereLabel = SPHERE_LABELS[eventSphere];
        content += `**Сфера жизни:** ${sphereLabel}\n\n`;
      }

      // Добавляем подробности
      if (eventNotes && eventNotes.trim()) {
        content += `**Подробности:**\n${eventNotes}`;
      }

      debugLog('🔵 Note content prepared:', content);
      debugLog('🔵 Calling createNote...');

      // Создаём заметку
      await createNote(
        eventTitle || 'Событие из таймлайна',
        content,
        ageRange,
        null, // topicId
        null  // topicTitle
      );

      debugLog('✅ Note created successfully!');
      setShowConfirm(false);
      onSuccess?.();
    } catch (error) {
      debugError('❌ Error saving event as note:', error);
      alert('Ошибка при сохранении заметки: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
      debugLog('🔵 Save process finished');
    }
  };

  return (
    <>
      {/* Иконка заметки */}
      <button
        type="button"
        onClick={() => {
          debugLog('🔘 [CLICK] Note icon clicked - opening modal...');
          setShowConfirm(true);
        }}
        className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-600 hover:text-slate-900"
        title="Сохранить событие в заметки"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </button>

      {/* Модальное окно подтверждения */}
      {showConfirm && createPortal(
        <div
          data-modal="save-note"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => !saving && setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
                  Сохранить в заметки?
                </h3>
                <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: 'Georgia, serif' }}>
                  Событие будет сохранено в ваших заметках
                </p>
              </div>
              {!saving && (
                <button
                  onClick={() => setShowConfirm(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500 hover:text-slate-900"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Превью заметки */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                <div className="font-semibold text-slate-900 mb-2">
                  {eventTitle || 'Событие из таймлайна'}
                </div>
                <div className="text-slate-600 space-y-1">
                  <div>
                    <span className="font-medium">Возраст:</span> {eventAge} лет
                  </div>
                  {ageToRange(eventAge) && (
                    <div>
                      <span className="font-medium">Период:</span>{' '}
                      {AGE_RANGE_LABELS[ageToRange(eventAge)!]}
                    </div>
                  )}
                  {eventSphere && (
                    <div>
                      <span className="font-medium">Сфера:</span> {SPHERE_LABELS[eventSphere]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveAsNote}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {saving ? 'Сохранение...' : '✓ Сохранить'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium text-sm disabled:opacity-50"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
