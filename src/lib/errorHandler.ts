type ErrorPayload = {
  message: string;
  error?: unknown;
  context?: string;
};

const listeners = new Set<(payload: ErrorPayload) => void>();

export function reportAppError(payload: ErrorPayload) {
  const contextMessage = payload.context ? `[${payload.context}] ` : '';
  // Центральная точка ошибок приложения: console.error должен быть виден в DevTools
  // у разработчиков и QA. debugError здесь молчит в проде — терять нельзя.
  /* eslint-disable no-console */
  console.error(`${contextMessage}${payload.message}`, payload.error ?? '');
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error('Error in error listener', error);
    }
  });
  /* eslint-enable no-console */
}

export function subscribeAppErrors(listener: (payload: ErrorPayload) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
