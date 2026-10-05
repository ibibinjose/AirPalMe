import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bug, Check, Copy, RotateCcw, Smartphone, Globe, X, Server } from "lucide-react";
import { getRuntimeDiagnostics, formatDiagnosticsReport, type RuntimeDiagnostics } from "@/lib/build-info";
import { triggerHaptic } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";

export function openDebugOverlay() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("airpal:open-debug"));
  }
}

export function closeDebugOverlay() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("airpal:close-debug"));
  }
}

export function DebugInfoOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostics | null>(null);
  const [copied, setCopied] = useState(false);

  useScrollLock(isOpen);

  useEffect(() => {
    // Check URL parameters for immediate debug mode
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("debug") || params.has("diagnostics")) {
        setDiagnostics(getRuntimeDiagnostics());
        setIsOpen(true);
      }
    } catch {
      /* ignore */
    }

    const handleOpen = () => {
      setDiagnostics(getRuntimeDiagnostics());
      setIsOpen(true);
      void triggerHaptic("light");
    };

    const handleClose = () => {
      setIsOpen(false);
    };

    const handleToggle = () => {
      setIsOpen((prev) => {
        if (!prev) {
          setDiagnostics(getRuntimeDiagnostics());
          void triggerHaptic("light");
        }
        return !prev;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle with Ctrl+Shift+D or Cmd+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        handleToggle();
      }
      // Close on Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("airpal:open-debug", handleOpen);
    window.addEventListener("airpal:close-debug", handleClose);
    window.addEventListener("airpal:toggle-debug", handleToggle);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("airpal:open-debug", handleOpen);
      window.removeEventListener("airpal:close-debug", handleClose);
      window.removeEventListener("airpal:toggle-debug", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleCopy = async () => {
    if (!diagnostics) return;
    void triggerHaptic("medium");
    const text = formatDiagnosticsReport(diagnostics);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore copy error */
    }
  };

  const handleClearStorage = () => {
    if (!window.confirm("Clear client cache and reload? Stored offline data and sessions will be reset.")) {
      return;
    }
    void triggerHaptic("warning");
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.reload();
    } catch {
      /* ignore */
    }
  };

  if (!isOpen || !diagnostics || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="debug-overlay-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-paper/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Bug size={16} />
            </div>
            <div>
              <h2 id="debug-overlay-title" className="text-base font-semibold text-ink leading-tight">
                Diagnostic & Debug Info
              </h2>
              <p className="text-xs text-mute">Client troubleshooting report</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close debug overlay"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-line/60 text-mute transition hover:bg-black/5 hover:text-ink cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Build Info Card */}
          <div className="rounded-xl border border-line/80 bg-paper/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-ink uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Server size={13} className="text-brand" />
                Build Version (build.gradle)
              </span>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-brand">
                v{diagnostics.versionName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-mute">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Version Name</span>
                <span className="font-mono text-ink font-semibold">{diagnostics.versionName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Version Code</span>
                <span className="font-mono text-ink font-semibold">{diagnostics.versionCode}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Platform</span>
                <span className="capitalize text-ink font-medium flex items-center gap-1 mt-0.5">
                  {diagnostics.isNative ? (
                    <Smartphone size={12} className="text-gold" />
                  ) : (
                    <Globe size={12} className="text-gold" />
                  )}
                  {diagnostics.platform} ({diagnostics.isNative ? "Native" : "Web"})
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Environment</span>
                <span className="font-mono text-ink uppercase text-[11px]">{diagnostics.environment}</span>
              </div>
            </div>

            {diagnostics.buildTimestamp && (
              <div className="mt-2.5 pt-2 border-t border-line/50 text-[11px] text-mute flex justify-between">
                <span>Built:</span>
                <span className="font-mono text-ink/80">{diagnostics.buildTimestamp}</span>
              </div>
            )}
          </div>

          {/* Client Diagnostics Grid */}
          <div className="rounded-xl border border-line/80 bg-paper/50 p-4 space-y-2">
            <span className="font-semibold text-ink uppercase tracking-wider text-[11px] block mb-2">
              Runtime Environment
            </span>

            <div className="grid grid-cols-2 gap-2 text-mute">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Viewport</span>
                <span className="font-mono text-ink">
                  {diagnostics.viewport} @ {diagnostics.dpr}x
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Network</span>
                <span className={diagnostics.online ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                  {diagnostics.online ? "Online" : "Offline"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Timezone</span>
                <span className="text-ink font-mono">{diagnostics.timeZone}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Language</span>
                <span className="text-ink font-mono">{diagnostics.language}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">Active Path</span>
                <span className="text-ink font-mono break-all">{diagnostics.currentUrl}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] uppercase tracking-wider text-mute/80 block">User Agent</span>
                <span className="text-ink/70 font-mono text-[10px] break-all leading-tight block mt-0.5">
                  {diagnostics.userAgent}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line bg-paper/60 px-5 py-3.5">
          <button
            type="button"
            onClick={handleClearStorage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-medium text-mute transition hover:border-rose-300 hover:text-rose-600"
          >
            <RotateCcw size={13} />
            <span>Reset Cache</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 active:scale-95"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? "Copied!" : "Copy Report"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
