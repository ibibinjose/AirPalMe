const WORKSPACE = [
  /^\/host/,
  /^\/start/,
  /^\/admin/,
  /^\/partners/,
  /^\/join/,
  /^\/business/,
  // Exact-segment match: the organiser console (/event, /event/new) is a
  // workspace, but the guest feed (/events) keeps full app chrome.
  /^\/event(\/|$)/,
  // Pulse hub (/pulse) renders full chrome. Only anonymous public rating
  // links (/pulse/:token) stay minimal.
  /^\/pulse\/.+/,
  /^\/me\/memories/,
  /^\/settings/,
  /^\/bio/,
  /^\/about/,
  /^\/contact/,
  /^\/privacy/,
  /^\/terms/,
  /^\/cookies/,
  /^\/legal/,
];

/** Minimal-chrome workspace routes: compact header, no tab bar, no footer. */
export function isWorkspacePath(path: string): boolean {
  return WORKSPACE.some((re) => re.test(path));
}
