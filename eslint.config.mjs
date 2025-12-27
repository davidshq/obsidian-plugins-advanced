import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import globals from "globals";
import obsidian from "eslint-plugin-obsidianmd";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      obsidian,
    },
    rules: {
      // TypeScript ESLint rules
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Obsidian-specific rules (from eslint-plugin-obsidianmd)
      // Prefer instanceof checks over type casts for TFile/TFolder
      "obsidian/no-tfile-tfolder-cast": "warn",
      // Avoid referencing views directly in plugin code
      "obsidian/no-view-references-in-plugin": "warn",
      // Prefer CSS classes over inline styles for better theming
      "obsidian/no-static-styles-assignment": "warn",
      // Command naming and hotkey best practices
      "obsidian/commands/no-default-hotkeys": "warn",
      "obsidian/commands/no-command-in-command-id": "warn",
      "obsidian/commands/no-plugin-id-in-command-id": "warn",
    },
  },
  {
    files: ["scripts/**/*.js", "tests/**/*.ts", "vitest.config.mts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off", // Allow console in scripts and tests
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Allow any in tests for mocking
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "main.js", "*.mjs"],
  },
];
