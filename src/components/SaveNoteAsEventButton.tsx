import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LINE_X_POSITION } from '../pages/timeline/constants';
import type { NodeT } from '../pages/timeline/types';
import { debugLog, debugError } from '../lib/debug';
import { Emoji } from './Emoji';

interface SaveNoteAsEventButtonProps {
  noteTitle: string;
  noteContent: string;
  onEventCreate: (event: Omit<NodeT, 'id'>) => Promise<void>;
  onSuccess?: () => void;
}

/**
 * Кнопка для сохранения заметки как события на таймлайне
 */
export function SaveNoteAsEventButton({
  noteTitle,
  noteContent,
  onEventCreate,
  onSuccess,
}: SaveNoteAsEventButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [age, setAge] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    // Предзаполняем название из заголовка заметки
    setEventTitle(noteTitle || '');
    setAge('');
    setShowModal(true);
  };

  const handleSave = async () => {
    const ageNum = parseFloat(age);

    // Валидация
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 100) {
      alert('Введите корректный возраст (от 0 до 100 лет)');
      return;
    }

    if (!eventTitle.trim()) {
      alert('Введите название события');
      return;
    }

    setSaving(true);
    try {
      debugLog('🔵 SaveNoteAsEvent: Creating event from note...');

      const event: Omit<NodeT, 'id'> = {
        age: ageNum,
        label: eventTitle.trim(),
        x: LINE_X_POSITION,
        // parentX: undefined, // Не передаём поле, если значение undefined
        notes: noteContent || '',
        // sphere: undefined, // Сфера не устанавливается - не передаём поле
        isDecision: false,
      };

      await onEventCreate(event);

      debugLog('✅ Event created successfully!');
      setShowModal(false);
      onSuccess?.();
    } catch (error) {
      debugError('❌ Error creating event:', error);
      alert('Ошибка при создании события: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-md border border-blue-300 px-4 py-2 text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        title="Сохранить заметку как событие на таймлайне"
      >
        <Emoji token="📍" size={16} /> На таймлайн
      </button>

      {/* Модальное окно */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
                  Добавить на таймлайн?
                </h3>
                <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: 'Georgia, serif' }}>
                  Заметка станет событием на вашей линии жизни
                </p>
              </div>
              {!saving && (
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500 hover:text-slate-900"
                >
                  <Emoji token="✕" size={16} />
                </button>
              )}
            </div>

            {/* Форма */}
            <div className="space-y-4 mb-6">
              {/* Возраст */}
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                  Возраст события <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Например: 25"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
                  style={{ fontFamily: 'Georgia, serif' }}
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={saving}
                  autoFocus
                />
              </label>

              {/* Название события */}
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                  Название события <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Введите название события"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
                  style={{ fontFamily: 'Georgia, serif' }}
                  disabled={saving}
                />
              </label>

              {/* Превью */}
              {eventTitle.trim() && age && !isNaN(parseFloat(age)) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                    Превью события:
                  </div>
                  <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
                    {eventTitle.trim()} • {parseFloat(age)} лет
                  </div>
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !age || !eventTitle.trim()}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {saving ? 'Создание...' : (
                  <>
                    <Emoji token="✓" size={14} /> Создать событие
                  </>
                )}
              </button>
              <button
                onClick={() => setShowModal(false)}
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
