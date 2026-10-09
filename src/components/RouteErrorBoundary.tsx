import React from "react";
import { reportError } from "@/lib/error-report";

/**
 * Per-route crash isolation. Mounted around the lazy route switch (inside the
 * app shell, outside Suspense) so a broken page — or a rejected chunk import
 * after a deploy — degrades to an in-place retry card instead of replacing
 * the whole app with the root error page. Pass the active location as a
 * reset key so successful navigation clears a stale error.
 */
export class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKeys?: readonly unknown[] },
  { err: Error | null }
> {
  state = { err: null as Error | null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error("[RouteErrorBoundary caught]", err, info);
    reportError(err, "boundary");
  }

  componentDidUpdate(prevProps: { resetKeys?: readonly unknown[] }) {
    if (!this.state.err) return;
    const prev = prevProps.resetKeys ?? [];
    const next = this.props.resetKeys ?? [];
    const changed = prev.length !== next.length || prev.some((key, i) => !Object.is(key, next[i]));
    if (changed) this.setState({ err: null });
  }

  private retry = () => this.setState({ err: null });

  render() {
    if (this.state.err) {
      return (
        <div className="mx-auto w-full max-w-md px-4 pt-16 pb-28 text-center">
          <div className="rounded-[28px] bg-card p-8 ring-1 ring-line shadow-clay">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Error</p>
            <p className="font-display mt-2 text-2xl font-bold">This page broke</p>
            <p className="mt-2 text-sm text-mute">
              Try again — the rest of the app is fine. If it keeps happening, reload.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.retry}
                className="h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-ink transition"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => location.reload()}
                className="inline-flex h-11 items-center rounded-full bg-paper px-5 text-sm font-semibold ring-1 ring-line hover:bg-card transition"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
