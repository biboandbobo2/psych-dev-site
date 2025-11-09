import type { EdgeT } from '../types';
import { parseAge } from '../utils';

const SEPARATORS = [',', ';', ':'];

export type ParsedBulkEvent = {
  line: number;
  raw: string;
  age: number | null;
  label: string | null;
  error: string | null;
  needsExtension?: boolean;
};

const formatLineError = (line: number, message: string) => `Строка ${line}: ${message}`;

export function parseBulkEventsText(text: string): ParsedBulkEvent[] {
  const lines = text.split(/\r?\n/);
  const results: ParsedBulkEvent[] = [];

  lines.forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    let sepIndex = -1;
    for (const sep of SEPARATORS) {
      const idx = trimmed.indexOf(sep);
      if (idx !== -1 && (sepIndex === -1 || idx < sepIndex)) {
        sepIndex = idx;
      }
    }

    if (sepIndex === -1) {
      results.push({
        line: index + 1,
        raw,
        age: null,
        label: null,
        error: formatLineError(index + 1, 'Нет разделителя. Используйте "," или ";" или ":"'),
      });
      return;
    }

    const agePart = trimmed.slice(0, sepIndex).trim();
    const labelPart = trimmed.slice(sepIndex + 1).trim();

    if (!agePart || !labelPart) {
      results.push({
        line: index + 1,
        raw,
        age: null,
        label: null,
        error: formatLineError(index + 1, 'Возраст и название обязательны'),
      });
      return;
    }

    const age = parseAge(agePart);
    if (Number.isNaN(age)) {
      results.push({
        line: index + 1,
        raw,
        age: null,
        label: null,
        error: formatLineError(index + 1, 'Возраст указан неверно'),
      });
      return;
    }

    results.push({ line: index + 1, raw, age, label: labelPart, error: null });
  });

  return results;
}

export type BulkEventValidationResult = {
  valid: boolean;
  errors: string[];
  needsExtension: boolean;
  maxRequiredAge: number;
};

export function validateBulkEvents(
  events: ParsedBulkEvent[],
  ageMax: number,
  selectedEdge: EdgeT | null
): BulkEventValidationResult {
  const errors: string[] = [];
  let needsExtension = false;
  let maxRequiredAge = selectedEdge ? selectedEdge.endAge : ageMax;

  events.forEach((event) => {
    if (event.error || event.age === null) return;
    const age = event.age;

    if (selectedEdge) {
      if (age < selectedEdge.startAge) {
        errors.push(
          formatLineError(
            event.line,
            `Возраст ${age} меньше начала ветки (${selectedEdge.startAge})`
          )
        );
        return;
      }
      if (age > selectedEdge.endAge) {
        needsExtension = true;
        maxRequiredAge = Math.max(maxRequiredAge, age);
      }
    } else if (age < 0 || age > ageMax) {
      errors.push(
        formatLineError(event.line, `Возраст ${age} должен быть между 0 и ${ageMax}`)
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    needsExtension,
    maxRequiredAge,
  };
}
