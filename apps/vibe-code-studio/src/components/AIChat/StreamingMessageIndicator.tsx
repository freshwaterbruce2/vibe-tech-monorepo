/**
 * Streaming Message Indicator Component
 * Real-time visual feedback for AI streaming responses
 *
 * Features:
 * - Typewriter effect for streaming text
 * - Token count display
 * - Estimated cost calculation
 * - Thinking spinner before first token
 * - Smooth animations
 */

import { motion } from 'framer-motion';
import { Bot, DollarSign, Hash, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';

import { vibeTheme } from '../../styles/theme';

// Animations
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const _pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const dots = keyframes`
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
`;

// Styled Components
const StreamingContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.sm};
  padding: ${vibeTheme.spacing.md};
  background: rgba(139, 92, 246, 0.05);
  border-radius: ${vibeTheme.borderRadius.medium};
  border: 1px solid rgba(139, 92, 246, 0.1);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.sm};
`;

const IconWrapper = styled.div<{ $isThinking?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${vibeTheme.borderRadius.full};
  background: ${vibeTheme.gradients.primary};

  svg {
    color: ${vibeTheme.colors.text};
    width: 14px;
    height: 14px;
    ${props => props.$isThinking && `animation: ${spin} 1s linear infinite;`}
  }
`;

const StatusText = styled.span<{ $isThinking?: boolean }>`
  flex: 1;
  font-weight: ${vibeTheme.typography.fontWeight.medium};

  ${props => props.$isThinking && `
    &::after {
      content: '...';
      animation: ${dots} 1.5s steps(4) infinite;
    }
  `}
`;

const MetricsRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.md};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  font-variant-numeric: tabular-nums;
`;

const MetricItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};

  svg {
    width: 12px;
    height: 12px;
    opacity: 0.7;
  }
`;

const MetricValue = styled.span<{ $highlight?: boolean }>`
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${props => props.$highlight ? vibeTheme.colors.cyan : vibeTheme.colors.text};
`;

const StreamingTextContainer = styled(motion.div)`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.text};
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ThinkingDots = styled.span`
  display: inline-block;
  min-width: 20px;

  &::after {
    content: '';
    animation: ${dots} 1.5s steps(4) infinite;
  }
`;

const ProgressBar = styled.div`
  height: 2px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: ${vibeTheme.borderRadius.full};
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: ${vibeTheme.gradients.primary};
  border-radius: ${vibeTheme.borderRadius.full};
`;

// Cost Estimation (rough estimates)
const TOKEN_COSTS = {
  'liquid/lfm-2.5-1.2b-thinking:free': 0,
  'liquid/lfm-2.5-1.2b-instruct:free': 0,
  'z-ai/glm-4.7-flash': 0.000000235, // ~$0.235 per 1M tokens
  'deepseek/deepseek-v3.2': 0.000000315, // ~$0.315 per 1M tokens
  'deepseek/deepseek-chat': 0.00000075, // ~$0.75 per 1M tokens
  'openai/gpt-5.2-codex': 0.0000079, // ~$7.88 per 1M tokens
  'openai/gpt-5.2': 0.0000079,
  'anthropic/claude-sonnet-4.5': 0.000009, // ~$9.00 per 1M tokens
  'anthropic/claude-opus-4.5': 0.000015, // ~$15.00 per 1M tokens
  default: 0.000001, // Default ~$1.00 per 1M tokens
} as const;

export interface StreamingMessageIndicatorProps {
  /** Current streaming text */
  text?: string;
  /** Token count */
  tokenCount: number;
  /** Model being used */
  model: string;
  /** Is currently streaming */
  isStreaming: boolean;
  /** Show detailed metrics */
  showMetrics?: boolean;
  /** Estimated max tokens for progress bar */
  maxTokens?: number;
}

export const StreamingMessageIndicator = ({
  text = '',
  tokenCount,
  model,
  isStreaming,
  showMetrics = true,
  maxTokens = 2000,
}: StreamingMessageIndicatorProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const prevTextLengthRef = useRef(0);

  // Calculate cost
  const costPerToken = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || TOKEN_COSTS.default;
  const estimatedCost = (tokenCount * costPerToken).toFixed(6);

  // Calculate progress (for progress bar)
  const progress = maxTokens > 0 ? Math.min((tokenCount / maxTokens) * 100, 100) : 0;

  // Typewriter effect with ref to avoid cascading renders
  useEffect(() => {
    if (!isStreaming || text === displayedText) {
      return;
    }

    // Instant update if text is much longer (avoid slow typewriter for large chunks)
    // Using queueMicrotask to defer setState and avoid cascading render warning
    if (text.length - displayedText.length > 50) {
      queueMicrotask(() => setDisplayedText(text));
      return;
    }

    // Typewriter animation for small updates
    const timer = setTimeout(() => {
      if (charIndex < text.length) {
        setDisplayedText(text.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }
    }, 10); // 10ms per character = fast but visible

    return () => clearTimeout(timer);
  }, [text, charIndex, displayedText, isStreaming]);

  // Reset when text changes dramatically (new message) - using ref to avoid direct setState
  useEffect(() => {
    const currentLength = text.length;
    const prevLength = prevTextLengthRef.current;
    prevTextLengthRef.current = currentLength;

    if (currentLength < prevLength && currentLength < displayedText.length) {
      queueMicrotask(() => {
        setDisplayedText('');
        setCharIndex(0);
      });
    }
  }, [text.length, displayedText.length]);

  const isThinking = tokenCount === 0 && isStreaming;

  return (
    <StreamingContainer
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <HeaderRow>
        <IconWrapper $isThinking={isThinking}>
          {isThinking ? <Zap /> : <Bot />}
        </IconWrapper>
        <StatusText $isThinking={isThinking}>
          {isThinking ? 'AI is thinking' : 'AI is responding'}
        </StatusText>
      </HeaderRow>

      {/* Streaming Text */}
      {displayedText && (
        <StreamingTextContainer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {displayedText}
          {isStreaming && <ThinkingDots />}
        </StreamingTextContainer>
      )}

      {/* Metrics */}
      {showMetrics && (
        <MetricsRow>
          <MetricItem>
            <Hash />
            <MetricValue $highlight>{tokenCount.toLocaleString()}</MetricValue>
            <span>tokens</span>
          </MetricItem>

          {tokenCount > 0 && (
            <MetricItem>
              <DollarSign />
              <MetricValue>${estimatedCost}</MetricValue>
              <span>est.</span>
            </MetricItem>
          )}
        </MetricsRow>
      )}

      {/* Progress Bar (optional) */}
      {maxTokens > 0 && tokenCount > 0 && (
        <ProgressBar>
          <ProgressFill
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </ProgressBar>
      )}
    </StreamingContainer>
  );
};

/**
 * Compact version for inline display (e.g., in editor)
 */
export const CompactStreamingIndicator = ({ tokenCount, isStreaming }: {
  tokenCount: number;
  isStreaming: boolean;
}) => {
  return (
    <motion.div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: vibeTheme.colors.cyan,
        fontVariantNumeric: 'tabular-nums',
      }}
      animate={{ opacity: isStreaming ? [0.5, 1, 0.5] : 1 }}
      transition={{ duration: 1.5, repeat: isStreaming ? Infinity : 0 }}
    >
      <Zap size={12} />
      <span>{tokenCount} tokens</span>
      {isStreaming && <ThinkingDots />}
    </motion.div>
  );
};

export default StreamingMessageIndicator;
