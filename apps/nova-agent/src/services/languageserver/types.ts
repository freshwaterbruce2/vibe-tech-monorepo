// Export types from vscode-languageserver-protocol and types

export type {
	CompletionContext,
	DidChangeTextDocumentParams,
	DidOpenTextDocumentParams,
	Hover,
	InitializeParams,
	ServerCapabilities,
	TextDocumentPositionParams,
} from "vscode-languageserver-protocol";
export {
	CompletionItem,
	CompletionList,
	Diagnostic,
	DiagnosticSeverity,
	Location,
	Position,
	TextDocumentSyncKind,
} from "vscode-languageserver-protocol";
export type { TextDocumentContentChangeEvent as TextDocumentChange } from "vscode-languageserver-textdocument";
export { TextDocument } from "vscode-languageserver-textdocument";
