/**
 * AIProviderSelector Utility Functions and Sub-panels
 */

import { Brain, Code, Globe, Zap } from 'lucide-react';
import { useState } from 'react';
import { logger } from '../../services/Logger';
import type { AIProviderFactory } from '../../services/ai/AIProviderFactory';
import type { AIModel} from '../../services/ai/AIProviderInterface';
import { AIProvider } from '../../services/ai/AIProviderInterface';
import {
    ApiKeyInput,
    CloseButton,
    ComparisonContainer,
    ComparisonHeader,
    ComparisonTable,
    SaveButton,
    SettingItem,
    SettingLabel,
    SettingsContainer,
    SettingsHeader,
    SettingsList,
} from './styles';

// Helper Functions
export const getProviderIcon = (provider: AIProvider) => {
  switch (provider) {
    case AIProvider.DEEPSEEK:
      return <Brain size={16} />;
    case AIProvider.OPENAI:
      return <Zap size={16} />;
    case AIProvider.ANTHROPIC:
      return <Code size={16} />;
    case AIProvider.GOOGLE:
      return <Globe size={16} />;
    default:
      return null;
  }
};

export const getProviderColor = (provider: AIProvider): string => {
  switch (provider) {
    case AIProvider.DEEPSEEK:
      return '#00A67E';  // DeepSeek green
    case AIProvider.OPENAI:
      return '#10A37F';  // OpenAI green
    case AIProvider.ANTHROPIC:
      return '#D4A373';  // Claude beige
    case AIProvider.GOOGLE:
      return '#4285F4';  // Google blue
    default:
      return '#666';
  }
};

export const formatCost = (cost: number): string => {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
};

export const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};

// Settings Panel Component
interface SettingsPanelProps {
  factory: AIProviderFactory;
  onClose: () => void;
}

export const SettingsPanel = ({ factory, onClose }: SettingsPanelProps) => {
  const [apiKeys, setApiKeys] = useState<Map<AIProvider, string>>(new Map());
  const [saving, setSaving] = useState(false);

  const handleSaveKey = async (provider: AIProvider, key: string) => {
    try {
      setSaving(true);
      // Save API key logic here
      await factory.initializeProvider({
        provider,
        apiKey: key,
        model: '',
      });
      logger.info(`API key saved for ${provider}`);
    } catch (error) {
      logger.error(`Failed to save API key for ${provider}:`, error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsContainer>
      <SettingsHeader>
        <h3>API Configuration</h3>
        <CloseButton onClick={onClose}>×</CloseButton>
      </SettingsHeader>
      <SettingsList>
        {Object.values(AIProvider).map(provider => (
          <SettingItem key={provider}>
            <SettingLabel>
              {getProviderIcon(provider as AIProvider)}
              <span>{provider.toUpperCase()} API Key</span>
            </SettingLabel>
            <ApiKeyInput
              type="password"
              placeholder="Enter API key..."
              value={apiKeys.get(provider as AIProvider) ?? ''}
              onChange={(e) => {
                const newKeys = new Map(apiKeys);
                newKeys.set(provider as AIProvider, e.target.value);
                setApiKeys(newKeys);
              }}
            />
            <SaveButton
              onClick={async () => handleSaveKey(provider as AIProvider, apiKeys.get(provider as AIProvider) ?? '')}
              disabled={!apiKeys.get(provider as AIProvider) || saving}
            >
              Save
            </SaveButton>
          </SettingItem>
        ))}
      </SettingsList>
    </SettingsContainer>
  );
};

// Comparison Panel Component
interface ComparisonPanelProps {
  models: AIModel[];
}

export const ComparisonPanel = ({ models }: ComparisonPanelProps) => {
  return (
    <ComparisonContainer>
      <ComparisonHeader>
        <h3>Model Comparison</h3>
      </ComparisonHeader>
      <ComparisonTable>
        <thead>
          <tr>
            <th>Model</th>
            <th>Context</th>
            <th>Output</th>
            <th>Input Cost</th>
            <th>Output Cost</th>
          </tr>
        </thead>
        <tbody>
          {models.slice(0, 10).map(model => (
            <tr key={model.id}>
              <td>{model.name}</td>
              <td>{formatTokens(model.contextWindow)}</td>
              <td>{formatTokens(model.maxOutput)}</td>
              <td>${model.costPerMillionInput}/M</td>
              <td>${model.costPerMillionOutput}/M</td>
            </tr>
          ))}
        </tbody>
      </ComparisonTable>
    </ComparisonContainer>
  );
};
