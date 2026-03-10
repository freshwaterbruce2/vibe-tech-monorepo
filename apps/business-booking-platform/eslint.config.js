import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";

export default [
	{
		ignores: [
			"dist/**",
			"build/**",
			"coverage/**",
			"node_modules/**",
			"*.config.js",
			"*.config.ts",
			"vite.config.ts",
			"vitest.config.ts",
			"tailwind.config.js",
			"postcss.config.js",
			"build-website-example/**",
			".eslintrc.cjs",
		],
	},
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				browser: true,
				es2021: true,
				node: true,
				console: true,
				process: true,
				window: true,
				document: true,
				navigator: true,
				alert: true,
				localStorage: true,
				setTimeout: true,
				React: true,
			},
		},
		plugins: {
			"@typescript-eslint": typescriptPlugin,
			"react-hooks": reactHooksPlugin,
			"react-refresh": reactRefreshPlugin,
		},
		rules: {
			// TypeScript rules
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-non-null-assertion": "warn",
			"@typescript-eslint/no-empty-interface": "warn",
			"@typescript-eslint/ban-ts-comment": "warn",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports" },
			],

			// React Hooks rules
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",

			// React Refresh rules
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],

			// General rules
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"no-debugger": "error",
			"no-alert": "warn",
			"prefer-const": "error",
			"no-var": "error",
			"object-shorthand": "error",
			"prefer-template": "error",
			"prefer-destructuring": ["error", { object: true, array: false }],
			"no-nested-ternary": "warn",
			eqeqeq: ["error", "always"],
			"no-unused-expressions": "off",
			"no-undef": "off",
			"no-unreachable": "error",
			"no-duplicate-case": "error",
			"no-empty": "warn",
			"no-fallthrough": "error",
			curly: ["error", "all"],
			"brace-style": ["error", "1tbs", { allowSingleLine: false }],
			"arrow-parens": ["error", "always"],
			"comma-dangle": ["error", "always-multiline"],
			quotes: ["error", "single", { avoidEscape: true }],
			semi: ["error", "always"],
			"no-trailing-spaces": "error",
			"max-len": ["warn", { code: 100, ignoreUrls: true, ignoreStrings: true }],
		},
	},
	{
		files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/__tests__/**/*"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": "off",
			quotes: "off",
			"prefer-destructuring": "off",
			"no-console": "off",
		},
	},
];
