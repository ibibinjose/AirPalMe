import { describe, expect, it } from "vitest";
import { formatDiagnosticsReport, getBuildInfo, getRuntimeDiagnostics } from "./build-info";

describe("build-info", () => {
  it("extracts build info with versionName and versionCode", () => {
    const info = getBuildInfo();
    expect(info).toBeDefined();
    expect(info.versionName).toBe("2.0.0");
    expect(info.versionCode).toBe("2");
    expect(["ios", "android", "web"]).toContain(info.platform);
  });

  it("gathers runtime diagnostics", () => {
    const diag = getRuntimeDiagnostics();
    expect(diag.versionName).toBe("2.0.0");
    expect(diag.versionCode).toBe("2");
    expect(typeof diag.online).toBe("boolean");
    expect(typeof diag.storageKeysCount).toBe("number");
  });

  it("formats markdown diagnostics report including versionName and build details", () => {
    const diag = getRuntimeDiagnostics();
    const report = formatDiagnosticsReport(diag);

    expect(report).toContain("AirPal Client Diagnostic Report");
    expect(report).toContain("Version Name (build.gradle)");
    expect(report).toContain("2.0.0");
    expect(report).toContain("Version Code");
    expect(report).toContain("2");
  });
});
