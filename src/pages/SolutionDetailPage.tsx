import { useRoute, useLocation } from "wouter";
import { getSolution } from "@/data/solutions";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { NotFoundPage } from "./NotFoundPage";

export function SolutionDetailPage() {
  const [, params] = useRoute("/solutions/:id");
  const [, nav] = useLocation();
  const s = getSolution(params?.id || "");
  if (!s) return <NotFoundPage />;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 md:px-6">
      <div className="relative overflow-hidden rounded-[28px]">
        <Photo src={s.image} className="h-72 w-full object-cover md:h-96" />
        <div className="hero-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h1 className="font-display text-4xl font-semibold text-white">{s.title}</h1>
          <p className="mt-1 text-white/80">{s.line}</p>
        </div>
      </div>
      <ol className="mt-6 space-y-3">
        {s.steps.map((step, i) => (
          <li key={step} className="flex items-center gap-4 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <span className="font-display text-xl text-brand">{i + 1}</span>
            <span className="font-medium">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex gap-3">
        <Button className="flex-1" onClick={() => nav(s.href)}>
          {s.action}
        </Button>
        <Button variant="ghost" onClick={() => nav("/solutions")}>
          All
        </Button>
      </div>
    </div>
  );
}
