import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import vuePlugin from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import prettierConfig from "eslint-config-prettier";

const browserGlobals = {
  chrome: "readonly",
  console: "readonly",
  document: "readonly",
  Element: "readonly",
  Event: "readonly",
  HTMLElement: "readonly",
  HTMLCanvasElement: "readonly",
  HTMLInputElement: "readonly",
  InputEvent: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  ParentNode: "readonly",
  setTimeout: "readonly",
  URLSearchParams: "readonly",
  URL: "readonly",
  window: "readonly",
};

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ["**/*.ts", "**/*.vue"],
    languageOptions: {
      parser: vueParser,
      globals: {
        ...browserGlobals,
        __dirname: "readonly",
      },
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      vue: vuePlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "vue/multi-word-component-names": "off",
      "no-console": "off",
    },
  },
  {
    files: ["mock-sites/**/*.js"],
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    files: ["agent-bridge/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
  {
    files: ["src/background/**/*.ts"],
    languageOptions: { globals: { clearTimeout: "readonly" } },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
