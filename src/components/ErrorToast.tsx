import { useEffect, useState } from 'react';
import { subscribeAppErrors } from '../lib/errorHandler';

export function ErrorToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = subscribeAppErrors(({ message: msg }) => {
      setMessage(msg);
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        setMessage(null);
        timer = undefined;
      }, 4000);
    });

    return () => {
      unsubscribe();
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  if (!message) return null;

  return (
    <div className="error-toast" role="status" aria-live="assertive">
      {message}
    </div>
  );
}
