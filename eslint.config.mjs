import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Interface en français : les apostrophes et guillemets sont légitimes
    // dans le texte JSX, seuls > et } restent signalés (fautes de frappe).
    rules: {
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
    },
  },
]);

export default eslintConfig;
