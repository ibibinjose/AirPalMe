import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useStay } from "@/contexts/StayContext";
import { fetchCampus, loadCampus, type CampusDoc } from "@/lib/campus-store";
import { Sheet } from "@/components/ui/Sheet";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { noteQrContext, track, trackContentAction } from "@/lib/analytics";

export function CampusPage() {
  const [, nav] = useLocation();
  const [, params] = useRoute("/c/:id");
  const id = params?.id || "";
  const { setSession } = useStay();
  const [campus, setCampus] = useState<CampusDoc | undefined>(() => loadCampus(id));
  const [checked, setChecked] = useState(false);
  const [wifi, setWifi] = useState(false);
  const [tab, setTab] = useState<"today" | "campus" | "help">("today");

  useEffect(() => {
    setSession({ kind: "campus", campusId: params?.id, room: undefined });
    if (params?.id) noteQrContext(`campus:${params.id}`, { campusId: params.id, source: "campus" });
  }, [params?.id, setSession]);
  useEffect(() => {
    let alive = true;
    void fetchCampus(id).then((c) => {
      if (!alive) return;
      setCampus(c);
      setChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  // A context_view with loadStatus "ok" already fired for /c/:id — pair it
  // with context_load_failed when the campus resolves to nothing.
  const loadFailed = useRef("");
  useEffect(() => {
    if (!checked || campus || !id || loadFailed.current === id) return;
    loadFailed.current = id;
    void track("context_load_failed", { contextType: "campus", contextId: id, errorClass: "not_found" });
  }, [checked, campus, id]);

  if (!campus) {
    if (!checked) return <PageLoading />;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Unknown campus</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">This campus isn’t listed</h1>
        <Button className="mt-6" onClick={() => nav("/")}>
          Explore nearby
        </Button>
      </div>
    );
  }
  const CAMPUS = campus;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else nav("/");
          }}
          aria-label="Go back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-line bg-card transition hover:ring-brand/40 active:scale-95"
        >
          <ArrowLeft size={16} />
        </button>
        <p className="text-[11px] uppercase tracking-[0.16em] text-gold">{CAMPUS.university}</p>
      </div>
      <h1 className="font-display mt-1 text-3xl font-semibold">{CAMPUS.name}</h1>
      <div className="mt-4 flex gap-2">
        {(["today", "campus", "help"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`h-11 rounded-full px-4 text-sm capitalize transition active:scale-95 ${tab === t ? "bg-brand text-white shadow-xs" : "bg-card ring-1 ring-line"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <ul className="mt-5 space-y-2">
          {(CAMPUS.classes || []).slice(0, 5).map((c) => (
            <li key={c.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
              <p className="text-[12px] text-mute">
                {c.start}–{c.end} · {c.place}
              </p>
              <p className="font-medium">{c.title}</p>
            </li>
          ))}
        </ul>
      )}
      {tab === "today" && (CAMPUS.classes || []).length === 0 && (
        <p className="mt-5 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center text-sm text-mute">
          No classes listed for today — check the campus noticeboard.
        </p>
      )}

      {tab === "campus" && (
        <ul className="mt-5 space-y-2">
          {(CAMPUS.places || []).map((p) => (
            <li key={p.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
              <p className="text-[12px] text-mute">
                {p.category} · {p.minutes}
              </p>
              <p className="font-medium">{p.name}</p>
            </li>
          ))}
          {(CAMPUS.events || []).slice(0, 3).map((e) => (
            <li key={e.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
              <p className="text-[12px] text-gold">
                {e.time} · {e.where}
              </p>
              <p className="font-medium">{e.title}</p>
            </li>
          ))}
        </ul>
      )}
      {tab === "campus" && (CAMPUS.places || []).length === 0 && (CAMPUS.events || []).length === 0 && (
        <p className="mt-5 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center text-sm text-mute">
          Nothing listed around campus yet — check back soon.
        </p>
      )}

      {tab === "help" && (
        <div className="mt-5 space-y-3">
          <Button
            className="w-full"
            onClick={() => {
              setWifi(true);
              trackContentAction("wifi_reveal", params?.id || CAMPUS.id);
            }}
          >
            Wi-Fi
          </Button>
          {CAMPUS.security && (
            <a
              href={`tel:${CAMPUS.security}`}
              className="flex h-11 items-center justify-center rounded-full bg-card text-sm font-semibold ring-1 ring-line transition hover:bg-paper active:scale-[0.99]"
            >
              Security
            </a>
          )}
          {CAMPUS.phone && (
            <a
              href={`tel:${CAMPUS.phone}`}
              className="flex h-12 items-center justify-center rounded-2xl ring-1 ring-line bg-card text-sm font-semibold"
            >
              Call campus office
            </a>
          )}
        </div>
      )}

      <Sheet open={wifi} onClose={() => setWifi(false)} title="Wi-Fi">
        <p className="font-display text-2xl">{CAMPUS.wifi?.network || "Ask the campus office"}</p>
        <p className="mt-1 text-mute">{CAMPUS.wifi?.password || "Use eduroam with your student ID."}</p>
      </Sheet>
    </div>
  );
}
