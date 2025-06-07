import { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You can log the error to an error reporting service here
    if (
      error.message.includes("useState") ||
      error.message.includes("useEffect")
    ) {
      console.error(
        "React hooks error detected - this may be due to module loading issues",
      );
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isHookError =
        this.state.error?.message.includes("useState") ||
        this.state.error?.message.includes("useEffect") ||
        this.state.error?.message.includes("Cannot read properties of null");

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    {isHookError
                      ? "React Module Loading Error"
                      : "Something went wrong"}
                  </p>
                  <p className="text-sm">
                    {isHookError
                      ? "There was an issue loading React modules. This usually resolves with a page refresh."
                      : "An unexpected error occurred while rendering the page."}
                  </p>
                  {this.state.error && (
                    <details className="text-xs mt-2">
                      <summary className="cursor-pointer font-medium">
                        Error Details
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {this.state.error.message}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button
                onClick={this.handleReload}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1"
              >
                Try Again
              </Button>
            </div>

            {isHookError && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Quick Fix:</strong> If this error persists, try:
                </p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>• Refresh the page (F5)</li>
                  <li>• Clear browser cache</li>
                  <li>• Restart the development server</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
