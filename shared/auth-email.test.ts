import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  accountVerificationEmail,
  authActionContinueUrl,
  authActionHandlerUrl,
  authErrorCode,
  authErrorMessage,
  firebaseConsoleTemplate,
  parseAuthActionSearch,
  passwordResetEmail,
  safeContinuePath,
} from "./auth-email";

describe("auth action links", () => {
  it("parses verify, reset, and recover query strings", () => {
    const verify = parseAuthActionSearch(
      "?mode=verifyEmail&oobCode=abc123&continueUrl=https%3A%2F%2Fairpal.me%2Fstart&lang=en",
    );
    expect(verify.mode).toBe("verifyEmail");
    expect(verify.oobCode).toBe("abc123");
    expect(verify.continueUrl).toBe("https://airpal.me/start");

    const reset = parseAuthActionSearch("mode=resetPassword&oobCode=xyz");
    expect(reset.mode).toBe("resetPassword");
    expect(reset.oobCode).toBe("xyz");

    expect(parseAuthActionSearch("mode=nope&oobCode=").mode).toBe("unknown");
    expect(parseAuthActionSearch("").oobCode).toBe("");
  });

  it("keeps continue URLs on the same origin", () => {
    expect(safeContinuePath("https://airpal.me/me", "https://airpal.me")).toBe("/me");
    expect(safeContinuePath("/start?tab=signin", "https://airpal.me")).toBe("/start?tab=signin");
    expect(safeContinuePath("https://evil.example/phish", "https://airpal.me")).toBe("/start?tab=signin");
    expect(safeContinuePath(null, "https://airpal.me")).toBe("/start?tab=signin");
  });

  it("builds handler and continue URLs", () => {
    expect(authActionHandlerUrl("https://airpal.me/")).toBe("https://airpal.me/auth/action");
    expect(authActionContinueUrl("https://airpal.me")).toBe("https://airpal.me/start?tab=signin");
  });
});

describe("auth error copy", () => {
  it("maps Firebase codes without leaking whether an email exists on reset-style errors", () => {
    expect(authErrorCode({ code: "auth/invalid-action-code" })).toBe("auth/invalid-action-code");
    expect(authErrorMessage({ code: "auth/expired-action-code" })).toMatch(/expired/i);
    expect(authErrorMessage({ code: "auth/email-already-in-use" })).toMatch(/already has an account/i);
    expect(authErrorMessage(new Error("Firebase: Error (auth/wrong-password)."))).toBe(
      "Email or password does not match",
    );
    expect(authErrorMessage({ code: "auth/operation-not-allowed" })).toMatch(/not enabled/i);
    expect(authErrorMessage({ code: "auth/popup-closed-by-user" })).toMatch(/cancelled/i);
    expect(authErrorMessage(new Error("Sign-in needs Firebase."))).toBe("Sign-in needs Firebase.");
  });
});

describe("account emails", () => {
  it("builds a verification email with a confirm link and a text part", () => {
    const mail = accountVerificationEmail({
      name: "Bibin Jose",
      email: "bibin@example.com",
      link: "https://airpal.me/auth/action?mode=verifyEmail&oobCode=test",
    });
    expect(mail.subject).toBe("Confirm your AirPal.me email");
    expect(mail.html).toContain("Confirm email");
    expect(mail.html).toContain("https://airpal.me/auth/action?mode=verifyEmail&amp;oobCode=test");
    expect(mail.html).toContain("Bibin");
    expect(mail.html).not.toContain("<script");
    expect(mail.text).toContain("Confirm email:");
    expect(mail.text).toContain("https://airpal.me/auth/action?mode=verifyEmail&oobCode=test");
    expect(mail.text).toContain("bibin@example.com");
  });

  it("escapes names in HTML", () => {
    const mail = accountVerificationEmail({
      name: `<img src=x onerror=alert(1)>`,
      link: "https://airpal.me/auth/action",
    });
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
  });

  it("builds a password reset email that does not change the password by itself", () => {
    const mail = passwordResetEmail({
      name: "Bibin",
      email: "bibin@example.com",
      link: "https://airpal.me/auth/action?mode=resetPassword&oobCode=test",
    });
    expect(mail.subject).toBe("Reset your AirPal.me password");
    expect(mail.html).toContain("Choose a new password");
    expect(mail.html).toMatch(/did not ask for a reset/i);
    expect(mail.text).toContain("Choose a new password:");
  });

  it("uses Firebase Console placeholders", () => {
    const verify = firebaseConsoleTemplate("verify");
    const reset = firebaseConsoleTemplate("reset");
    expect(verify.html).toContain("%LINK%");
    expect(verify.html).toContain("%DISPLAY_NAME%");
    expect(reset.html).toContain("%LINK%");
    expect(reset.text).toContain("%LINK%");
  });

  it("keeps paste-ready HTML templates in emails/", () => {
    const dir = path.resolve(import.meta.dirname, "../emails");
    const verify = readFileSync(path.join(dir, "verify-account.html"), "utf8");
    const reset = readFileSync(path.join(dir, "reset-password.html"), "utf8");
    expect(verify).toContain("%LINK%");
    expect(verify).toContain("Confirm email");
    expect(reset).toContain("%LINK%");
    expect(reset).toContain("Choose a new password");
  });
});
