import { useLocation } from "wouter";
import { SOLUTIONS } from "@/data/solutions";
import { Photo } from "@/components/ui/Photo";
import { useLocale } from "@/contexts/LocaleContext";

export function SolutionsPage() {
  const [, nav] = useLocation();
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 md:px-6">
      <header className="py-6 md:py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">{t("solutionsKicker")}</p>
        <h1 className="font-display mt-2 text-4xl font-semibold md:text-5xl whitespace-pre-line">
          {t("solutionsTitle")}
        </h1>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {SOLUTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => nav(`/solutions/${s.id}`)}
            aria-label={t(`sol.${s.id}`)}
            className="relative min-h-[220px] overflow-hidden rounded-[28px] text-left ring-brand transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:min-h-[280px]"
          >
            <Photo src={s.image} className="absolute inset-0 h-full w-full object-cover" />
            <div className="hero-scrim absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="font-display text-3xl font-semibold text-white">{t(`sol.${s.id}`)}</p>
              <p className="mt-1 text-sm text-white/80">{t(`sol.${s.id}Line`)}</p>
            </div>
          </button>
        ))}
      </div>

      <ol className="mt-10 grid grid-cols-3 gap-3">
        {(["print", "scan", "go"] as const).map((step, i) => (
          <li key={step} className="rounded-3xl bg-card p-4 ring-1 ring-line">
            <span className="font-display text-2xl text-brand">{i + 1}</span>
            <p className="mt-1 font-medium">{t(step)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
