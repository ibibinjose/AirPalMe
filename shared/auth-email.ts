/** Path Firebase Auth emails should open (set as the console action URL). */
export const AUTH_ACTION_PATH = "/auth/action";

export type AuthActionMode = "verifyEmail" | "resetPassword" | "recoverEmail" | "signIn" | "unknown";

export type AuthActionQuery = {
  mode: AuthActionMode;
  oobCode: string;
  continueUrl: string | null;
  lang: string | null;
};

const MODES = new Set<AuthActionMode>(["verifyEmail", "resetPassword", "recoverEmail", "signIn"]);

export function parseAuthActionSearch(search: string): AuthActionQuery {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const modeRaw = params.get("mode") || "";
  const mode: AuthActionMode = MODES.has(modeRaw as AuthActionMode) ? (modeRaw as AuthActionMode) : "unknown";
  return {
    mode,
    oobCode: (params.get("oobCode") || "").trim(),
    continueUrl: params.get("continueUrl"),
    lang: params.get("lang"),
  };
}

export function authActionContinueUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/start?tab=signin`;
}

export function authActionHandlerUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}${AUTH_ACTION_PATH}`;
}

/** Same-origin continue URLs only — email links can be rewritten. */
export function safeContinuePath(raw: string | null | undefined, origin: string) {
  const fallback = "/start?tab=signin";
  if (!raw) return fallback;
  try {
    const base = origin.replace(/\/$/, "");
    const url = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL(raw, `${base}/`);
    if (url.origin !== new URL(base).origin) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/") ? path : fallback;
  } catch {
    return fallback;
  }
}

export function authErrorCode(err: unknown): string {
  if (typeof err === "object" && err && "code" in err) {
    const code = String((err as { code: unknown }).code || "");
    if (code.startsWith("auth/")) return code;
  }
  const message = err instanceof Error ? err.message : String(err || "");
  const match = message.match(/auth\/[a-z0-9-]+/i);
  return match ? match[0].toLowerCase() : "";
}

export function authErrorMessage(err: unknown, fallback = "Failed"): string {
  switch (authErrorCode(err)) {
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Need a real email";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password does not match";
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in with email, or use another address.";
    case "auth/requires-recent-login":
      return "Confirm your mobile number again, then save.";
    case "auth/weak-password":
      return "At least 8 characters";
    case "auth/too-many-requests":
      return "Too many tries. Wait a minute.";
    case "auth/expired-action-code":
      return "This link has expired. Request a new one.";
    case "auth/invalid-action-code":
    case "auth/missing-oob-code":
      return "This link is invalid or already used. Request a new one.";
    case "auth/user-disabled":
      return "This account is disabled.";
    case "auth/network-request-failed":
      return "Network failed. Try again.";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Need a real mobile number with country code";
    case "auth/invalid-verification-code":
    case "auth/missing-verification-code":
      return "That code is not right";
    case "auth/code-expired":
    case "auth/session-expired":
      return "That code expired. Request a new one.";
    case "auth/captcha-check-failed":
      return "Could not verify you are human. Refresh and try again.";
    case "auth/quota-exceeded":
      return "SMS is paused for this number. Try again later.";
    case "auth/billing-not-enabled":
      return "This Firebase project must be on the Blaze plan to send SMS.";
    case "auth/invalid-app-credential":
    case "auth/missing-client-identifier":
      return "Phone verification failed the security check. Refresh and try again.";
    case "auth/credential-already-in-use":
      return "That mobile number is already on another account.";
    case "auth/provider-already-linked":
      return "This account already has a mobile number. Change it, or remove it first.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is blocked for this number or region. On localhost use a Firebase test number.";
    default:
      if (err instanceof Error && err.message && !err.message.startsWith("Firebase:")) return err.message;
      return fallback;
  }
}

export type AuthEmailKind = "verify" | "reset";

export type AuthEmailInput = {
  name?: string;
  email?: string;
  link: string;
  site?: string;
  fromEmail?: string;
};

