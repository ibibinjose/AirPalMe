import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { PropertyInfo } from "@shared/airpal-data";
import { makeQrDataUrl, stayQrPayload } from "@/lib/qr";
import { buildMarkerUrl } from "@shared/airpal-urls";
import { roomTokenEntries } from "@/lib/host-workspace";
import { rotateRoomTokenRemote, liveBackendEnabled } from "@/lib/functions";

export function HostPrintPanel({ property }: { property: PropertyInfo }) {
  const rooms = roomTokenEntries(property.roomTokens);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [lobbyQr, setLobbyQr] = useState("");
  const [rotating, setRotating] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const next: Record<string, string> = {};
    void (async () => {
      for (const [token, room] of rooms) {
        const url = stayQrPayload(property.id, { room, roomToken: token });
        next[token] = await makeQrDataUrl(url);
      }
      if (alive) setCodes(next);
      const lobbyUrl = property.lobbyMarkerId
        ? buildMarkerUrl(property.lobbyMarkerId, window.location.origin)
        : `${window.location.origin}/g/${property.id}`;
      const lobby = await makeQrDataUrl(lobbyUrl);
      if (alive) setLobbyQr(lobby);
    })();
    return () => {
      alive = false;
    };
  }, [property.id, property.lobbyMarkerId, property.roomTokens]);

  function download(src: string, label: string) {
    const a = document.createElement("a");
    a.href = src;
    a.download = `${property.name.toLowerCase().replace(/\s+/g, "-")}-${label.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="text-[13px] text-mute">
        Print the lobby code plus each room that has a live token. Codes use this property’s Firestore room map — no demo
        rooms.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col rounded-[28px] bg-card/90 p-5 text-center ring-1 ring-line shadow-sm">
          <p className="font-display text-lg font-semibold">{property.name} lobby</p>
          <p className="mt-1 text-xs text-mute">Entrance / reception scan</p>
          {lobbyQr ? (
            <img src={lobbyQr} alt="" className="mx-auto mt-3 h-48 w-48 rounded-xl ring-1 ring-line" />
          ) : (
            <div className="mx-auto mt-3 h-48 w-48 animate-pulse rounded-xl bg-paper" />
          )}
          <Button variant="ghost" className="mt-4 w-full" disabled={!lobbyQr} onClick={() => lobbyQr && download(lobbyQr, "lobby")}>
            Download PNG
          </Button>
        </article>
        {rooms.length === 0 ? (
          <article className="flex flex-col justify-center rounded-[28px] bg-card/90 p-5 text-center ring-1 ring-line shadow-sm">
            <p className="font-display text-lg font-semibold">No room tokens yet</p>
            <p className="mt-1 text-sm text-mute">Room QRs appear here once this stay has live room tokens in the database.</p>
          </article>
        ) : (
          rooms.map(([token, room]) => (
            <article key={token} className="flex flex-col rounded-[28px] bg-card/90 p-5 text-center ring-1 ring-line shadow-sm">
              <p className="font-display text-lg font-semibold">Room {room}</p>
              <p className="mt-1 text-xs text-mute">Guest companion for this room</p>
              {codes[token] ? (
                <img src={codes[token]} alt="" className="mx-auto mt-3 h-48 w-48 rounded-xl ring-1 ring-line" />
              ) : (
                <div className="mx-auto mt-3 h-48 w-48 animate-pulse rounded-xl bg-paper" />
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={!codes[token]}
                  onClick={() => codes[token] && download(codes[token], `room-${room}`)}
                >
                  Download
                </Button>
                {liveBackendEnabled() && (
                  <Button
                    variant="ghost"
                    className="flex-1"
                    disabled={rotating === room}
                    onClick={() => {
                      setRotating(room);
                      void rotateRoomTokenRemote({ propertyId: property.id, roomNumber: room })
                        .then(() => toast.success(`Room ${room} token rotated`))
                        .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn’t rotate"))
                        .finally(() => setRotating(null));
                    }}
                  >
                    {rotating === room ? "…" : "Rotate"}
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
