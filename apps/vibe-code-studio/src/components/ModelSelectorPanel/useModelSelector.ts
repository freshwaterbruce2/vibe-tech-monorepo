/**
 * useModelSelector Hook
 * State and logic for the ModelSelectorPanel component
 */
import { useCallback, useMemo, useState } from 'react';

import type { CostTracker } from '../../services/CostTracker';
import type { ModelRegistry } from '../../services/ModelRegistry';

import type { FilterCapability, SortCriteria } from './types';

interface UseModelSelectorOptions {
  modelRegistry: ModelRegistry;
  costTracker: CostTracker;
  taskType?: string;
}

type ModelLike = ReturnType<ModelRegistry['listModels']>[number];

function compareModels(a: ModelLike, b: ModelLike, sortBy: SortCriteria): number {
  switch (sortBy) {
    case 'cost':
      return (
        (a.pricing.inputCostPer1k + a.pricing.outputCostPer1k) -
        (b.pricing.inputCostPer1k + b.pricing.outputCostPer1k)
      );
    case 'speed':
      return b.performance.speed - a.performance.speed;
    case 'quality':
      return b.performance.quality - a.performance.quality;
    default:
      return a.name.localeCompare(b.name);
  }
}

function useModelList(
  modelRegistry: ModelRegistry,
  filterCapability: FilterCapability,
  sortBy: SortCriteria
) {
  return useMemo(() => {
    let filtered = modelRegistry.listModels();

    if (filterCapability !== 'all') {
      filtered = modelRegistry.listModelsByCapability(filterCapability);
    }

    return filtered.sort((a, b) => compareModels(a, b, sortBy));
  }, [modelRegistry, filterCapability, sortBy]);
}

interface ModelSelectorCallbackDeps {
  modelRegistry: ModelRegistry;
  costTracker: CostTracker;
  budgetInput: string;
  expandedModelId: string | null;
  setExpandedModelId: (updater: (prev: string | null) => string | null) => void;
  setFilterCapability: (value: FilterCapability) => void;
}

function useModelSelectorCallbacks(deps: ModelSelectorCallbackDeps) {
  const {
    modelRegistry,
    costTracker,
    budgetInput,
    expandedModelId,
    setExpandedModelId,
    setFilterCapability,
  } = deps;

  const handleBudgetChange = useCallback(() => {
    const value = parseFloat(budgetInput);
    if (!isNaN(value) && value > 0) {
      costTracker.setBudget(value);
    }
  }, [budgetInput, costTracker]);

  const handleReset = useCallback(() => {
    costTracker.reset();
    // Force re-render by updating state
    setFilterCapability('all');
  }, [costTracker, setFilterCapability]);

  const toggleExpanded = useCallback((modelId: string) => {
    setExpandedModelId(prev => prev === modelId ? null : modelId);
  }, [setExpandedModelId]);

  const isExpanded = useCallback((modelId: string) => {
    return expandedModelId === modelId;
  }, [expandedModelId]);

  const getModelUsage = useCallback((modelId: string) => {
    return costTracker.getModelUsage(modelId);
  }, [costTracker]);

  const getModelName = useCallback((modelId: string) => {
    return modelRegistry.getModel(modelId)?.name ?? modelId;
  }, [modelRegistry]);

  const getRemainingBudget = useCallback(() => {
    return costTracker.getRemainingBudget();
  }, [costTracker]);

  return {
    handleBudgetChange,
    handleReset,
    toggleExpanded,
    isExpanded,
    getModelUsage,
    getModelName,
    getRemainingBudget,
  };
}

function useModelSelectorStats(
  modelRegistry: ModelRegistry,
  costTracker: CostTracker,
  taskType?: string
) {
  // Get recommended model for task type
  const recommendedModel = useMemo(() => {
    if (!taskType) { return null; }
    return modelRegistry.getRecommendedModel(taskType);
  }, [modelRegistry, taskType]);

  // Get usage statistics
  return {
    recommendedModel,
    stats: costTracker.getStatistics(),
    isOverBudget: costTracker.isOverBudget(),
    budgetUsagePercentage: costTracker.getBudgetUsagePercentage(),
    mostUsedModel: costTracker.getMostUsedModel(),
  };
}

export function useModelSelector(options: UseModelSelectorOptions) {
  const { modelRegistry, costTracker, taskType } = options;

  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [filterCapability, setFilterCapability] = useState<FilterCapability>('all');
  const [sortBy, setSortBy] = useState<SortCriteria>('name');
  const [budgetInput, setBudgetInput] = useState<string>(
    costTracker.getBudget()?.toString() ?? '10'
  );

  // Get filtered and sorted models
  const models = useModelList(modelRegistry, filterCapability, sortBy);

  const { recommendedModel, stats, isOverBudget, budgetUsagePercentage, mostUsedModel } =
    useModelSelectorStats(modelRegistry, costTracker, taskType);

  const {
    handleBudgetChange,
    handleReset,
    toggleExpanded,
    isExpanded,
    getModelUsage,
    getModelName,
    getRemainingBudget,
  } = useModelSelectorCallbacks({
    modelRegistry,
    costTracker,
    budgetInput,
    expandedModelId,
    setExpandedModelId,
    setFilterCapability,
  });

  return {
    // State
    expandedModelId,
    filterCapability,
    setFilterCapability,
    sortBy,
    setSortBy,
    budgetInput,
    setBudgetInput,

    // Computed
    models,
    recommendedModel,
    stats,
    isOverBudget,
    budgetUsagePercentage,
    mostUsedModel,

    // Actions
    handleBudgetChange,
    handleReset,
    toggleExpanded,
    isExpanded,
    getModelUsage,
    getModelName,
    getRemainingBudget,
  };
}
