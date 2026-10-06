import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Hotel,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TabPills } from "@/components/ui/TabPills";
import { SearchBar } from "@/components/search/SearchBar";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  helpArticleIdFromSearch,
  type HelpCategoryId,
} from "@/lib/help-articles";

type CategoryFilter = "all" | HelpCategoryId;

const CATEGORY_ICONS: Record<CategoryFilter, typeof Sparkles> = {
  all: Sparkles,
  plans: CalendarDays,
  tickets: Ticket,
  safety: ShieldCheck,
  account: User,
  stay: Hotel,
};

export function HelpPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : helpArticleIdFromSearch(window.location.search),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HELP_ARTICLES.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      const hay = `${a.title} ${a.summary} ${a.steps.join(" ")}`.toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    });
  }, [query, category]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Knowledge Hub</p>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">How can we help?</h1>
      <p className="mt-1 text-sm leading-6 text-mute">
        Short guides to plans, tickets, safety, and your account. Still stuck?{" "}
        <Link href="/assist" className="font-semibold text-accent hover:underline">
          Contact support
        </Link>
        .
      </p>

      <div className="mt-5">
        <SearchBar
          value={query}
          onChange={setQuery}
          onClear={() => setQuery("")}
          placeholder="Search guides — try “refund”, “invite”, “block”…"
          aria-label="Search help guides"
        />
      </div>

      <div className="mt-4">
        <TabPills<CategoryFilter>
          ariaLabel="Help categories"
          items={[
            { id: "all", label: "All", icon: CATEGORY_ICONS.all },
            ...HELP_CATEGORIES.map((c) => ({ id: c.id as CategoryFilter, label: c.label, icon: CATEGORY_ICONS[c.id] })),
          ]}
          active={category}
          onChange={(id) => {
            void triggerHaptic("light");
            setCategory(id);
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20">
            <LifeBuoy size={26} />
          </div>
          <h2 className="font-display mt-3 text-lg font-bold text-ink">No guides match “{query.trim()}”</h2>
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-mute">
            Try fewer words, or browse a category above.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setQuery("")}>
              Clear search
            </Button>
            <Link href="/contact">
              <Button size="sm" className="rounded-full">
                Contact us <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((article) => {
            const open = openId === article.id;
            const cat = HELP_CATEGORIES.find((c) => c.id === article.category);
            return (
              <li
                key={article.id}
                className="overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-xs transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setOpenId(open ? null : article.id);
                  }}
                  aria-expanded={open}
                  className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 p-4 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                      {cat?.label}
                    </span>
                    <span className="font-display mt-0.5 block text-[17px] font-bold leading-snug text-ink">
                      {article.title}
                    </span>
                    {!open && (
                      <span className="mt-0.5 block truncate text-[13px] text-mute">{article.summary}</span>
                    )}
                  </span>
                  <ChevronDown
                    size={18}
                    className={cn("shrink-0 text-mute transition-transform", open && "rotate-180")}
                  />
                </button>
                {open && (
                  <div className="border-t border-line/60 px-4 pb-4 pt-3">
                    <p className="text-sm leading-6 text-mute">{article.summary}</p>
                    <ol className="mt-3 space-y-2.5">
                      {article.steps.map((step, i) => (
                        <li key={i} className="flex gap-2.5 text-sm leading-6 text-ink">
                          <span
                            aria-hidden
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-bold text-accent"
                          >
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {article.links.map((link) => (
                        <Link key={link.href + link.label} href={link.href}>
                          <span className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-full bg-paper px-4 text-[13px] font-semibold text-accent ring-1 ring-line transition hover:bg-brand/10">
                            {link.label} <ArrowRight size={13} />
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 rounded-3xl bg-neutral-900 p-6 text-center text-white shadow-xs">
        <h2 className="font-display text-xl font-bold">Still stuck?</h2>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-white/70">
          Tell us what broke — a human reads every message.
        </p>
        <Link href="/contact">
          <span className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full bg-white px-6 text-sm font-bold text-ink transition hover:opacity-90">
            Contact support <ArrowRight size={15} />
          </span>
        </Link>
      </div>
    </div>
  );
}
