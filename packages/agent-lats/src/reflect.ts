/**
 * Self-reflection module.
 *
 * When a LATS approach fails, the agent generates a structured self-critique.
 * This critique is stored back to agent_mistakes and updates future MCTS value estimates.
 *
 * The reflection is a structured prompt that the CALLING AGENT fills in —
 * LATS provides the template; the agent that executed the task fills the answers.
 */

export interface ReflectionInput {
  taskDescription: string;
  approach: string;
  approachSource: string;
  errorOrOutcome: string; // what actually happened
  agentId?: string;
}

export interface ReflectionOutput {
  template: string;  // the prompt the agent should answer
  nodeId: string;
  timestamp: string;
}

/**
 * Generate the self-reflection prompt template.
 * The executing agent fills in the [ANSWER] sections.
 */
export function generateReflectionPrompt(input: ReflectionInput, nodeId: string): ReflectionOutput {
  const timestamp = new Date().toISOString();

  const template = `
## LATS Self-Reflection — Approach Failure

**Task**: ${input.taskDescription}
**Approach tried** (source: ${input.approachSource}):
${input.approach}

**What happened**:
${input.errorOrOutcome}

**Reflection questions** — answer each honestly:

1. **Root cause**: What was the fundamental reason this approach failed?
   [ANSWER]

2. **Wrong assumption**: What did this approach assume that turned out to be false?
   [ANSWER]

3. **Better approach**: If starting over, what would you do differently in the first step?
   [ANSWER]

4. **Pattern to avoid**: State a one-sentence rule that should be added to failure_patterns to prevent this mistake.
   [ANSWER: "When task involves X, do NOT use Y because Z."]

5. **Pattern to promote**: State a one-sentence rule about what DOES work for this task type.
   [ANSWER: "When task involves X, the reliable approach is Y."]

**Node ID for backpropagation**: ${nodeId}
**Timestamp**: ${timestamp}

After filling in this reflection, call:
  lats backpropagate --node ${nodeId} --success false --reflection "<paste answers above>"
`.trim();

  return { template, nodeId, timestamp };
}

/**
 * Parse a filled-in reflection to extract the actionable patterns.
 * Returns null if the reflection is unparseable (caller should still store the raw text).
 */
export function parseReflectionAnswers(filledReflection: string): {
  rootCause: string | null;
  wrongAssumption: string | null;
  betterApproach: string | null;
  patternToAvoid: string | null;
  patternToPromote: string | null;
} {
  const extract = (label: string): string | null => {
    const re = new RegExp(`\\*\\*${label}\\*\\*.*?\\n\\[ANSWER\\]([^\\n*]*)`, 's');
    const match = filledReflection.match(re);
    return match?.[1]?.trim() ?? null;
  };

  return {
    rootCause: extract('Root cause'),
    wrongAssumption: extract('Wrong assumption'),
    betterApproach: extract('Better approach'),
    patternToAvoid: extract('Pattern to avoid'),
    patternToPromote: extract('Pattern to promote'),
  };
}
