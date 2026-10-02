/** Routes the native app may open before an account exists. */
const PUBLIC_PREFIXES = [
  "/start",
  "/privacy",
  "/terms",
  "/cookies",
  "/contact",
  "/assist",
  "/about",
  "/legal",
  "/auth/action",
  "/getAirPalApp",
];

export function isNativeAuthPublicPath(path: string): boolean {
  const pathname = (path.split("?")[0] || "/").trim() || "/";
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
