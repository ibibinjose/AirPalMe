/** Demo-data badge. Shown on guest surfaces while the build has no live backend. */
export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300"
      title="Seed content for preview — not the live venue data"
    >
      {label}
    </span>
  );
}
