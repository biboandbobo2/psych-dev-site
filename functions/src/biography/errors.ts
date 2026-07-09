/**
 * normalizeError: маппинг ошибок biography pipeline → { statusCode, message }
 * для ответа Cloud Function. Вынесено из biographyImport.ts, чтобы юнит-тестировать
 * без module-level side effects (initializeApp / getFirestore при импорте обёртки).
 */
export function normalizeError(error: unknown): { statusCode: number; message: string } {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const statusCode = (error as { statusCode?: number }).statusCode;
  if (statusCode) return { statusCode, message: rawMessage };

  if (/quota|RESOURCE_EXHAUSTED|429/i.test(rawMessage)) {
    // Дневная квота бесплатного tier (Google возвращает различитель
    // GenerateRequestsPerDayPerProjectPerModel / «PerDay») сбрасывается только
    // на следующие сутки — отличаем от поминутной, чтобы не советовать «позже».
    if (/PerDay/i.test(rawMessage)) {
      return {
        statusCode: 429,
        message:
          'Дневной лимит бесплатного ключа Gemini исчерпан (около 3 импортов биографии в день). ' +
          'Подождите до завтра или подключите платный ключ Gemini в настройках.',
      };
    }
    // Поминутный лимит сбрасывается за минуту — прежнее сообщение.
    return { statusCode: 429, message: 'Gemini временно недоступен из-за лимита запросов. Попробуйте позже.' };
  }
  if (/PERMISSION_DENIED|API key not valid|invalid api key|forbidden/i.test(rawMessage)) return { statusCode: 403, message: 'Gemini API key недействителен.' };
  if (/JSON|Unexpected token|parse/i.test(rawMessage)) return { statusCode: 502, message: 'Gemini вернул некорректный ответ. Попробуйте ещё раз.' };
  return { statusCode: 500, message: `Не удалось собрать таймлайн: ${rawMessage}` };
}