export type AuthEmail = {
  kind: AuthEmailKind;
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

const BRAND = {
  site: "https://airpal.me",
  name: "AirPal.me",
  ink: "#121614",
  mute: "#6a726c",
  paper: "#f3f0e8",
  card: "#fffcf7",
  brand: "#1805db",
  gold: "#b8893a",
  from: "noreply@email.airpal.me",
} as const;

function escapeHtml(raw: string) {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function greetingName(name?: string) {
  const trimmed = (name || "").trim();
  if (!trimmed || trimmed.includes("@")) return "";
  return trimmed.split(/\s+/)[0] || "";
}

function wrapEmail(input: {
  title: string;
  preheader: string;
  kicker: string;
  heading: string;
  body: string[];
  ctaLabel: string;
  link: string;
  fine: string;
  site: string;
}): string {
  const link = input.link;
  const site = input.site.replace(/\/$/, "");
  const paragraphs = input.body
    .map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:${BRAND.ink};">${p}</p>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding:0 8px 20px;font-family:Georgia, 'Times New Roman', serif;font-size:22px;font-weight:700;letter-spacing:-0.03em;color:${BRAND.ink};">
              AirPal<span style="color:${BRAND.brand};">.me</span>
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.card};border:1px solid #e4e0d6;border-radius:24px;padding:28px 28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.gold};">${escapeHtml(input.kicker)}</p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;letter-spacing:-0.03em;color:${BRAND.ink};">${escapeHtml(input.heading)}</h1>
              ${paragraphs}
              <p style="margin:24px 0;">
                <a href="${escapeHtml(link)}" style="display:inline-block;background:${BRAND.brand};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:1;padding:14px 22px;border-radius:999px;">${escapeHtml(input.ctaLabel)}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.mute};word-break:break-all;">If the button does not work, paste this link:<br /><a href="${escapeHtml(link)}" style="color:${BRAND.brand};">${escapeHtml(link)}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.mute};">
              ${escapeHtml(input.fine)}<br />
              <a href="${escapeHtml(site)}" style="color:${BRAND.brand};">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>
              · New South Wales, Australia
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function accountVerificationEmail(input: AuthEmailInput): AuthEmail {
  const site = input.site || BRAND.site;
  const first = greetingName(input.name);
  const heading = first ? `${first}, confirm your email` : "Confirm your email";
  const subject = "Confirm your AirPal.me email";
  const preheader = "One tap to confirm this address for your AirPal.me account.";
  const body = [
    first ? `Hi ${escapeHtml(first)},` : "Hi,",
    "Confirm this address so we know it is yours. Then you can sign in, keep a personal @handle, and reset the password if you need to.",
    input.email
      ? `This email was sent to ${escapeHtml(input.email)}.`
      : "If you did not create an AirPal.me account, ignore this email.",
  ];
  if (input.email) body.push("If you did not create an AirPal.me account, ignore this email.");
  const html = wrapEmail({
    title: subject,
    preheader,
    kicker: "Account",
    heading,
    body,
    ctaLabel: "Confirm email",
    link: input.link,
    fine: "AirPal.me sends this only when you create an account, or when you ask us to resend it.",
    site,
  });
  const text = [
    heading,
    "",
    first ? `Hi ${first},` : "Hi,",
    "Confirm this address so we know it is yours.",
    "",
    `Confirm email: ${input.link}`,
    "",
    input.email ? `Sent to ${input.email}.` : "",
    "If you did not create an AirPal.me account, ignore this email.",
    "",
    site,
  ]
    .filter((line) => line !== "")
    .join("\n");
  return { kind: "verify", subject, preheader, html, text };
}

export function passwordResetEmail(input: AuthEmailInput): AuthEmail {
  const site = input.site || BRAND.site;
  const first = greetingName(input.name);
  const heading = "Reset your password";
  const subject = "Reset your AirPal.me password";
  const preheader = "Use this link to choose a new password. It expires soon.";
  const body = [
    first ? `Hi ${escapeHtml(first)},` : "Hi,",
    "Someone asked to reset the password on this AirPal.me account. The link expires after a short time and can be used once.",
    input.email
      ? `This email was sent to ${escapeHtml(input.email)}.`
      : "If you did not ask for a reset, you can ignore this email. Your password stays the same.",
  ];
  if (input.email)
    body.push("If you did not ask for a reset, you can ignore this email. Your password stays the same.");
  const html = wrapEmail({
    title: subject,
    preheader,
    kicker: "Password",
    heading,
    body,
    ctaLabel: "Choose a new password",
    link: input.link,
    fine: "AirPal.me sends this only when someone uses Forgot password on the sign-in page.",
    site,
  });
  const text = [
    heading,
    "",
    first ? `Hi ${first},` : "Hi,",
    "Someone asked to reset the password on this AirPal.me account.",
    "",
    `Choose a new password: ${input.link}`,
    "",
    input.email ? `Sent to ${input.email}.` : "",
    "If you did not ask for a reset, ignore this email. Your password stays the same.",
    "",
    site,
  ]
    .filter((line) => line !== "")
    .join("\n");
  return { kind: "reset", subject, preheader, html, text };
}

/** Inner HTML for Firebase Console Authentication → Templates (%LINK%, %DISPLAY_NAME%, %EMAIL%). */
export function firebaseConsoleTemplate(kind: AuthEmailKind): { subject: string; html: string; text: string } {
  const email =
    kind === "verify"
      ? accountVerificationEmail({
          name: "%DISPLAY_NAME%",
          email: "%EMAIL%",
          link: "%LINK%",
        })
      : passwordResetEmail({
          name: "%DISPLAY_NAME%",
          email: "%EMAIL%",
          link: "%LINK%",
        });
  return { subject: email.subject, html: email.html, text: email.text };
}
