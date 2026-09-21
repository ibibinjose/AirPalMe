/** Firestore rejects `undefined`. Drop those keys (and nested ones) before setDoc. */
export function omitUndefinedDeep<T>(value: T): T {
  if (value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)).filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const out: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (nested === undefined) continue;
        out[key] = omitUndefinedDeep(nested);
      }
      return out as T;
    }
  }
  return value;
}
