module.exports = {
	root: true,
	env: { browser: true, es2020: true, node: true },
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:react-hooks/recommended",
	],
	ignorePatterns: ["dist", ".eslintrc.cjs", "server/db/schema.sql"],
	parser: "@typescript-eslint/parser",
	rules: {
		"react-hooks/set-state-in-effect": "warn",
		"@typescript-eslint/no-explicit-any": "warn",
		"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
	},
};
