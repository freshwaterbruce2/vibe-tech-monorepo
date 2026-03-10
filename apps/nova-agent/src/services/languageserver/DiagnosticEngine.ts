import {
	type Diagnostic,
	DiagnosticSeverity,
	type TextDocument,
} from "./types";

export class DiagnosticEngine {
	private languageId: string;

	constructor(languageId: string) {
		this.languageId = languageId;
	}

	/**
	 * Analyze diagnostics for document
	 */
	analyzeDiagnostics(document: TextDocument): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		// Simple type checking for TypeScript
		if (this.languageId === "typescript") {
			const text = document.getText() ?? "";
			const lines = text.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (line === undefined) continue;

				// Check for type mismatches: const x: number = "string"
				const typeMismatch = /const\s+(\w+):\s*number\s*=\s*"([^"]+)"/.exec(
					line,
				);
				if (typeMismatch) {
					diagnostics.push({
						range: {
							start: { line: i, character: 0 },
							end: { line: i, character: line.length },
						},
						severity: DiagnosticSeverity.Error,
						message: `Type 'string' is not assignable to type 'number'`,
						source: "typescript",
					});
				}
			}
		}

		return diagnostics;
	}
}
