import React from "react";
import { reportError } from "@/lib/error-report";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error) {
    reportError(err, "boundary");
  }

  render() {
    if (this.state.err) {
      return (
        <div className="grid min-h-dvh place-items-center bg-paper p-8 text-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Error</p>
            <p className="font-display mt-2 text-2xl">Something broke</p>
            <p className="mt-2 text-sm text-mute">Reload the page. If it keeps happening, scan a code or write to us.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="h-11 rounded-full bg-brand px-5 text-sm font-medium text-white"
                onClick={() => location.reload()}
              >
                Reload
              </button>
              <a href="/" className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-medium ring-1 ring-line">
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
