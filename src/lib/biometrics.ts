export type BiometricType = "face_id" | "touch_id" | "windows_hello" | "fingerprint" | "passkey";

export interface EnrolledBiometric {
  credentialId: string;
  uid: string;
  email?: string;
  phone?: string;
  displayName?: string;
  handle?: string;
  enrolledAt: string;
  biometricType: BiometricType;
}

const STORAGE_KEY = "airpal_biometric_credential_v1";

/**
 * Detect the platform-specific name for biometrics (e.g. Face ID vs Touch ID vs Fingerprint).
 */
export function getBiometricType(): BiometricType {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "passkey";
  const ua = navigator.userAgent || "";
  const isApple = /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows/i.test(ua);

  if (isIOS) {
    // Modern iPhones (iPhone X+) use Face ID by default
    return "face_id";
  }
  if (isApple) {
    return "touch_id";
  }
  if (isAndroid) {
    return "fingerprint";
  }
  if (isWindows) {
    return "windows_hello";
  }
  return "passkey";
}

export function getBiometricLabel(type: BiometricType = getBiometricType()): string {
  switch (type) {
    case "face_id":
      return "Face ID";
    case "touch_id":
      return "Touch ID";
    case "windows_hello":
      return "Windows Hello";
    case "fingerprint":
      return "Fingerprint";
    case "passkey":
    default:
      return "Passkey / Biometrics";
  }
}

/**
 * Check if the current browser/device supports WebAuthn platform biometrics.
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(available);
    }
    return Boolean(navigator.credentials);
  } catch {
    return false;
  }
}

/**
 * Convert URL-safe base64 string to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  let standard = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (standard.length % 4) {
    standard += "=";
  }
  const binary = atob(standard);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Retrieve the enrolled biometric credential on this device.
 */
export function getEnrolledBiometrics(): EnrolledBiometric | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EnrolledBiometric;
  } catch {
    return null;
  }
}

export function hasEnrolledBiometrics(): boolean {
  return Boolean(getEnrolledBiometrics());
}

/**
 * Remove enrolled biometrics from this device.
 */
export function removeBiometrics(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Enroll Face ID / Touch ID on this device for the signed-in user.
 */
export async function enrollBiometrics(user: {
  uid: string;
  email?: string;
  phone?: string;
  displayName?: string;
  handle?: string;
}): Promise<EnrolledBiometric> {
  const supported = await isBiometricsSupported();
  if (!supported) {
    throw new Error("Biometric authentication (Face ID / Passkey) is not supported on this browser or device.");
  }

  const challenge = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(challenge);
  } else {
    for (let i = 0; i < 32; i++) challenge[i] = Math.floor(Math.random() * 256);
  }

  const userId = new TextEncoder().encode(user.uid);
  const rpName = "AirPal.me";
  const hostname = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "airpal.me";

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: rpName,
      id: hostname === "localhost" ? undefined : hostname,
    },
    user: {
      id: userId,
      name: user.email || user.phone || user.handle || user.uid,
      displayName: user.displayName || user.handle || "AirPal Member",
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
    attestation: "none",
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  })) as PublicKeyCredential | null;

  if (!credential || !credential.id) {
    throw new Error("Biometric scan was not completed.");
  }

  const bioType = getBiometricType();
  const enrolled: EnrolledBiometric = {
    credentialId: credential.id,
    uid: user.uid,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    handle: user.handle,
    enrolledAt: new Date().toISOString(),
    biometricType: bioType,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enrolled));
  } catch {
    /* ignore */
  }

  return enrolled;
}

/**
 * Verify Face ID / Touch ID on this device and return the authenticated user record.
 */
export async function authenticateWithBiometrics(): Promise<EnrolledBiometric> {
  const enrolled = getEnrolledBiometrics();
  if (!enrolled) {
    throw new Error("No Face ID or biometrics registered on this device yet. Please sign in once and enable Face ID.");
  }

  const supported = await isBiometricsSupported();
  if (!supported) {
    throw new Error("Biometric authentication is not supported on this browser.");
  }

  const challenge = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(challenge);
  } else {
    for (let i = 0; i < 32; i++) challenge[i] = Math.floor(Math.random() * 256);
  }

  const hostname = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "airpal.me";
  const rawId = base64ToBuffer(enrolled.credentialId);

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: hostname === "localhost" ? undefined : hostname,
    allowCredentials: [
      {
        id: rawId,
        type: "public-key",
        transports: ["internal"],
      },
    ],
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  })) as PublicKeyCredential | null;

  if (!assertion || !assertion.id) {
    throw new Error("Biometric verification was cancelled or failed.");
  }

  return enrolled;
}
