const PREF_KEY = "airpal.host.ticketSound";

export function ticketSoundEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setTicketSoundEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(PREF_KEY);
    else localStorage.setItem(PREF_KEY, "0");
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null;

/** Short two-tone desk alarm. No audio file needed; safe to call repeatedly. */
export function playTicketAlarm() {
  try {
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    // Three short blasts: high-low-high, like a small desk pager.
    const blasts: Array<[number, number]> = [
      [880, 0],
      [659, 0.22],
      [880, 0.44],
    ];
    for (const [freq, at] of blasts) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.2);
    }
  } catch {
    /* Audio blocked (autoplay policy, private mode) — banner still shows. */
  }
}
