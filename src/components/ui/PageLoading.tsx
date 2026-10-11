export function PageLoading({ label, message }: { label?: string; message?: string }) {
  const text = message || label || "Loading";
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-sm text-mute">{text}</p>
    </div>
  );
}
