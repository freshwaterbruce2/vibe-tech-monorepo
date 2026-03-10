/**
 * AIChat State Hook
 * Manages chat state including input, mode, and resize functionality
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import type { AIMessage } from '../../types';

import type { ChatMode } from './types';
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH } from './types';

interface UseChatStateOptions {
    messages?: AIMessage[];
    onClose?: () => void;
}

interface UseChatStateReturn {
    // State
    input: string;
    isTyping: boolean;
    width: number;
    isResizing: boolean;
    mode: ChatMode;
    showModeInfo: boolean;

    // Refs
    inputRef: RefObject<HTMLTextAreaElement | null>;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    containerRef: RefObject<HTMLDivElement | null>;

    // Setters
    setInput: (value: string) => void;
    setIsTyping: (value: boolean) => void;
    setMode: (mode: ChatMode) => void;
    setShowModeInfo: (value: boolean) => void;

    // Handlers
    handleResizeStart: (e: MouseEvent) => void;
}

const CHAT_WIDTH_KEY = 'deepcode-chat-width';

export function useChatState(options: UseChatStateOptions = {}): UseChatStateReturn {
    const { messages = [] } = options;

    // State
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [mode, setMode] = useState<ChatMode>('chat');
    const [showModeInfo, setShowModeInfo] = useState(true);

    // Refs
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load saved width on mount
    useEffect(() => {
        const loadWidth = async () => {
            try {
                if (window.electron?.store) {
                    const saved = await window.electron.store.get(CHAT_WIDTH_KEY);
                    if (saved) {
                        setWidth(parseInt(saved, 10));
                    }
                }
            } catch (error) {
                console.error('Failed to load chat width', error);
            }
        };
        loadWidth();
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Resize handlers
    const handleResizeStart = useCallback((e: MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = width;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = startX - moveEvent.clientX;
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            if (window.electron?.store) {
                window.electron.store.set(CHAT_WIDTH_KEY, String(width))
                    .catch(err => console.error('Failed to save chat width', err));
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [width]);

    // Save width to localStorage when it changes
    useEffect(() => {
        if (!isResizing && window.electron?.store) {
            window.electron.store.set(CHAT_WIDTH_KEY, String(width))
                .catch(err => console.error('Failed to save chat width', err));
        }
    }, [width, isResizing]);

    return {
        // State
        input,
        isTyping,
        width,
        isResizing,
        mode,
        showModeInfo,

        // Refs
        inputRef,
        messagesEndRef,
        containerRef,

        // Setters
        setInput,
        setIsTyping,
        setMode,
        setShowModeInfo,

        // Handlers
        handleResizeStart,
    };
}

/**
 * Mode information for display
 */
export const MODE_INFO = {
    chat: {
        title: 'Chat Mode',
        description: 'Simple Q&A with AI. Ask questions about code, get explanations, or discuss programming concepts.'
    },
    agent: {
        title: 'Agent Mode (ReAct)',
        description: 'AI agent that autonomously plans, executes, and completes multi-step coding tasks using tools and reasoning.'
    }
} as const;
