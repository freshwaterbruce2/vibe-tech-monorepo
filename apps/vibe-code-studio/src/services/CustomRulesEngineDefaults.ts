/**
 * CustomRulesEngineDefaults - Built-in templates for CustomRulesEngine
 */
import type { DeepCodeRules } from '../types/customInstructions';

export const BUILT_IN_TEMPLATES: DeepCodeRules['templates'] = {
  'react-component': {
    name: 'React Component',
    description: 'Create a new React functional component',
    language: 'typescript',
    tags: ['react', 'component'],
    trigger: 'rfc',
    code: `import React from 'react';
import styled from 'styled-components';

interface {{ComponentName}}Props {
  {{propName}}?: {{propType}};
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({
  {{propName}}
}) => {
  return (
    <Container>
      <h1>{{ComponentName}}</h1>
      {{content}}
    </Container>
  );
};

const Container = styled.div\`
  padding: 20px;
\`;`,
    placeholders: [
      { name: 'ComponentName', type: 'string', required: true },
      { name: 'propName', type: 'string', default: 'children' },
      { name: 'propType', type: 'string', default: 'React.ReactNode' },
      { name: 'content', type: 'string', default: '{children}' },
    ],
  },
  'async-function': {
    name: 'Async Function',
    description: 'Create an async function with error handling',
    language: 'typescript',
    tags: ['async', 'function'],
    trigger: 'afn',
    code: `async function {{functionName}}({{params}}): Promise<{{returnType}}> {
  try {
    {{body}}

    return {{returnValue}};
  } catch (error) {
    logger.error('Error in {{functionName}}:', error);
    throw error;
  }
}`,
    placeholders: [
      { name: 'functionName', type: 'string', required: true },
      { name: 'params', type: 'string', default: '' },
      { name: 'returnType', type: 'string', default: 'void' },
      { name: 'body', type: 'string', default: '// Implementation here' },
      { name: 'returnValue', type: 'string', default: 'undefined' },
    ],
  },
  'api-service': {
    name: 'API Service',
    description: 'Create an API service class',
    language: 'typescript',
    tags: ['api', 'service', 'class'],
    trigger: 'api',
    code: `export class {{ServiceName}}Service {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get{{Resource}}(id: string): Promise<{{ResourceType}}> {
    const response = await fetch(\`\${this.baseUrl}/{{endpoint}}/\${id}\`);

    if (!response.ok) {
      throw new Error(\`Failed to fetch {{resource}}: \${response.statusText}\`);
    }

    return response.json();
  }

  async create{{Resource}}(data: Partial<{{ResourceType}}>): Promise<{{ResourceType}}> {
    const response = await fetch(\`\${this.baseUrl}/{{endpoint}}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(\`Failed to create {{resource}}: \${response.statusText}\`);
    }

    return response.json();
  }
}`,
    placeholders: [
      { name: 'ServiceName', type: 'string', required: true },
      { name: 'Resource', type: 'string', required: true },
      { name: 'ResourceType', type: 'string', required: true },
      { name: 'endpoint', type: 'string', required: true },
      { name: 'resource', type: 'string', required: true },
    ],
  },
};
