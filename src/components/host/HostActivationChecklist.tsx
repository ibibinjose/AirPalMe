import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Check, Printer, QrCode, Wifi } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { freshnessOf } from "@shared/freshness";

export const WIFI_SAVED_AT_PREFIX = "airpal.host.wifiSavedAt.";
const TEST_SCAN_PREFIX = "airpal.host.testScan.";

function loadFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function saveFlag(key: string, value: boolean) {
  try {
    if (value) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Record when the host saves live Wi-Fi (freshness SLA input). */
export function stampWifiSavedAt(propertyId: string) {
  try {
    localStorage.setItem(WIFI_SAVED_AT_PREFIX + propertyId, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export function wifiSavedAt(propertyId: string): string | null {
  try {
    return localStorage.getItem(WIFI_SAVED_AT_PREFIX + propertyId);
  } catch {
    return null;
  }
}

/**
 * Activation checklist: place listed → live Wi-Fi set → QRs printed →
 * test scan done. Each completed step emits host_activation once per device.
 */
export function HostActivationChecklist({
  propertyId,
  propertyName,
  wifiSet,
  qrReady,
  wifiUpdatedAt,
}: {
  propertyId: string;
  propertyName: string;
  wifiSet: boolean;
  qrReady: boolean;
  wifiUpdatedAt?: string | null;
}) {
  const [, nav] = useLocation();
  const [testScan, setTestScan] = useState(() => loadFlag(TEST_SCAN_PREFIX + propertyId));
  const emittedRef = useRef<Set<string>>(new Set());

  const wifiAt = wifiUpdatedAt || wifiSavedAt(propertyId);
  const steps = [
    {
      id: "place_listed",
      label: "Place listed",
      detail: propertyName,
      done: true,
      icon: Check,
    },
    {
      id: "wifi_live",
      label: "Live Wi-Fi set",
      detail: wifiSet
        ? freshnessOf(wifiAt, "wifi").stale
          ? freshnessOf(wifiAt, "wifi").hostNudge
          : freshnessOf(wifiAt, "wifi").confirmedLabel
        : "Guests see “ask the desk” until this is set",
      done: wifiSet,
      action: null,
      actionLabel: "",
      icon: Wifi,
    },
    {
      id: "qr_printed",
      label: "QRs printed",
      detail: qrReady ? "Room + lobby codes generated" : "Open Print to generate codes",
      done: qrReady,
      action: null,
      actionLabel: "",
      icon: Printer,
    },
    {
      id: "test_scan",
      label: "Test scan done",
      detail: testScan ? "Guest loop verified on-device" : "Scan a printed QR with your phone",
      done: testScan,
      action: null,
      actionLabel: "",
      icon: QrCode,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const doneIds = steps
    .filter((s) => s.done)
    .map((s) => s.id)
    .join(",");
  useEffect(() => {
    for (const s of steps) {
      if (!s.done || emittedRef.current.has(s.id)) continue;
      emittedRef.current.add(s.id);
      void track("host_activation", { tenantId: propertyId, activationStep: s.id, contextId: propertyId });
    }
  }, [doneIds, propertyId]);

  return (
    <section aria-label="Activation checklist" className="rounded-3xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Get live</p>
          <h2 className="font-display text-lg font-semibold">
            {doneCount}/{steps.length} ready
          </h2>
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-line/60">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }}
          />
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1",
              s.done ? "bg-emerald-500/5 ring-emerald-500/20" : "bg-paper ring-line",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1",
                s.done ? "bg-emerald-500 text-white ring-transparent" : "bg-card text-mute ring-line",
              )}
            >
              {s.done ? <Check size={15} /> : <s.icon size={15} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="truncate text-xs text-mute">{s.detail}</p>
            </div>
            {s.id === "test_scan" && !testScan && (
              <button
                type="button"
                onClick={() => {
                  setTestScan(true);
                  saveFlag(TEST_SCAN_PREFIX + propertyId, true);
                  nav(`/g/${propertyId}`);
                }}
                className="h-9 shrink-0 rounded-full bg-brand px-3.5 text-xs font-semibold text-white"
              >
                Open guest view
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
