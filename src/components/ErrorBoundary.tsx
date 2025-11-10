import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportAppError } from '../lib/errorHandler';

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportAppError({
      context: 'ErrorBoundary',
      message: 'Unhandled exception in UI',
      error: { error, info: errorInfo.componentStack },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="error-fallback">
          <h2>Что-то пошло не так</h2>
          <p>Не удалось отобразить содержимое. Попробуйте перезагрузить страницу.</p>
          <button type="button" onClick={this.handleReload}>
            Перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
