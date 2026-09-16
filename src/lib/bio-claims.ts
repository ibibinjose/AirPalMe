const KEY = "airpal.bio-claims.v1";

export type BioClaim = {
  handle: string;
  dealId: string;
  code: string;
  badge: string;
  detail: string;
  expiresAt: string;
};

function read(): BioClaim[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BioClaim[];
  } catch {
    return [];
  }
}

function write(rows: BioClaim[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function claimCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function loadClaim(handle: string, dealId: string) {
  const now = Date.now();
  return read().find((row) => row.handle === handle && row.dealId === dealId && new Date(row.expiresAt).getTime() > now);
}

export function saveClaim(row: BioClaim) {
  write([row, ...read().filter((r) => !(r.handle === row.handle && r.dealId === row.dealId))]);
  return row;
}
