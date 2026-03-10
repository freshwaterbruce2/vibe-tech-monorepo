import { type Child, Command } from "@tauri-apps/plugin-shell";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { type ITheme, Terminal } from "@xterm/xterm";
import type { TerminalOptions } from "./types";

export class TerminalSession {
	public id: string;
	public instance: Terminal;
	public fitAddon: FitAddon;
	public searchAddon: SearchAddon;
	public process?: Child;
	public createdAt: Date;

	public readonly options: TerminalOptions;
	private dataHandlers: ((data: string) => void)[] = [];
	private exitHandlers: ((code: number) => void)[] = [];

	constructor(id: string, options: TerminalOptions) {
		this.id = id;
		this.options = options;
		this.createdAt = new Date();

		// Create xterm instance
		this.instance = new Terminal({
			rows: options.rows ?? 30,
			cols: options.cols ?? 80,
			fontSize: options.fontSize ?? 14,
			fontFamily: options.fontFamily ?? "Cascadia Code, Consolas, monospace",
			theme: options.theme ?? this.getDefaultTheme(),
			cursorBlink: true,
			cursorStyle: "block",
			scrollback: 1000,
			allowTransparency: false,
			convertEol: true,
			...options,
		});

		this.fitAddon = new FitAddon();
		this.searchAddon = new SearchAddon();
		this.instance.loadAddon(this.fitAddon);
		this.instance.loadAddon(this.searchAddon);
	}

	/**
	 * Initialize and spawn the shell process
	 */
	async spawn(): Promise<void> {
		const shell = this.options.shell ?? "powershell.exe";

		// Tauri Command
		// Note: 'powershell' must be allowed in tauri.conf.json > capabilities
		const cmd = Command.create(shell, []);

		// Setup event listeners before spawn
		cmd.on("close", (data) => {
			this.exitHandlers.forEach((h) => h(data.code ?? 0));
			this.process = undefined;
		});

		cmd.on("error", (error) => console.error(`command error: "${error}"`));

		cmd.stdout.on("data", (line) => {
			this.instance.write(line);
			this.dataHandlers.forEach((h) => h(line));
		});

		cmd.stderr.on("data", (line) => {
			this.instance.write(line);
			this.dataHandlers.forEach((h) => h(line));
		});

		try {
			this.process = await cmd.spawn();

			// Forward terminal input to process
			this.instance.onData((data) => {
				const process = this.process;
				if (process) {
					void Promise.resolve(process.write(data)).catch((error) => {
						console.error("Failed to write terminal input:", error);
					});
				}
			});
		} catch (err) {
			this.instance.write(
				`\r\n\x1b[31mFailed to launch shell: ${err}\x1b[0m\r\n`,
			);
			throw err;
		}
	}

	write(data: string): void {
		this.instance.write(data);
		const process = this.process;
		if (process) {
			void Promise.resolve(process.write(data)).catch((error) => {
				console.error("Failed to write terminal output:", error);
			});
		}
	}

	resize(cols: number, rows: number): void {
		this.instance.resize(cols, rows);
		this.fitAddon.fit();
		// Note: Tauri Shell plugin currently doesn't support explicit resize signals
		// to the PTY in the same way node-pty does, but usually it handles flow well enough.
	}

	kill(): void {
		const process = this.process;
		if (process) {
			void Promise.resolve(process.kill()).catch((error) => {
				console.error("Failed to kill terminal process:", error);
			});
		}
	}

	onData(handler: (data: string) => void): void {
		this.dataHandlers.push(handler);
	}

	onExit(handler: (code: number) => void): void {
		this.exitHandlers.push(handler);
	}

	search(query: string): boolean {
		const result = this.searchAddon.findNext(query);
		if (!result) {
			// Simple manual buffer check fallback
			const buffer = this.instance.buffer.active;
			for (let i = 0; i < buffer.length; i++) {
				if (buffer.getLine(i)?.translateToString(true).includes(query)) {
					return true;
				}
			}
		}
		return result;
	}

	dispose(): void {
		this.kill();
		this.instance.dispose();
	}

	private getDefaultTheme(): ITheme {
		return {
			background: "#1e1e1e",
			foreground: "#cccccc",
			cursor: "#ffffff",
			black: "#000000",
			red: "#cd3131",
			green: "#0dbc79",
			yellow: "#e5e510",
			blue: "#2472c8",
			magenta: "#bc3fbc",
			cyan: "#11a8cd",
			white: "#e5e5e5",
			brightBlack: "#666666",
			brightRed: "#f14c4c",
			brightGreen: "#23d18b",
			brightYellow: "#f5f543",
			brightBlue: "#3b8eea",
			brightMagenta: "#d670d6",
			brightCyan: "#29b8db",
			brightWhite: "#ffffff",
		};
	}
}
