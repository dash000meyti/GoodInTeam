import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Contrast guard (spec §19 risk 2): the bright fills #FFC50D, #F76B15,
 * #22C55E and #00B8D9 fail as text on light surfaces. Forbid
 * `text-primary|warning|success|info` (bare or `/alpha`) under any variant
 * except `dark:`; use the -ink tokens (text-primary-ink, text-warning-ink,
 * text-success-ink, text-info-ink). A bright colour kept on a surface that is
 * dark in both modes uses the arbitrary form `text-[color:var(--primary)]`.
 */
const BRIGHT_TEXT =
  "/(?<!dark:(?:[\\w-]+:)*)\\b(?:(?!dark:)[\\w-]+:)*text-(?:primary|warning|success|info)(?![\\w-])/";
const BRIGHT_TEXT_MESSAGE =
  "Bright text tokens fail contrast on light surfaces. Use text-primary-ink / text-warning-ink / text-success-ink / text-info-ink (or dark:text-…), or text-[color:var(--…)] on a surface that is dark in both modes.";

/**
 * Update-schema guard (docs/conventions.md → "Forms"): zod 4 keeps `.default()`
 * inside `.partial()`, so `createInput.partial()` resets every omitted field
 * that has a default (a title-only update wiped page bodies). Forbid
 * `.partial()` on a create schema (`somethingInput`), directly or after one
 * derived step (`somethingInput.extend(…).partial()`, `.omit(…)`, `.pick(…)`).
 * `src/server/modules/update-schemas.test.ts` proves the result at runtime.
 */
const PARTIAL_OF_INPUT = [
  'CallExpression[callee.property.name="partial"][callee.object.name=/Input$/]',
  'CallExpression[callee.property.name="partial"][callee.object.callee.object.name=/Input$/]',
];
const PARTIAL_OF_INPUT_MESSAGE =
  "Never build an update schema with .partial() of a create schema: zod 4 keeps .default() inside .partial(), so a partial update resets every omitted field that has a default. Declare the fields once without defaults (const thingFields = z.object({…})), add the defaults in the create schema and use thingFields.partial().extend({ id: zId }) for updates. See docs/conventions.md → Forms.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // One rule, one options list: a second `no-restricted-syntax` entry for the
      // same files would REPLACE this one, not add to it.
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${BRIGHT_TEXT}]`, message: BRIGHT_TEXT_MESSAGE },
        { selector: `TemplateElement[value.raw=${BRIGHT_TEXT}]`, message: BRIGHT_TEXT_MESSAGE },
        ...PARTIAL_OF_INPUT.map((selector) => ({ selector, message: PARTIAL_OF_INPUT_MESSAGE })),
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local agent worktrees & runtime data
    ".claude/**",
    "data/**",
  ]),
]);

export default eslintConfig;
