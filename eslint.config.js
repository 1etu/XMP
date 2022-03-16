import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "**/*.config.js",
      "**/*.config.ts",
      "**/e2e/**",
      "research/**",
      "resources/**",
      "assets/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-inline-comments": "error",
      "line-comment-position": ["error", { position: "beside" }],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date']",
          message: "Inject an Rtc instead of constructing Date directly.",
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "requestAnimationFrame",
          message: "The runtime owns the frame loop; take frames from it.",
        },
      ],
    },
  },
  {
    files: ["apps/vsh-web/src/runtime/**", "packages/librtc/**", "tools/**"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-globals": "off",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
);
