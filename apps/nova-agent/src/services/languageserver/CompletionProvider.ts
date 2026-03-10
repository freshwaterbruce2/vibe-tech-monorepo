import type {
	CompletionContext,
	CompletionItem,
	Position,
	TextDocument,
} from "./types";

export class CompletionProvider {
	/**
	 * Generate completions for position
	 */
	generateCompletions(
		document: TextDocument,
		position: Position,
		context?: CompletionContext,
	): CompletionItem[] {
		const items: CompletionItem[] = [];

		// Get text before cursor
		const lines = document.getText().split("\n");
		const currentLine = lines[position.line] ?? "";
		const textBeforeCursor = currentLine.substring(0, position.character);

		// Check if this is a member access (e.g., "x.")
		if (textBeforeCursor.endsWith(".") || context?.triggerCharacter === ".") {
			// Extract object name
			const match = textBeforeCursor.match(/(\w+)\.$/);
			if (match) {
				const objectName = match[1];
				if (!objectName) return items;

				// Find object definition
				const objectProps = this.getObjectProperties(document, objectName);
				items.push(...objectProps);
			}
		}

		return items;
	}

	/**
	 * Get object properties from definition
	 */
	private getObjectProperties(
		document: TextDocument,
		objectName: string,
	): CompletionItem[] {
		const items: CompletionItem[] = [];

		// Simple pattern matching for object literals
		const objectPattern = new RegExp(
			`${objectName}\\s*=\\s*\\{([^}]+)\\}`,
			"s",
		);
		const text = document.getText() ?? "";
		const match = text.match(objectPattern);

		if (match?.[1]) {
			const objectBody = match[1];
			const propertyPattern = /(\w+):/g;
			let propMatch;

			while ((propMatch = propertyPattern.exec(objectBody)) !== null) {
				if (!propMatch[1]) continue;
				items.push({
					label: propMatch[1],
					kind: 5, // Property
					detail: "string",
					documentation: `Property of ${objectName}`,
				});
			}
		}

		return items;
	}
}
