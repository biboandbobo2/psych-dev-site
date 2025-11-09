import { useState } from 'react';
import type { NodeT, EdgeT, Sphere } from '../types';
import { parseBulkEventsText } from '../utils/parseBulkEvents';
import { LINE_X_POSITION } from '../constants';

interface BulkEventCreatorProps {
  onClose: () => void;
  onCreate: (events: Omit<NodeT, 'id'>[]) => void;
  onExtendBranch?: (newEndAge: number) => void;
  ageMax: number;
  selectedBranchX: number | null;
  selectedEdge?: EdgeT | null;
  branchSphere?: Sphere;
}

/**
 * Компонент для быстрого создания множества событий
 * Пользователь вводит события в формате: "возраст, название события"
 */
export function BulkEventCreator({
  onClose,
  onCreate,
  onExtendBranch,
  ageMax,
  selectedBranchX,
  selectedEdge,
  branchSphere
}: BulkEventCreatorProps) {
  const [inputText, setInputText] = useState('');

  const minAge = selectedEdge ? selectedEdge.startAge : 0;
  const maxAge = selectedEdge ? selectedEdge.endAge : ageMax;

  const baseParsedEvents = parseBulkEventsText(inputText);
  const parsedEvents = baseParsedEvents.map((event) => {
    if (event.error || event.age === null || event.label === null) return event;

    if (selectedEdge) {
      if (event.age < minAge) {
        return {
          ...event,
          error: `Строка ${event.line}: Возраст ${event.age} меньше начала ветки (${minAge})`,
        };
      }
      if (event.age > maxAge) {
        return {
          ...event,
          needsExtension: true,
        };
      }
    } else if (event.age < 0 || event.age > ageMax) {
      return {
        ...event,
        error: `Строка ${event.line}: Возраст должен быть от 0 до ${ageMax}`,
      };
    }

    return event;
  });

  const validEvents = parsedEvents.filter((e) => e.error === null && e.age !== null && e.label !== null);
  const hasErrors = parsedEvents.some((e) => e.error !== null);
  const extensionEvents = parsedEvents.filter((e) => e.needsExtension && e.age !== null);
  const needsExtension = extensionEvents.length > 0;
  const maxRequiredAge = extensionEvents.reduce((max, e) => Math.max(max, e.age ?? max), maxAge);

  const handleSubmit = () => {
    if (validEvents.length === 0) return;

    const events: Omit<NodeT, 'id'>[] = validEvents.map((e) => ({
      age: e.age!,
      label: e.label!,
      x: selectedBranchX ?? LINE_X_POSITION,
      parentX: selectedBranchX ?? undefined,
      notes: '',
      sphere: branchSphere, // Автоматически устанавливаем сферу от ветки
      isDecision: false,
    }));

    onCreate(events);
    onClose();
  };

  const handleExtendAndCreate = () => {
    if (validEvents.length === 0 && !needsExtension) return;

    // Сначала продлеваем ветку
    if (onExtendBranch && maxRequiredAge > maxAge) {
      onExtendBranch(maxRequiredAge);
    }

    // Затем создаём все события (включая те, что выходили за пределы)
    const allEvents = parsedEvents
      .filter((e) => e.age !== null && e.label !== null)
      .map((e) => ({
        age: e.age!,
        label: e.label!,
        x: selectedBranchX ?? LINE_X_POSITION,
        parentX: selectedBranchX ?? undefined,
        notes: '',
        sphere: branchSphere,
        isDecision: false,
      }));

    onCreate(allEvents);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
              Создать много событий
            </h2>
            <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: 'Georgia, serif' }}>
              Формат: возраст, название события (каждое событие с новой строки)
            </p>
            {selectedEdge && (
              <div className="mt-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-900" style={{ fontFamily: 'Georgia, serif' }}>
                  <span className="font-semibold">📍 Ветка:</span> возраст {minAge}–{maxAge} лет
                  {branchSphere && <span className="ml-2">• Сфера будет установлена автоматически</span>}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Input area */}
          <div>
            <label className="block mb-2">
              <span className="text-xs font-medium text-slate-700" style={{ fontFamily: 'Georgia, serif' }}>
                Введите события
              </span>
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-64 px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm resize-none font-mono"
              placeholder="Пример:&#10;18, Поступил в университет&#10;22, Первая работа&#10;25, Переехал в другой город&#10;30, Свадьба"
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          {/* Preview */}
          {inputText.trim() && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'Georgia, serif' }}>
                  Предпросмотр ({validEvents.length} событий)
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {parsedEvents.map((event, index) => (
                  <div
                    key={index}
                    className={`px-4 py-2 text-sm border-b border-slate-100 last:border-b-0 ${
                      event.error ? 'bg-red-50' : 'bg-white'
                    }`}
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {event.error ? (
                      <span className="text-red-600">⚠️ {event.error}</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900 w-12">{event.age} лет</span>
                        <span className="text-slate-700">{event.label}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {needsExtension && onExtendBranch && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  <span className="font-semibold">⚠️ Некоторые события выходят за пределы ветки</span>
                  <br />
                  Ветка будет автоматически продлена до {maxRequiredAge} лет
                </p>
                <button
                  onClick={handleExtendAndCreate}
                  className="w-full px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-medium text-sm"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  ↑ Продлить ветку и создать все события
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={validEvents.length === 0}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                ✓ Создать {validEvents.length > 0 ? `${validEvents.length} событий` : ''}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium text-sm"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Отмена
              </button>
            </div>
          </div>

          {/* Help text */}
          {hasErrors && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-900" style={{ fontFamily: 'Georgia, serif' }}>
                💡 Совет: Убедитесь, что каждая строка имеет формат "возраст, название события"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
