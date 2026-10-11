import { Link, useLocation } from "wouter";
import { CalendarDays, Compass, QrCode, Sparkles, Ticket } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHaptic } from "@/lib/native";

export function NotFoundPage() {
  const [, nav] = useLocation();
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="flex justify-center">
        <BrandMark />
      </div>
      <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">404 · Page Not Found</p>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t("lost")}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-mute">{t("lostLead")}</p>
      <p className="mt-1 text-sm text-mute">{t("lostBody")}</p>

      {/* Primary Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          onClick={() => {
            void triggerHaptic("light");
            nav("/");
          }}
          className="min-h-[44px] rounded-full px-6 text-sm font-bold shadow-xs"
        >
          {t("explore")}
        </Button>
        <Button
          variant="light"
          size="lg"
          onClick={() => {
            void triggerHaptic("light");
            nav("/scan");
          }}
          className="min-h-[44px] rounded-full ring-1 ring-line px-5 text-sm font-semibold hover:bg-paper"
        >
          <QrCode size={16} />
          {t("scan")}
        </Button>
      </div>

      {/* Pillar Recovery Links */}
      <div className="mt-10 rounded-3xl bg-card p-5 ring-1 ring-line text-left shadow-xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-mute px-2 pb-2">Jump to an ecosystem pillar</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
          <Link
            href="/pass"
            onClick={() => void triggerHaptic("light")}
            className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-paper/60 p-3 text-ink ring-1 ring-line/50 transition hover:bg-paper active:scale-95"
          >
            <Ticket size={16} className="text-emerald-500 shrink-0" />
            <span>AirPal Pass</span>
          </Link>
          <Link
            href="/now"
            onClick={() => void triggerHaptic("light")}
            className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-paper/60 p-3 text-ink ring-1 ring-line/50 transition hover:bg-paper active:scale-95"
          >
            <Compass size={16} className="text-blue-500 shrink-0" />
            <span>What now?</span>
          </Link>
          <Link
            href="/plan"
            onClick={() => void triggerHaptic("light")}
            className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-paper/60 p-3 text-ink ring-1 ring-line/50 transition hover:bg-paper active:scale-95"
          >
            <CalendarDays size={16} className="text-accent shrink-0" />
            <span>Hangouts</span>
          </Link>
          <Link
            href="/circle"
            onClick={() => void triggerHaptic("light")}
            className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-paper/60 p-3 text-ink ring-1 ring-line/50 transition hover:bg-paper active:scale-95"
          >
            <Sparkles size={16} className="text-purple-500 shrink-0" />
            <span>Inner Circle</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
