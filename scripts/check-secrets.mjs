import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Build output and third-party/tool dirs mirror source or carry placeholders — never scan them.
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "android",
  "ios",
  "test-results",
  "playwright-report",
  ".firebase",
  "functions/node_modules",
  "functions/lib",
]);

// High-confidence live-secret shapes only. Firebase web API keys (AIza…)
// are public-by-design client config and are intentionally NOT flagged.
const PATTERNS = [
  [/sk_live_[A-Za-z0-9]+/, "Stripe live secret key"],
  [/whsec_[A-Za-z0-9]+/, "Stripe webhook signing secret"],
  [/xoxb-[0-9A-Za-z-]+/, "Slack bot token"],
  [/AKIA[0-9A-Z]{16}/, "AWS access key id"],
  [/ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+/, "GitHub token"],
  [/-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/, "private key block"],
  [/"private_key"\s*:\s*"-----BEGIN/, "service-account private_key"],
];

// Placeholder/doc redactions that must never fail the gate.
const PLACEHOLDER_RE = /xxx|replace_with|example|placeholder|your[_-]?key|test[_-]?mode|sk_test_…/i;

const problems = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(root, full);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(rel)) walk(full);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|cjs|json|yaml|yml|toml|env|md|txt|html)$/.test(entry)) continue;
    if (entry === "package-lock.json") continue;
    let text;
    try {
      text = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (PLACEHOLDER_RE.test(line)) return;
      for (const [re, label] of PATTERNS) {
        if (re.test(line)) problems.push(`${rel}:${i + 1} — possible ${label}`);
      }
    });
  }
}

walk(root);

// .env must stay git-ignored so local secrets never reach the repo.
const gitignore = existsSync(join(root, ".gitignore")) ? readFileSync(join(root, ".gitignore"), "utf8") : "";
if (!/^\.env$/m.test(gitignore)) problems.push(".gitignore must ignore .env");

if (problems.length) {
  console.error("Secrets check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Secrets check passed.");
