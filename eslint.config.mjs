import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:prettier/recommended",
  ),
  {
    plugins: {},
    rules: {
      complexity: ["warn", { max: 10 }],
      // Honor the underscore-prefix "intentionally unused" convention that the
      // ported design components rely on (e.g. NEEDS-KEY scaffolding params
      // like navLabel(en, _es), _lang, _profileText). next/typescript enables
      // no-unused-vars without ignore patterns, so add the standard ones here.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
