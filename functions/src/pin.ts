import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { pinIsWellFormed } from "../../shared/airpal-security";

export function hashPin(pin: string): string {
  const normalized = pin.trim();
  if (!pinIsWellFormed(normalized)) {
    throw new Error("PIN must be 4-8 digits");
  }
  const salt = randomBytes(16);
  const hash = scryptSync(normalized, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (!pinIsWellFormed(pin) || !stored) return false;
  const [alg, saltHex, hashHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const hash = scryptSync(pin.trim(), Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(hashHex, "hex");
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}
