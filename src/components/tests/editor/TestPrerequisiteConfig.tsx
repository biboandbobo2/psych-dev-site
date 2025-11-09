import { useRef, useState, useEffect, useMemo } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Test } from '../../../types/tests';
import { Field } from '../../Field';

const CONTROL =
  'h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] leading-none outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';
const CONTROL_ERROR = 'border-red-400 focus:border-red-500 focus:ring-red-500/60';

function controlClass(hasError?: boolean, extra?: string) {
  return `${CONTROL} ${hasError ? CONTROL_ERROR : ''} ${extra ?? ''}`.trim();
}

interface TestPrerequisiteConfigProps {
  isNextLevel: boolean;
  onIsNextLevelChange: (value: boolean) => void;

  thresholdInput: string;
  onThresholdInputChange: (value: string) => void;
  thresholdError: string | null;

  previousTestQuery: string;
  onPreviousTestQueryChange: (value: string) => void;

  previousTestIdInput: string;
  onPreviousTestIdInputChange: (value: string) => void;
  previousTestError: string | null;

  testOptions: Array<{ id: string; title: string; questionCount: number }>;
  filteredTestOptions: Array<{ id: string; title: string; questionCount: number }>;
  selectedTest: { id: string; title: string; questionCount: number } | undefined;
  prerequisiteTestId: string | undefined;

  onSelectPreviousTest: (option: { id: string; title: string; questionCount: number }) => void;

  saving: boolean;
}

export function TestPrerequisiteConfig({
  isNextLevel,
  onIsNextLevelChange,
  thresholdInput,
  onThresholdInputChange,
  thresholdError,
  previousTestQuery,
  onPreviousTestQueryChange,
  previousTestIdInput,
  onPreviousTestIdInputChange,
  previousTestError,
  testOptions,
  filteredTestOptions,
  selectedTest,
  prerequisiteTestId,
  onSelectPreviousTest,
  saving,
}: TestPrerequisiteConfigProps) {
  const selectContainerRef = useRef<HTMLDivElement | null>(null);
  const [previousTestOpen, setPreviousTestOpen] = useState<boolean>(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(0);

  const idHint = selectedTest
    ? `Найдено: ${selectedTest.title}`
    : 'Можно вставить ID вручную, если знаете его.';

  const activeOptionId =
    highlightIndex >= 0 && highlightIndex < filteredTestOptions.length
      ? `previous-test-option-${filteredTestOptions[highlightIndex].id}`
      : undefined;

  const handlePreviousTestKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!previousTestOpen) {
        setPreviousTestOpen(true);
        setHighlightIndex(filteredTestOptions.length > 0 ? 0 : -1);
      } else if (filteredTestOptions.length > 0) {
        setHighlightIndex((prev) => {
          if (prev < 0) return 0;
          const next = prev + 1;
          return next >= filteredTestOptions.length ? filteredTestOptions.length - 1 : next;
        });
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (previousTestOpen && filteredTestOptions.length > 0) {
        setHighlightIndex((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }
    } else if (event.key === 'Enter') {
      if (!previousTestOpen) {
        setPreviousTestOpen(true);
        setHighlightIndex(filteredTestOptions.length > 0 ? 0 : -1);
      } else if (highlightIndex >= 0 && filteredTestOptions[highlightIndex]) {
        event.preventDefault();
        onSelectPreviousTest(filteredTestOptions[highlightIndex]);
        setPreviousTestOpen(false);
      }
    } else if (event.key === 'Escape') {
      if (previousTestOpen) {
        event.preventDefault();
        setPreviousTestOpen(false);
      }
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mt-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500"
            checked={isNextLevel}
            onChange={(e) => onIsNextLevelChange(e.target.checked)}
            disabled={saving}
          />
          <span>Этот тест открыт только после прохождения другого теста</span>
        </label>
      </div>

      {isNextLevel && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3" data-visible={isNextLevel}>
          <Field
            htmlFor="test-threshold"
            label="Порог прохождения (%) *"
            hint="Студент должен набрать не меньше указанного процента на предыдущем тесте."
            error={thresholdError}
          >
            <input
              id="test-threshold"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={thresholdInput}
              onChange={(e) => onThresholdInputChange(e.target.value)}
              className={controlClass(Boolean(thresholdError))}
              aria-invalid={Boolean(thresholdError)}
              disabled={saving}
            />
          </Field>

          <Field
            htmlFor="test-previous-title"
            label="Предыдущий тест"
            hint="Выберите тест, после которого откроется текущий уровень."
          >
            <div ref={selectContainerRef} className="relative">
              <input
                id="test-previous-title"
                type="text"
                value={previousTestQuery}
                onChange={(e) => onPreviousTestQueryChange(e.target.value)}
                onFocus={() => !saving && setPreviousTestOpen(true)}
                onKeyDown={handlePreviousTestKeyDown}
                onBlur={(event) => {
                  const next = event.relatedTarget as HTMLElement | null;
                  if (!next || !selectContainerRef.current?.contains(next)) {
                    window.setTimeout(() => setPreviousTestOpen(false), 80);
                  }
                }}
                placeholder="Начните вводить название теста"
                className={controlClass(false)}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={previousTestOpen}
                aria-controls="previous-test-options"
                aria-activedescendant={activeOptionId}
                disabled={saving}
              />
              {previousTestOpen && (
                <div
                  id="previous-test-options"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg"
                >
                  {filteredTestOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-500">Ничего не найдено</div>
                  ) : (
                    filteredTestOptions.map((option, index) => {
                      const isSelected = option.id === prerequisiteTestId;
                      const isHighlighted = highlightIndex === index;
                      const optionId = `previous-test-option-${option.id}`;
                      return (
                        <button
                          key={option.id}
                          id={optionId}
                          type="button"
                          role="option"
                          aria-selected={isSelected || isHighlighted}
                          tabIndex={-1}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            onSelectPreviousTest(option);
                            setPreviousTestOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                            isHighlighted
                              ? 'bg-indigo-50 text-indigo-900'
                              : isSelected
                              ? 'bg-blue-100 text-blue-900'
                              : 'hover:bg-zinc-100'
                          }`}
                        >
                          <span className="mr-2 truncate">{option.title}</span>
                          <span className="flex-shrink-0 text-xs text-zinc-500">
                            • {option.questionCount} вопросов
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </Field>

          <Field
            htmlFor="test-previous-id"
            label="ID предыдущего теста *"
            hint={idHint}
            error={previousTestError}
          >
            <input
              id="test-previous-id"
              type="text"
              value={previousTestIdInput}
              onChange={(e) => onPreviousTestIdInputChange(e.target.value)}
              placeholder="Например: abc123"
              className={controlClass(Boolean(previousTestError))}
              aria-invalid={Boolean(previousTestError)}
              disabled={saving}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
