import type { IPCMessage } from '@vibetech/shared-ipc';
import { WebSocket } from 'ws';

// Define Client Interface since it's not exported from server.ts yet
export interface ConnectedClient {
    ws: WebSocket;
    source: string | null;
    lastSeen: number;
    messageCount: number;
}

interface ParsedCommand {
    target: string;
    command: string;
    args: string[];
    text: string;
    originalMessage: IPCMessage;
    timeoutMs: number;
}

interface CommandRouteResult {
    result: unknown;
    target: string;
    commandId: string;
}

interface PendingCommand {
    resolve: (value: CommandRouteResult) => void;
    reject: (reason?: unknown) => void;
    timeout: NodeJS.Timeout;
    createdAt: number;
    target: string;
    origin: {
        clientId: string;
        source: string | undefined;
        messageId: string;
    };
    commandId: string;
}

export class CommandRouter {
    private pendingCommands = new Map<string, PendingCommand>();
    private commandTimeout = 30000;

    isCommand(message: IPCMessage): boolean {
        if (message.type !== 'command_request') return false;

        const payload = message.payload as Record<string, unknown>;
        const text = (payload?.text as string) ?? '';
        const explicitTarget = payload?.target as string | undefined;

        const validTargets = ['nova', 'vibe', 'desktop-commander-v3'];

        if (explicitTarget && validTargets.includes(explicitTarget)) {
            return text.length > 0;
        }

        return validTargets.some((target: string) => text.startsWith(`@${target} `));
    }

    parseCommand(message: IPCMessage): ParsedCommand | null {
        const payload = message.payload as Record<string, unknown>;
        const rawText = (payload?.text as string) ?? '';
        const explicitTarget = payload?.target as string | undefined;
        const trimmed = rawText.trim();

        if (!trimmed) {
            return null;
        }

        let target = explicitTarget;
        let commandText = trimmed;

        if (!target) {
            const targetMatch = trimmed.match(/^@(nova|vibe|desktop-commander-v3)\s+(.+)/i);
            if (!targetMatch) {
                return null;
            }

            target = targetMatch[1].toLowerCase();
            commandText = targetMatch[2];
        }

        if (target !== 'nova' && target !== 'vibe' && target !== 'desktop-commander-v3') {
            return null;
        }

        const parts = commandText.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
            return null;
        }

        const command = parts[0];
        const args = parts.slice(1);

        return {
            target,
            command,
            args,
            text: commandText.trim(),
            originalMessage: message,
            timeoutMs: message.timeoutMs ?? (payload?.timeout as number | undefined) ?? this.commandTimeout,
        };
    }

    async routeCommand(parsedCommand: ParsedCommand, clients: Map<string, ConnectedClient>, senderClientId: string): Promise<CommandRouteResult> {
        const { target, command, args, text, originalMessage, timeoutMs } = parsedCommand;

        const targetClients = Array.from(clients.entries())
            .filter(([clientId, client]) => {
                return client.source === target && clientId !== senderClientId;
            });

        if (targetClients.length === 0) {
            throw new Error(`No ${target} clients connected`);
        }

        const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const commandMessage = {
            type: 'command_execute' as const,
            source: 'bridge' as const,
            target,
            payload: {
                commandId,
                command,
                args,
                text,
                originalSender: senderClientId,
                originalSource: originalMessage.source,
                originalMessageId: originalMessage.messageId,
            },
            timestamp: Date.now(),
            messageId: commandId,
            correlationId: originalMessage.messageId,
        };

        const sent: string[] = [];
        for (const [clientId, client] of targetClients) {
            if (client.ws.readyState === 1) {
                try {
                    client.ws.send(JSON.stringify(commandMessage));
                    sent.push(clientId);
                } catch (error: unknown) {
                    console.error(`Failed to send command to ${clientId}:`, error instanceof Error ? error.message : error);
                }
            }
        }

        if (sent.length === 0) {
            throw new Error(`Failed to send command to ${target}`);
        }

        return new Promise<CommandRouteResult>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingCommands.delete(commandId);
                reject(new Error(`Command timeout: ${target} ${command}`));
            }, Math.max(1000, Math.min(timeoutMs ?? this.commandTimeout, 120000)));

            this.pendingCommands.set(commandId, {
                resolve,
                reject,
                timeout,
                createdAt: Date.now(),
                target,
                origin: {
                    clientId: senderClientId,
                    source: originalMessage.source,
                    messageId: originalMessage.messageId,
                },
                commandId,
            });
        });
    }

    handleCommandResponse(message: IPCMessage): boolean {
        const payload = message.payload as Record<string, unknown>;
        const cmdId = String(payload?.commandId ?? '');
        const success = payload?.success as boolean | undefined;
        const result = payload?.result;
        const error = payload?.error as string | undefined;

        const pending = this.pendingCommands.get(cmdId);
        if (!pending) {
            console.warn(`Received response for unknown command: ${cmdId}`);
            return false;
        }

        clearTimeout(pending.timeout);
        this.pendingCommands.delete(cmdId);

        if (success) {
            pending.resolve({
                result: result ?? null,
                target: pending.target,
                commandId: cmdId,
            });
        } else {
            pending.reject(new Error(error ?? 'Command failed'));
        }

        return true;
    }

    sendCommandResponse(clients: Map<string, ConnectedClient>, originalSenderClientId: string, commandId: string, success: boolean, result: unknown, error: string | null) {
        const client = clients.get(originalSenderClientId);
        if (client?.ws.readyState !== 1) {
            console.warn(`Cannot send response to disconnected client: ${originalSenderClientId}`);
            return;
        }

        const responseMessage = {
            type: 'command_result',
            source: 'bridge',
            payload: {
                commandId,
                success,
                result: result ?? null,
                error: error ?? null,
            },
            timestamp: Date.now(),
            messageId: `resp-${commandId}`,
        };

        try {
            client.ws.send(JSON.stringify(responseMessage));
        } catch (sendError: unknown) {
            console.error(`Failed to send command response:`, sendError instanceof Error ? sendError.message : sendError);
        }
    }

    getStats() {
        return {
            pendingCommands: this.pendingCommands.size,
            commandTimeout: this.commandTimeout
        };
    }

    cleanup() {
        const now = Date.now();
        for (const [commandId, pending] of this.pendingCommands.entries()) {
            if (now - pending.createdAt > this.commandTimeout * 2) {
                clearTimeout(pending.timeout);
                pending.reject?.(new Error('Command cleanup timeout'));
                this.pendingCommands.delete(commandId);
            }
        }
    }
}
