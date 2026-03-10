/**
 * AI Provider Selector Component
 * Allows users to switch between AI models, view status, and manage API keys
 */

import {
  AlertCircle,
  Check,
  ChevronDown,
  DollarSign,
  Settings,
  TrendingUp,
} from 'lucide-react';
import React, { startTransition, useCallback, useEffect, useState } from 'react';

import { AIProviderFactory, type ProviderStatus as ProviderStatusType } from '../../services/ai/AIProviderFactory';
import {
  MODEL_REGISTRY,
  type AIModel,
  type AIProvider
} from '../../services/ai/AIProviderInterface';
import { logger } from '../../services/Logger';

import {
  ActionButton,
  ButtonContent,
  Capability,
  ChevronIcon,
  Container,
  Dropdown,
  DropdownHeader,
  HeaderActions,
  ModelCapabilities,
  ModelDetails,
  ModelInfo,
  ModelItem,
  ModelItemDetails,
  ModelItemHeader,
  ModelItemName,
  ModelList,
  ModelName,
  ModelPrice,
  ModelSpec,
  PlaceholderText,
  ProviderGroup,
  ProviderHeader,
  ProviderIcon,
  ProviderStatus,
  ProviderTitle,
  RecommendedBadge,
  SearchInput,
  SelectedIcon,
  SelectorButton,
  Separator,
  UsageFooter,
  UsageItem,
  UsageLabel,
  UsageValue,
} from './styles';

import {
  ComparisonPanel,
  formatCost,
  formatTokens,
  getProviderColor,
  getProviderIcon,
  SettingsPanel,
} from './utils';

export interface AIProviderSelectorProps {
  onModelChange?: (model: AIModel) => void;
  onProviderChange?: (provider: AIProvider) => void;
  className?: string;
}

