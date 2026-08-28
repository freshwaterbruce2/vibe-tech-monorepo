module.exports = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"type-enum": [
			2,
			"always",
			[
				"feat", // New feature
				"fix", // Bug fix
				"docs", // Documentation
				"style", // Formatting, missing semicolons, etc
				"refactor", // Code change that neither fixes a bug nor adds a feature
				"perf", // Performance improvements
				"test", // Adding missing tests
				"chore", // Maintain
				"build", // Build process
				"ci", // CI/CD
				"revert", // Revert changes
				"wip", // Work in progress
			],
		],
	},
};
