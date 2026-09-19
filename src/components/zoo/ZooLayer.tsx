import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { parseAtHandle } from "@shared/bio";
import { zooStopForHandle, zooStopForPlaceId, type ZooHunt, type ZooHuntStop } from "@shared/zoo";
import { ZooSheet } from "@/components/zoo/ZooSheet";
import { useBio } from "@/contexts/BioContext";
import { fetchHunts, loadHunts } from "@/lib/hunts-store";

function stopFromPath(path: string, hunts: ZooHunt[], bioHandle?: string) {
  const at = parseAtHandle(path);
  if (at) return zooStopForHandle(at, hunts);
  const place = path.match(/^\/p\/([^/]+)/);
  if (place?.[1]) return zooStopForPlaceId(decodeURIComponent(place[1]), hunts);
  if (bioHandle) return zooStopForHandle(bioHandle, hunts);
  return null;
}

export function ZooLayer() {
  const [path] = useLocation();
  const { byHandle } = useBio();
  const [hunts, setHunts] = useState<ZooHunt[]>(() => loadHunts());
  const [sheet, setSheet] = useState<{ hunt: ZooHunt; stop: ZooHuntStop } | null>(null);
  const seen = useRef("");

  useEffect(() => {
    let alive = true;
    void fetchHunts().then((rows) => {
      if (alive) setHunts(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.sessionStorage?.getItem("airpal_disable_zoo") === "1" ||
        window.localStorage?.getItem("airpal_disable_zoo") === "1")
    ) {
      setSheet(null);
      return;
    }
    const hit = stopFromPath(path, hunts);
    if (!hit) {
      seen.current = "";
      setSheet(null);
      return;
    }
    const merchant = byHandle(hit.stop.handle);
    if (merchant && merchant.kind !== "person" && merchant.zooHunt === false) {
      setSheet(null);
      return;
    }
    const key = `${hit.hunt.id}:${hit.stop.handle}`;
    if (seen.current === key) return;
    const t = window.setTimeout(() => {
      seen.current = key;
      setSheet({ hunt: hit.hunt, stop: hit.stop });
    }, 700);
    return () => window.clearTimeout(t);
  }, [byHandle, hunts, path]);

  if (!sheet) return null;
  return <ZooSheet open hunt={sheet.hunt} stop={sheet.stop} onClose={() => setSheet(null)} />;
}
