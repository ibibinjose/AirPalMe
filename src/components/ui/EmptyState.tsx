import { Button } from "@/components/ui/Button";

export function EmptyState({
  kicker,
  title,
  body,
  action,
  actionLabel,
  secondary,
  secondaryLabel,
}: {
  kicker?: string;
  title: string;
  body?: string;
  action?: () => void;
  actionLabel?: string;
  secondary?: () => void;
  secondaryLabel?: string;
}) {
  return (
    <div className="rounded-3xl bg-card px-5 py-8 text-center ring-1 ring-line">
      {kicker ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{kicker}</p> : null}
      <p className="font-display mt-1 text-lg font-semibold">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-xs text-sm text-mute">{body}</p> : null}
      {(action && actionLabel) || (secondary && secondaryLabel) ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {action && actionLabel ? (
            <Button size="sm" onClick={action}>
              {actionLabel}
            </Button>
          ) : null}
          {secondary && secondaryLabel ? (
            <Button size="sm" variant="ghost" onClick={secondary}>
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
