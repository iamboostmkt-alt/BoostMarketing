'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Algo salió mal</h2>
            <p className="text-white/50 text-sm max-w-md">
              Ocurrió un error inesperado en esta sección. Puedes intentar recargar.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <p className="mt-3 text-xs text-red-400 font-mono bg-red-400/5 rounded-lg px-3 py-2 max-w-sm mx-auto text-left">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            className="bg-brand hover:bg-brand-dark text-white gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar página
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
