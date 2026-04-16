import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export class EditorIntegration {
	private validateTarget(filePath: string, line?: number): string {
		if (!filePath || /[\0\r\n]/.test(filePath)) {
			throw new Error("Invalid file path");
		}

		const resolved = path.resolve(filePath);
		if (line == null) {
			return resolved;
		}

		if (!Number.isInteger(line) || line < 1) {
			throw new Error("Invalid line number");
		}

		return `${resolved}:${line}`;
	}

	async openFile(filePath: string, line?: number): Promise<string> {
		const target = this.validateTarget(filePath, line);

		try {
			await execFileAsync("vibe", [target], { timeout: 15000 });
			return `Opened ${filePath} in Vibe Code Studio`;
		} catch {
			try {
				await execFileAsync("code", ["-g", target], { timeout: 15000 });
				return `Opened ${filePath} in VS Code`;
			} catch {
				return 'Could not open editor. Ensure "vibe" or "code" is in your PATH.';
			}
		}
	}
}
