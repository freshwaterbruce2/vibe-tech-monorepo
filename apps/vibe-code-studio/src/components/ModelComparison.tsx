// React import not needed with React 19
import { Brain, Code, MessageSquare, Sparkles } from 'lucide-react';
import styled from 'styled-components';

import { vibeTheme } from '../styles/theme';

const ComparisonContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: ${vibeTheme.spacing.lg};
  padding: ${vibeTheme.spacing.lg} 0;
`;

const ModelCard = styled.div<{ $highlighted?: boolean }>`
  background: ${(props) =>
    props.$highlighted
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(0, 212, 255, 0.1) 100%)'
      : vibeTheme.colors.secondary};
  border: 2px solid
    ${(props) => (props.$highlighted ? vibeTheme.colors.purple : 'rgba(139, 92, 246, 0.2)')};
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.lg};
  position: relative;
  transition: all ${vibeTheme.animation.duration.normal} ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${vibeTheme.shadows.large};
    border-color: ${vibeTheme.colors.cyan};
  }
`;

const ModelIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.$color};
  border-radius: ${vibeTheme.borderRadius.medium};
  margin-bottom: ${vibeTheme.spacing.md};

  svg {
    width: 24px;
    height: 24px;
    color: white;
  }
`;

const ModelTitle = styled.h3`
  margin: 0 0 ${vibeTheme.spacing.sm} 0;
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  color: ${vibeTheme.colors.text};
`;

const ModelSubtitle = styled.p`
  margin: 0 0 ${vibeTheme.spacing.md} 0;
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
`;

const FeatureList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Feature = styled.li`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  margin-bottom: ${vibeTheme.spacing.xs};
  padding-left: ${vibeTheme.spacing.md};
  position: relative;

  &::before {
    content: '•';
    position: absolute;
    left: 0;
    color: ${vibeTheme.colors.cyan};
  }
`;

const BestFor = styled.div`
  margin-top: ${vibeTheme.spacing.md};
  padding-top: ${vibeTheme.spacing.md};
  border-top: 1px solid rgba(139, 92, 246, 0.2);
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.text};

  strong {
    color: ${vibeTheme.colors.purple};
  }
`;

interface ModelComparisonProps {
  currentModel?: string | undefined;
}

export const ModelComparison = ({ currentModel }: ModelComparisonProps) => {
  // Featured models - Updated January 31, 2026
  const models = [
    {
      id: 'moonshot/kimi-2.5-pro',
      title: 'Kimi 2.5 Pro',
      subtitle: 'Primary Model',
      icon: <MessageSquare />,
      color: 'rgba(34, 197, 94, 0.8)',
      features: [
        'Completely free',
        'Advanced tool use',
        'Strong coding ability',
        '32K context window',
        'Agentic capabilities',
      ],
      bestFor: 'Free coding tasks, tool use, and agentic workflows',
    },
    {
      id: 'deepseek/deepseek-r1:free',
      title: 'DeepSeek R1',
      subtitle: 'Free Tier (Reasoning)',
      icon: <Brain />,
      color: 'rgba(59, 130, 246, 0.8)',
      features: [
        'Free reasoning model',
        'Rivals OpenAI o1',
        '164K context window',
        'Extended thinking',
        'Open source',
      ],
      bestFor: 'Complex reasoning, math, and logic problems - free!',
    },
    {
      id: 'moonshotai/kimi-k2.5',
      title: 'Kimi K2.5',
      subtitle: 'Mid Cost (NEW Jan 27)',
      icon: <Sparkles />,
      color: 'rgba(245, 158, 11, 0.85)',
      features: [
        'Latest multimodal model',
        'Visual coding expert',
        '262K context window',
        'Agentic tool swarm',
        'State-of-the-art vision',
      ],
      bestFor: 'Visual coding, screenshots, and complex agentic tasks',
    },
    {
      id: 'qwen/qwen3-coder-480b-a35b',
      title: 'Qwen3 Coder 480B',
      subtitle: 'Mid Cost (Best Coder)',
      icon: <Code />,
      color: 'rgba(0, 212, 255, 0.8)',
      features: [
        'Massive 1M+ context',
        '480B parameters',
        'Best open-source coder',
        'Function calling',
        'Multi-file editing',
      ],
      bestFor: 'Large codebase refactors and multi-file operations',
    },
  ];

  return (
    <ComparisonContainer>
      {models.map((model) => (
        <ModelCard key={model.id} $highlighted={currentModel === model.id}>
          <ModelIcon $color={model.color}>{model.icon}</ModelIcon>
          <ModelTitle>{model.title}</ModelTitle>
          <ModelSubtitle>{model.subtitle}</ModelSubtitle>
          <FeatureList>
            {model.features.map((feature, index) => (
              <Feature key={index}>{feature}</Feature>
            ))}
          </FeatureList>
          <BestFor>
            <strong>Best for:</strong> {model.bestFor}
          </BestFor>
        </ModelCard>
      ))}
    </ComparisonContainer>
  );
};

export default ModelComparison;
