
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),

  {
    files: ["**/*.{js,jsx}"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    rules: {
      // base JS rules
      ...js.configs.recommended.rules,

      // react hooks rules
      ...reactHooks.configs.recommended.rules,

      // react refresh rules (vite)
      ...reactRefresh.configs.vite.rules,

      // your overrides
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      "no-use-before-define": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);

