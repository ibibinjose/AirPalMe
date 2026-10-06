import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Hand, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { liveBackendEnabled } from "@/lib/functions";
import { listenWaveByCode, startWaveRemote, stopWaveRemote } from "@/lib/wave";
import { canNfcWave, writeWaveNfc } from "@/lib/ble-wave";
import { makeQrDataUrl } from "@/lib/qr";
import { waveUrl } from "@shared/wave";
import { isNativeApp } from "@/lib/native";

export function WaveHostCard({
  placeName,
  placeId,
  listingId,
  handle,
}: {
  placeName: string;
  placeId?: string;
  listingId?: string;
  handle?: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string>("");
  const [hits, setHits] = useState(0);
  const [busy, setBusy] = useState(false);
  const placeKey = placeId ? `place_${placeId}` : handle || listingId || "";

  useEffect(() => {
    if (!code) {
      setQr("");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "https://airpal.me";
    void makeQrDataUrl(waveUrl(code, origin), 280).then(setQr);
    return listenWaveByCode(code, (session) => {
      if (!session) {
        setCode(null);
        setHits(0);
        return;
      }
      setHits(session.hitCount);
    });
  }, [code]);

  async function start() {
    if (!liveBackendEnabled()) {
      toast.message("Connect Firebase to wave at AirPals in the room.");
      return;
    }
    setBusy(true);
    try {
      const res = await startWaveRemote({
        placeName,
        placeKey,
        placeId,
        listingId,
      });
      setCode(res.code);
      setHits(0);
      toast.success("Waving — AirPals here can see you");
      if (canNfcWave()) {
        try {
          await writeWaveNfc(waveUrl(res.code, window.location.origin));
          toast.message("Hold phones together to NFC wave");
        } catch {
          /* QR still works */
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start a Wave");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await stopWaveRemote(code || undefined);
      setCode(null);
      toast.success("Wave stopped");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not stop");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[20px] bg-paper p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-accent">
          <Hand size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-mute">Wave</p>
          <p className="font-display text-lg font-semibold">Greet AirPals here</p>
          <p className="mt-1 text-[13px] leading-5 text-mute">
            {isNativeApp() || canNfcWave()
              ? "Keep this screen on. Guests on Scan who are here — or who hold phones together — can wave back."
              : "Bluetooth can’t broadcast from iPhone Safari. Keep this QR up, or guests who tapped I’m here will see you on Scan."}
          </p>
        </div>
      </div>
      {code ? (
        <div className="mt-4 text-center">
          {qr && <img src={qr} alt={`Wave ${code}`} className="mx-auto h-44 w-44 rounded-2xl bg-white p-2" />}
          <p className="mt-2 font-display text-2xl font-bold tracking-[0.2em]">{code}</p>
          <p className="text-[12px] text-mute">{hits ? `${hits} waved` : "Waiting for waves"} · 15 minutes</p>
          <Button className="mt-3 w-full" variant="ghost" disabled={busy} onClick={() => void stop()}>
            Stop waving
          </Button>
        </div>
      ) : (
        <Button className="mt-4 w-full" disabled={busy || !placeName} loading={busy} onClick={() => void start()}>
          <QrCode size={16} /> Wave at AirPals
        </Button>
      )}
    </section>
  );
}
