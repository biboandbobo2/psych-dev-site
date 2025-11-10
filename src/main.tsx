import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import '@fontsource-variable/manrope';
import 'nprogress/nprogress.css';
import './styles/theme.css';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorToast } from './components/ErrorToast';
import { reportAppError } from './lib/errorHandler';

function attachGlobalErrorHandlers() {
  const handleErrorEvent = (event: ErrorEvent) => {
    reportAppError({
      context: 'window.error',
      message: event.message || 'Uncaught error',
      error: event.error,
    });
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    reportAppError({
      context: 'window.unhandledrejection',
      message: event.reason?.message || 'Unhandled promise rejection',
      error: event.reason,
    });
  };

  window.addEventListener('error', handleErrorEvent);
  window.addEventListener('unhandledrejection', handleRejection);
}

attachGlobalErrorHandlers();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <ErrorToast />
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);
