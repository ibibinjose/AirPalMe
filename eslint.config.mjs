import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "functions/lib/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "android/**",
      "ios/**",
      "e2e/**",
      "*.config.*",
      "*.config.*.*",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/screenshots.mjs"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly", fetch: "readonly", setTimeout: "readonly" },
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" },
    },
  },
  {
    rules: {
      // Pervasive in this codebase (Firestore docs, callable payloads); enforced via
      // shared validators and rules instead of the type system.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
);
