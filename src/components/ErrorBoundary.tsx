import React from "react";
import { reportError } from "@/lib/error-report";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err: Error | null; info: React.ErrorInfo | null }
> {
  state = { err: null as Error | null, info: null as React.ErrorInfo | null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary caught]", err, info);
    this.setState({ info });
    reportError(err, "boundary");
  }

  render() {
    if (this.state.err) {
      return (
        <div className="grid min-h-dvh place-items-center bg-paper p-8 text-center">
          <div className="max-w-md w-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Error</p>
            <p className="font-display mt-2 text-2xl font-bold">Something broke</p>
            <p className="mt-2 text-sm text-mute">
              Reload the page. If it keeps happening, scan a code or write to us.
            </p>
            {import.meta.env.DEV && this.state.err && (
              <div className="mt-4 max-h-60 overflow-auto rounded-2xl bg-red-500/10 p-3.5 text-left text-xs font-mono text-red-600 ring-1 ring-red-500/20">
                <p className="font-bold">{this.state.err.name}: {this.state.err.message}</p>
                <pre className="mt-2 whitespace-pre-wrap text-[10px] opacity-80 leading-relaxed">
                  {this.state.err.stack}
                </pre>
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-ink transition"
                onClick={() => location.reload()}
              >
                Reload
              </button>
              <a
                href="/"
                className="inline-flex h-11 items-center rounded-full bg-card px-5 text-sm font-semibold ring-1 ring-line hover:bg-paper transition"
              >
                Explore
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

