import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Hand, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { fetchMyHerePin } from "@/lib/here";
import { fetchWaveHere, listenWaveHere, waveAtRemote } from "@/lib/wave";
import { canBleScan, canNfcWave, listenWaveBle, listenWaveNfc } from "@/lib/ble-wave";
import { liveBackendEnabled } from "@/lib/functions";
import { waveCodeFrom } from "@shared/wave";
import type { WaveSession } from "@shared/wave";

export function WaveListenCard() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { mine } = useBio();
  const [nearby, setNearby] = useState<WaveSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!liveBackendEnabled() || !mine?.handle) return;
    let unsub = () => {};
    let cancelled = false;
    void fetchMyHerePin(mine.handle).then((pin) => {
      const key = pin?.placeKey;
      if (!key || cancelled) return;
      void fetchWaveHere(key).then((s) => {
        if (!cancelled) setNearby(s);
      });
      unsub = listenWaveHere(key, setNearby);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [mine?.handle]);

  async function waveBack(code: string) {
    if (!user) {
      nav(`/start?tab=signin&next=${encodeURIComponent(`/w/${waveCodeFrom(code)}`)}`);
      return;
    }
    setBusy(true);
    try {
      const res = await waveAtRemote(code);
      toast.success(`You waved at ${res.name}`);
      if (res.handle) nav(`/@${res.handle}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not wave");
    } finally {
      setBusy(false);
    }
  }

  async function listenRadio() {
    setListening(true);
    try {
      if (canNfcWave()) {
        const ac = new AbortController();
        window.setTimeout(() => {
          ac.abort();
          setListening(false);
        }, 20_000);
        await listenWaveNfc((url) => {
          const code = url.split("/w/")[1]?.split(/[/?#]/)[0];
          if (code) void waveBack(code);
        }, ac.signal);
        toast.message("Hold this phone near theirs");
        return;
      }
      if (canBleScan()) {
        const stop = await listenWaveBle((code) => void waveBack(code));
        toast.message("Listening over Bluetooth…");
        window.setTimeout(() => {
          stop();
          setListening(false);
        }, 20_000);
        return;
      }
      toast.message("On iPhone, scan the Wave QR or tap I’m here at this place.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "Could not listen");
    } finally {
      if (!canNfcWave()) setListening(false);
    }
  }

  return (
    <section className="mt-4 rounded-[20px] bg-paper p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-accent">
          <Hand size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-mute">Wave</p>
          <p className="font-display text-lg font-semibold">{nearby ? `${nearby.name} is waving` : "Find a Wave"}</p>
          <p className="mt-1 text-[13px] leading-5 text-mute">
            {nearby
              ? `They’re at ${nearby.placeName}. Wave back to say hi.`
              : "Businesses wave at AirPals in the room. Tap I’m here, scan their QR, or listen on Android."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {nearby ? (
          <Button className="flex-1" disabled={busy} loading={busy} onClick={() => void waveBack(nearby.code)}>
            Wave back
          </Button>
        ) : (
          <Button className="flex-1" variant="ghost" disabled={listening} onClick={() => void listenRadio()}>
            <Radio size={15} /> {listening ? "Listening…" : "Listen"}
          </Button>
        )}
      </div>
    </section>
  );
}
