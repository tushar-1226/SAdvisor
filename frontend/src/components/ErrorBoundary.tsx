import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";
import "./ErrorBoundary.css";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught uncaught react error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon-wrapper">
              <AlertOctagon size={48} className="error-boundary-icon" />
            </div>
            <h2 className="error-boundary-title">Dashboard Rendering Error</h2>
            <p className="error-boundary-message">
              An unexpected issue occurred while rendering this analytics component. 
              This can be due to malformed data responses or complex chart computations.
            </p>
            {this.state.error && (
              <div className="error-boundary-details">
                <code>{this.state.error.toString()}</code>
              </div>
            )}
            <div className="error-boundary-actions">
              <button className="error-boundary-btn error-boundary-btn--primary" onClick={this.handleReset}>
                <RotateCcw size={16} /> Reload Application
              </button>
              <button className="error-boundary-btn error-boundary-btn--secondary" onClick={() => window.location.href = "/"}>
                <Home size={16} /> Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
