import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-red-900 border-4 border-red-500">
          <h1 className="text-2xl font-bold mb-4">Oops, something crashed!</h1>
          <p className="mb-4 text-center max-w-md">The application encountered an unexpected error on this device/browser.</p>
          <div className="bg-white p-4 rounded text-sm font-mono overflow-auto max-w-full shadow">
            <span className="font-bold">Error:</span> {this.state.error?.toString()}
          </div>
          <button 
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.href = '/'}
          >
            Go Back Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
