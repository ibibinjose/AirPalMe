import { execSync } from "node:child_process";

/**
 * Dependency security audit gate.
 * Enforces zero high or critical severity vulnerabilities across root and functions,
 * while accounting for documented upstream transitive dependencies where no patch exists yet.
 */

const ALLOWED_ADVISORY_URLS = new Set([
  // node-forge signature verification flaw (GHSA-86w9-cpqp-85rv / CVE-2026-85393).
  // Affects RSA PKCS#1 v1.5 verification with low public exponents.
  // AirPal uses passkit-generator solely for signing/generating Apple Wallet .pkpass files,
  // never for verifying external signatures. No upstream release exists yet.
  "https://github.com/advisories/GHSA-86w9-cpqp-85rv",
]);

function runAudit(cwd = ".") {
  try {
    const stdout = execSync("npm audit --json", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch (parseErr) {
        throw new Error(`Failed to parse npm audit JSON in ${cwd}: ${parseErr.message}`);
      }
    }
    throw err;
  }
}

function findUnallowedVulnerabilities(report, scope) {
  const issues = [];
  const vulns = report.vulnerabilities || {};

  for (const [pkg, details] of Object.entries(vulns)) {
    const severity = details.severity;
    if (severity !== "high" && severity !== "critical") continue;

    // Check if all underlying advisories are in the allowed set
    const viaList = Array.isArray(details.via) ? details.via : [];
    let isFullyAllowed = viaList.length > 0;

    for (const v of viaList) {
      if (typeof v === "string") {
        // Points to another vulnerability entry
        const parent = vulns[v];
        if (!parent || (parent.severity !== "high" && parent.severity !== "critical")) continue;
        const parentVia = Array.isArray(parent.via) ? parent.via : [];
        const parentAllowed = parentVia.every(
          (pv) => typeof pv === "object" && pv.url && ALLOWED_ADVISORY_URLS.has(pv.url),
        );
        if (!parentAllowed) isFullyAllowed = false;
      } else if (typeof v === "object" && v.url) {
        if (!ALLOWED_ADVISORY_URLS.has(v.url)) {
          isFullyAllowed = false;
        }
      } else {
        isFullyAllowed = false;
      }
    }

    if (!isFullyAllowed) {
      issues.push(`[${scope}] ${pkg} (${severity}): ${details.range || "unknown version"}`);
    }
  }

  return issues;
}

const rootIssues = findUnallowedVulnerabilities(runAudit("."), "root");
const fnIssues = findUnallowedVulnerabilities(runAudit("functions"), "functions");
const allIssues = [...rootIssues, ...fnIssues];

if (allIssues.length > 0) {
  console.error("Dependency audit failed with high/critical vulnerabilities:\n");
  for (const issue of allIssues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

console.log("Dependency audit check passed (0 actionable high/critical vulnerabilities).");
