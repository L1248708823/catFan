import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * 分层边界在这里执行，不靠口头约定。
 * 依赖方向：ui -> app -> data -> domain，domain 谁都不依赖。
 */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "src/ui/components/ui/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react-router", "react-router-dom", "dexie", "lucide-react", "@/*"],
              message: "领域层必须保持纯净：不依赖框架、持久化或界面代码，只收普通数据、吐普通数据。",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "时间必须作为参数传入，领域层不读系统时钟。" },
        { name: "performance", message: "领域层不读系统时钟。" },
      ],
    },
  },

  {
    files: ["src/app/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["dexie", "@/data/dexie", "@/data/dexie/*"],
              message: "持久化细节只能通过 @/data 暴露的仓储端口访问。",
            },
          ],
        },
      ],
    },
  },
);
