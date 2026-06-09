export interface ParlRewardInputs {
  epoch: number;
  maxEpochs: number;
  subAgentCount: number;
  taskCompletionRate: number; // Q(τ) metric: completion rate [0, 1]
  regressionFreeRate: number;  // Q(τ) metric: regression-free rate [0, 1]
  safetyViolationRate: number; // Q(τ) metric: safety violation rate [0, 1]
  criticalSteps: number;       // E(τ) metric: actual critical steps taken (sequential rounds)
  totalTasks: number;          // E(τ) metric: baseline sequential steps (total tasks to do)
  isParallelExecution: boolean; // Whether the run used parallel instantiation
  parallelOverheadPenaltyPerAgent?: number; // Penalty rate per instantiated sub-agent
}

export interface ParlRewardResult {
  reward: number;
  lambdaAux: number;
  rParallel: number;
  qualityScore: number;
  efficiencyScore: number;
  terminalReward: number;
}

export class ParlRewardShaper {
  private readonly defaultPenalty = 0.15;

  /**
   * Calculates the PARL reward function:
   * R(e) = (1 - λ_aux(e)) * [0.8 * Q(τ) + 0.2 * E(τ)] + λ_aux(e) * r_parallel
   */
  public calculateReward(inputs: ParlRewardInputs): ParlRewardResult {
    const {
      epoch,
      maxEpochs,
      subAgentCount,
      taskCompletionRate,
      regressionFreeRate,
      safetyViolationRate,
      criticalSteps,
      totalTasks,
      isParallelExecution,
      parallelOverheadPenaltyPerAgent = this.defaultPenalty,
    } = inputs;

    // 1. Calculate annealed auxiliary weight lambda_aux(e)
    // Anneals from 0.1 down to 0.0 linearly over training epochs
    const lambdaAux = Math.max(0, 0.1 * (1 - epoch / Math.max(1, maxEpochs)));

    // 2. Calculate r_parallel (exploration incentive)
    // Explicitly reward the model for instantiating sub-agents and parallelizing
    const rParallel = isParallelExecution && subAgentCount > 1 
      ? 0.5 + 0.1 * subAgentCount 
      : 0.0;

    // 3. Calculate task completion quality Q(τ)
    // Must be high when tasks succeed, no regressions occur, and safety is respected
    const qualityScore = taskCompletionRate * regressionFreeRate * (1 - safetyViolationRate);

    // 4. Calculate critical path efficiency E(τ)
    // E(τ) measures Critical Steps versus total baseline tasks.
    // We apply a branching penalty for unnecessary parallel execution.
    let efficiencyScore = 0.0;
    if (totalTasks > 0) {
      const penaltyFactor = isParallelExecution && totalTasks > 1
        ? (totalTasks - 1) * parallelOverheadPenaltyPerAgent
        : 0.0;

      // E(τ) = (Sequential Baseline - Critical Steps - Parallel Overhead Penalty) / Sequential Baseline
      efficiencyScore = (totalTasks - criticalSteps - penaltyFactor) / totalTasks;
      
      // Clamp efficiency score between -1.0 and 1.0 to bound the reward contribution
      efficiencyScore = Math.max(-1.0, Math.min(1.0, efficiencyScore));
    }

    // 5. Apply the 80/20 Terminal Balance
    const terminalReward = 0.8 * qualityScore + 0.2 * efficiencyScore;

    // 6. Compute final blended reward
    const reward = (1 - lambdaAux) * terminalReward + lambdaAux * rParallel;

    return {
      reward: Number(reward.toFixed(4)),
      lambdaAux: Number(lambdaAux.toFixed(4)),
      rParallel: Number(rParallel.toFixed(4)),
      qualityScore: Number(qualityScore.toFixed(4)),
      efficiencyScore: Number(efficiencyScore.toFixed(4)),
      terminalReward: Number(terminalReward.toFixed(4)),
    };
  }
}
