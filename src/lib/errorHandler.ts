type ErrorPayload = {
  message: string;
  error?: unknown;
  context?: string;
};

const listeners = new Set<(payload: ErrorPayload) => void>();

export function reportAppError(payload: ErrorPayload) {
  const contextMessage = payload.context ? `[${payload.context}] ` : '';
  console.error(`${contextMessage}${payload.message}`, payload.error ?? '');
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error('Error in error listener', error);
    }
  });
}

export function subscribeAppErrors(listener: (payload: ErrorPayload) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
