import { useLocation } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";

export function NotFoundPage() {
  const [, nav] = useLocation();
  const { t } = useLocale();
  return (
    <div className="grid min-h-[50vh] place-items-center px-6 py-16 text-center">
      <div className="max-w-md">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">404</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">{t("lost")}</h1>
        <p className="mt-2 text-[15px] text-mute">{t("lostLead")}</p>
        <p className="mt-1 text-sm text-mute">{t("lostBody")}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => nav("/")}>{t("explore")}</Button>
          <Button variant="ghost" onClick={() => nav("/scan")}>
            {t("scan")}
          </Button>
        </div>
      </div>
    </div>
  );
}
