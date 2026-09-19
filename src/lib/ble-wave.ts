import { AIRPAL_BLE_NAME, AIRPAL_BLE_SERVICE, waveCodeFrom } from "@shared/wave";

type BleNav = Navigator & {
  bluetooth?: {
    requestLEScan?: (opts: {
      filters?: Array<{ namePrefix?: string; services?: string[] }>;
      keepRepeatedDevices?: boolean;
    }) => Promise<{ stop: () => void }>;
    addEventListener?: (type: string, listener: (ev: unknown) => void) => void;
    removeEventListener?: (type: string, listener: (ev: unknown) => void) => void;
  };
};

export function canNfcWave(): boolean {
  return typeof window !== "undefined" && typeof window.NDEFReader === "function";
}

export function canBleScan(): boolean {
  if (typeof navigator === "undefined") return false;
  const ble = (navigator as BleNav).bluetooth;
  return Boolean(ble && typeof ble.requestLEScan === "function");
}

export async function writeWaveNfc(url: string): Promise<boolean> {
  if (!canNfcWave() || !window.NDEFReader) return false;
  const ndef = new window.NDEFReader();
  await ndef.write({ records: [{ recordType: "url", data: url }] });
  return true;
}

export async function listenWaveNfc(onUrl: (url: string) => void, signal?: AbortSignal): Promise<void> {
  if (!canNfcWave() || !window.NDEFReader) throw new Error("NFC isn’t available on this phone.");
  const ndef = new window.NDEFReader();
  const onReading = (ev: NDEFReadingEvent) => {
    for (const rec of ev.message.records) {
      if (rec.recordType !== "url" || !rec.data) continue;
      const text = new TextDecoder().decode(rec.data);
      if (text.includes("/w/")) onUrl(text);
    }
  };
  ndef.addEventListener("reading", onReading);
  await ndef.scan({ signal });
}

export async function listenWaveBle(onCode: (code: string) => void): Promise<() => void> {
  const ble = (navigator as BleNav).bluetooth;
  if (!ble?.requestLEScan) throw new Error("Bluetooth scan isn’t available here.");
  const scan = await ble.requestLEScan({
    filters: [{ namePrefix: AIRPAL_BLE_NAME }, { services: [AIRPAL_BLE_SERVICE] }],
    keepRepeatedDevices: true,
  });
  const onAdv = (ev: unknown) => {
    const adv = ev as { device?: { name?: string }; name?: string };
    const name = adv.device?.name || adv.name || "";
    const hit = name.match(/AirPal[- ]?([A-Z0-9]{4,8})/i);
    if (hit?.[1]) onCode(waveCodeFrom(hit[1]));
  };
  ble.addEventListener?.("advertisementreceived", onAdv);
  return () => {
    scan.stop();
    ble.removeEventListener?.("advertisementreceived", onAdv);
  };
}
