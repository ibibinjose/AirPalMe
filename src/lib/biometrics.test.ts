import { describe, it, expect, beforeEach } from "vitest";
import {
  getBiometricType,
  getBiometricLabel,
  getEnrolledBiometrics,
  hasEnrolledBiometrics,
  removeBiometrics,
  type EnrolledBiometric,
} from "./biometrics";

// Mock localStorage for test environment
class LocalStorageMock {
  store: Record<string, string> = {};
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = new LocalStorageMock() as unknown as Storage;
}

describe("biometrics helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("detects biometric type and label", () => {
    const type = getBiometricType();
    expect(["face_id", "touch_id", "windows_hello", "fingerprint", "passkey"]).toContain(type);

    expect(getBiometricLabel("face_id")).toBe("Face ID");
    expect(getBiometricLabel("touch_id")).toBe("Touch ID");
    expect(getBiometricLabel("windows_hello")).toBe("Windows Hello");
    expect(getBiometricLabel("fingerprint")).toBe("Fingerprint");
    expect(getBiometricLabel("passkey")).toBe("Passkey / Biometrics");
  });

  it("manages biometric enrollment state in storage", () => {
    expect(hasEnrolledBiometrics()).toBe(false);
    expect(getEnrolledBiometrics()).toBeNull();

    const sample: EnrolledBiometric = {
      credentialId: "cred-12345",
      uid: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      enrolledAt: new Date().toISOString(),
      biometricType: "face_id",
    };

    localStorage.setItem("airpal_biometric_credential_v1", JSON.stringify(sample));
    expect(hasEnrolledBiometrics()).toBe(true);
    expect(getEnrolledBiometrics()?.email).toBe("test@example.com");

    removeBiometrics();
    expect(hasEnrolledBiometrics()).toBe(false);
    expect(getEnrolledBiometrics()).toBeNull();
  });
});
