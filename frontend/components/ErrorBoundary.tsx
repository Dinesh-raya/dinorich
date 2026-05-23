import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-8 text-center">
          <div className="glass-panel p-6 rounded-2xl max-w-md">
            <p className="text-danger-400 text-lg font-bold mb-2">Something went wrong</p>
            <p className="text-text-muted text-sm">
              Try refreshing the page. If the problem persists, you may need to rejoin the game.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
