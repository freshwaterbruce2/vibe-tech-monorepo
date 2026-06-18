declare module 'vscode' {
  export interface Disposable {
    dispose(): unknown;
  }

  export interface ExtensionContext {
    subscriptions: Disposable[];
  }

  export class Position {
    constructor(line: number, character: number);
  }

  export class Range {
    constructor(start: Position, end: Position);
  }

  export interface Selection {
    active: Position;
  }

  export interface TextDocument {
    getText(range?: Range): string;
  }

  export interface TextEditorEdit {
    insert(position: Position, value: string): void;
  }

  export interface TextEditor {
    document: TextDocument;
    selection: Selection;
    edit(callback: (editBuilder: TextEditorEdit) => void): Promise<boolean>;
  }

  export namespace commands {
    function registerCommand(command: string, callback: (...args: unknown[]) => unknown): Disposable;
    function executeCommand<T = unknown>(command: string, ...rest: unknown[]): Promise<T | undefined>;
  }

  export namespace window {
    const activeTextEditor: TextEditor | undefined;
    function showInformationMessage(message: string): unknown;
    function showErrorMessage(message: string): unknown;
  }

  export namespace workspace {
    function getConfiguration(section?: string): {
      get<T>(key: string): T | undefined;
    };
  }
}
