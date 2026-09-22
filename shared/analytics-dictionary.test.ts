import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_NAMES, EVENT_PROPERTY_ALLOWLIST, SENSITIVE_PROPERTY_KEYS } from "./analytics";

const DICTIONARY_URL = new URL("../docs/analytics-event-dictionary.md", import.meta.url);
const dictionary = readFileSync(DICTIONARY_URL, "utf8");

/**
 * The event dictionary is the human-readable mirror of the typed contract.
 * If this test fails, update docs/analytics-event-dictionary.md in the same
 * change as shared/analytics.ts.
 */
describe("analytics event dictionary coverage", () => {
  it("documents every event in the contract", () => {
    const missing = ANALYTICS_EVENT_NAMES.filter((name) => !dictionary.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });

  it("documents every required property key", () => {
    const required = new Set<string>();
    for (const entry of Object.values(EVENT_PROPERTY_ALLOWLIST)) {
      for (const key of entry.required) required.add(key);
    }
    const missing = [...required].filter((key) => !dictionary.includes(`\`${key}\``));
    expect(missing).toEqual([]);
  });

  it("lists every sensitive key as forbidden", () => {
    const forbiddenSection = dictionary.split("## Forbidden in properties")[1]?.split("##")[0] || "";
    const missing = SENSITIVE_PROPERTY_KEYS.filter((key) => !forbiddenSection.includes(`\`${key}\``));
    expect(missing).toEqual([]);
  });
});
