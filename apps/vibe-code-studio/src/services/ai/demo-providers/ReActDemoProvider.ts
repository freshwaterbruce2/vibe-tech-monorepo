import type { AIContextRequest, AIResponse } from '../../../types';

export class ReActDemoProvider {
  static getResponse(request: AIContextRequest): AIResponse | null {
    const lowerQuery = request.userQuery.toLowerCase();
    if (!lowerQuery.includes('response format (json only)')) {return null;}

    const parseBooleanField = (field: string): boolean | undefined => {
      const match = request.userQuery.match(new RegExp(`"${field}"\\s*:\\s*(true|false)`, 'i'));
      if (!match) {return undefined;}
      return match[1]?.toLowerCase() === 'true';
    };

    // Phase 1: Thought
    if (lowerQuery.includes('"reasoning"') && lowerQuery.includes('"expectedoutcome"')) {
      return this.getThoughtResponse();
    }

    // Phase 3: Observation
    if (lowerQuery.includes('"actualoutcome"') && lowerQuery.includes('"unexpectedevents"')) {
      return this.getObservationResponse(parseBooleanField('success'));
    }

    // Phase 4: Reflection
    if (lowerQuery.includes('"whatworked"') && lowerQuery.includes('"knowledgegained"')) {
      return this.getReflectionResponse(parseBooleanField('shouldRetry'));
    }

    return null;
  }

  private static getThoughtResponse(): AIResponse {
    return {
      content: JSON.stringify({
        reasoning: 'I will execute the step carefully and validate inputs/outputs before making changes.',
        approach: 'Follow the planned action, then verify results and handle errors gracefully.',
        alternatives: [
          'Inspect the relevant files/config first to confirm assumptions',
          'Run a dry-run or smaller-scope version of the action',
        ],
        confidence: 50,
        risks: [
          'Demo mode response is synthetic',
          'The action may require permissions or missing dependencies',
        ],
        expectedOutcome: 'The action completes and returns a clear success/failure result.',
      }, null, 2),
      metadata: {
        model: 'demo',
        tokens: 120,
        processing_time: 50,
      },
    };
  }

  private static getObservationResponse(successIndicator?: boolean): AIResponse {
    const success = successIndicator ?? true;

    return {
      content: JSON.stringify({
        actualOutcome: success ? 'The action completed successfully.' : 'The action failed to complete.',
        success,
        differences: [],
        learnings: [
          'Ensure outputs are validated and errors are handled consistently.',
        ],
        unexpectedEvents: [],
      }, null, 2),
      metadata: {
        model: 'demo',
        tokens: 120,
        processing_time: 50,
      },
    };
  }

  private static getReflectionResponse(retryIndicator?: boolean): AIResponse {
    const shouldRetry = retryIndicator ?? false;

    return {
      content: JSON.stringify({
        whatWorked: ['The step executed without crashing the app.'],
        whatFailed: [],
        rootCause: shouldRetry ? 'The first attempt did not meet expectations.' : undefined,
        shouldRetry,
        suggestedChanges: shouldRetry ? ['Adjust the approach based on observed differences.'] : [],
        knowledgeGained: 'JSON-only responses should be enforced for structured agent phases.',
      }, null, 2),
      metadata: {
        model: 'demo',
        tokens: 120,
        processing_time: 50,
      },
    };
  }
}
