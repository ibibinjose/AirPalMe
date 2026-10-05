import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Hand } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWaveByCode, waveAtRemote } from "@/lib/wave";
import { waveCodeFrom, type WaveSession } from "@shared/wave";

export function WavePage() {
  const [, params] = useRoute("/w/:code");
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const code = waveCodeFrom(params?.code || "");
  const [session, setSession] = useState<WaveSession | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) return;
    void fetchWaveByCode(code).then(setSession);
  }, [code]);

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }
  if (!user) {
    return (
      <AuthGate
        next={`/w/${code}`}
        kicker="Wave"
        title="Wave back"
        lede="Someone nearby is greeting AirPals. Sign in to wave back — no phone numbers."
      />
    );
  }

  async function wave() {
    setBusy(true);
    try {
      const res = await waveAtRemote(code);
      toast.success(`You waved at ${res.name}`);
      nav(res.handle ? `/@${res.handle}` : "/now");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That Wave ended");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 pb-28 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
        <Hand size={24} />
      </span>
      <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.16em] text-mute">Wave</p>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
        {session ? `${session.name} is here` : "Wave"}
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-mute">
        {session ? `At ${session.placeName}. Wave back — they see you, not your number.` : "This Wave may have ended."}
      </p>
      <Button className="mt-6 w-full" disabled={busy || !session} loading={busy} onClick={() => void wave()}>
        Wave back
      </Button>
      <button
        type="button"
        className="mt-4 inline-flex min-h-[48px] items-center justify-center px-4 text-[15px] font-medium text-mute hover:text-ink"
        onClick={() => nav("/scan")}
      >
        Back to Scan
      </button>
    </div>
  );
}