export const AIProviderSelector = ({
  onModelChange,
  onProviderChange,
  className,
}: AIProviderSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<Map<AIProvider, ProviderStatusType>>(new Map());
  const [usageStats, setUsageStats] = useState<Record<string, unknown> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const factory = AIProviderFactory.getInstance();

  const loadProviderStatuses = () => {
    const statuses = factory.getAllProviderStatuses();
    const statusMap = new Map<AIProvider, ProviderStatusType>();
    statuses.forEach(status => {
      statusMap.set(status.provider, status);
    });
    setProviderStatuses(statusMap);
  };

  const loadUsageStats = async () => {
    try {
      const stats = await factory.getTotalUsageStats();
      setUsageStats(stats);
    } catch (error) {
      logger.error('Failed to load usage stats:', error);
    }
  };

  const loadDefaultModel = () => {
    const recommendedModels = factory.getRecommendedModels();
    if (recommendedModels.length > 0) {
      setSelectedModel(recommendedModels[0]!);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadProviderStatuses();
      loadUsageStats();
      loadDefaultModel();
    });
  }, []);

  const handleModelSelect = useCallback((model: AIModel) => {
    setSelectedModel(model);
    setIsOpen(false);

    if (onModelChange) {
      onModelChange(model);
    }

    if (onProviderChange) {
      onProviderChange(model.provider);
    }

    try {
      factory.setCurrentProvider(model.provider);
    } catch (error) {
      logger.error('Failed to set provider:', error);
    }
  }, [onModelChange, onProviderChange, factory]);

  const getFilteredModels = () => {
    const allModels = Object.values(MODEL_REGISTRY);

    if (!searchQuery) {
      return allModels;
    }

    const query = searchQuery.toLowerCase();
    return allModels.filter(model =>
      model.name.toLowerCase().includes(query) ||
      model.provider.toLowerCase().includes(query) ||
      model.capabilities.some(cap => cap.toLowerCase().includes(query))
    );
  };

  const groupModelsByProvider = () => {
    const models = getFilteredModels();
    const grouped = new Map<AIProvider, AIModel[]>();

    models.forEach(model => {
      const existing = grouped.get(model.provider) || [];
      grouped.set(model.provider, [...existing, model]);
    });

    return grouped;
  };

  return (
    <Container className={className}>
      <SelectorButton onClick={() => setIsOpen(!isOpen)} $isOpen={isOpen}>
        <ButtonContent>
          {selectedModel && (
            <>
              <ProviderIcon $color={getProviderColor(selectedModel.provider)}>
                {getProviderIcon(selectedModel.provider)}
              </ProviderIcon>
              <ModelInfo>
                <ModelName>{selectedModel.name}</ModelName>
                <ModelDetails>
                  <span>{formatTokens(selectedModel.contextWindow)} context</span>
                  <Separator>•</Separator>
                  <span>${selectedModel.costPerMillionInput}/M in</span>
                </ModelDetails>
              </ModelInfo>
            </>
          )}
          {!selectedModel && (
            <PlaceholderText>Select AI Model</PlaceholderText>
          )}
          <ChevronIcon $isOpen={isOpen}>
            <ChevronDown size={20} />
          </ChevronIcon>
        </ButtonContent>
      </SelectorButton>

      {isOpen && (
        <Dropdown>
          <DropdownHeader>
            <SearchInput
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <HeaderActions>
              <ActionButton
                onClick={() => setShowComparison(!showComparison)}
                $active={showComparison}
                title="Compare models"
              >
                <TrendingUp size={16} />
              </ActionButton>
              <ActionButton
                onClick={() => setShowSettings(!showSettings)}
                $active={showSettings}
                title="API settings"
              >
                <Settings size={16} />
              </ActionButton>
            </HeaderActions>
          </DropdownHeader>

          {!showSettings && !showComparison && (
            <ModelList>
              {Array.from(groupModelsByProvider()).map(([provider, models]) => {
                const status = providerStatuses.get(provider);
                const isConfigured = status?.initialized && status?.available;

                return (
                  <ProviderGroup key={provider}>
                    <ProviderHeader>
                      <ProviderTitle $color={getProviderColor(provider)}>
                        {getProviderIcon(provider)}
                        <span>{provider.toUpperCase()}</span>
                      </ProviderTitle>
                      <ProviderStatus $isConfigured={!!isConfigured}>
                        {isConfigured ? (
                          <>
                            <Check size={14} />
                            <span>Ready</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={14} />
                            <span>Not configured</span>
                          </>
                        )}
                      </ProviderStatus>
                    </ProviderHeader>

                    {models.map(model => (
                      <ModelItem
                        key={model.id}
                        onClick={() => isConfigured && handleModelSelect(model)}
                        $disabled={!isConfigured}
                        $selected={selectedModel?.id === model.id}
                      >
                        <ModelItemHeader>
                          <ModelItemName>
                            {model.name}
                            {model.recommended && <RecommendedBadge>Recommended</RecommendedBadge>}
                          </ModelItemName>
                          {selectedModel?.id === model.id && (
                            <SelectedIcon>
                              <Check size={16} />
                            </SelectedIcon>
                          )}
                        </ModelItemHeader>
                        <ModelItemDetails>
                          <ModelSpec>
                            <span>{formatTokens(model.contextWindow)} ctx</span>
                            <Separator>•</Separator>
                            <span>{formatTokens(model.maxOutput)} out</span>
                          </ModelSpec>
                          <ModelPrice>
                            <DollarSign size={12} />
                            <span>{model.costPerMillionInput}/{model.costPerMillionOutput}</span>
                          </ModelPrice>
                        </ModelItemDetails>
                        <ModelCapabilities>
                          {model.capabilities.slice(0, 3).map(cap => (
                            <Capability key={cap}>{cap.replace(/_/g, ' ')}</Capability>
                          ))}
                          {model.capabilities.length > 3 && (
                            <Capability>+{model.capabilities.length - 3}</Capability>
                          )}
                        </ModelCapabilities>
                      </ModelItem>
                    ))}
                  </ProviderGroup>
                );
              })}
            </ModelList>
          )}

          {showSettings && <SettingsPanel factory={factory} onClose={() => setShowSettings(false)} />}
          {showComparison && <ComparisonPanel models={getFilteredModels()} />}

          {usageStats && (
            <UsageFooter>
              <UsageItem>
                <UsageLabel>Total Usage</UsageLabel>
                <UsageValue>{formatTokens(usageStats.tokensUsed as number)} tokens</UsageValue>
              </UsageItem>
              <UsageItem>
                <UsageLabel>Total Cost</UsageLabel>
                <UsageValue>{formatCost(usageStats.estimatedCost as number)}</UsageValue>
              </UsageItem>
              <UsageItem>
                <UsageLabel>Requests</UsageLabel>
                <UsageValue>{usageStats.requestCount as number}</UsageValue>
              </UsageItem>
            </UsageFooter>
          )}
        </Dropdown>
      )}
    </Container>
  );
};

export { formatTokens, getProviderIcon } from './utils';
export default AIProviderSelector;
