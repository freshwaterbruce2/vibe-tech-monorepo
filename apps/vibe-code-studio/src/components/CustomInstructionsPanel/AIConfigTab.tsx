import { Zap } from 'lucide-react';

import type { DeepCodeRules } from '../../types/customInstructions';

import {
  Checkbox,
  Field,
  Grid,
  Input,
  Label,
  Section,
  SectionTitle,
  Select,
  TabContent,
  TextArea,
} from './styled';

interface AIConfigTabProps {
  rules: DeepCodeRules | null;
  updateNestedValue: (path: string, value: unknown) => void;
}

export const AIConfigTab = ({ rules, updateNestedValue }: AIConfigTabProps) => (
  <TabContent>
    <Section>
      <SectionTitle>
        <Zap size={16} />
        AI Configuration
      </SectionTitle>
      <Grid>
        <Field>
          <Label>Model</Label>
          <Select
            value={rules?.aiConfig?.model ?? 'auto'}
            onChange={(e) => updateNestedValue('aiConfig.model', e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="deepseek">DeepSeek</option>
            <option value="haiku">Claude Haiku</option>
            <option value="sonnet">Claude Sonnet</option>
          </Select>
        </Field>

        <Field>
          <Label>Temperature</Label>
          <Input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={rules?.aiConfig?.temperature ?? 0.7}
            onChange={(e) =>
              updateNestedValue('aiConfig.temperature', parseFloat(e.target.value))
            }
          />
        </Field>

        <Field>
          <Label>Max Tokens</Label>
          <Input
            type="number"
            min="100"
            max="8000"
            step="100"
            value={rules?.aiConfig?.maxTokens ?? 2000}
            onChange={(e) =>
              updateNestedValue('aiConfig.maxTokens', parseInt(e.target.value))
            }
          />
        </Field>

        <Field>
          <Label>Completion Style</Label>
          <Select
            value={rules?.aiConfig?.completionStyle ?? 'balanced'}
            onChange={(e) =>
              updateNestedValue('aiConfig.completionStyle', e.target.value)
            }
          >
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="verbose">Verbose</option>
          </Select>
        </Field>

        <Field>
          <Label>Include Comments</Label>
          <Checkbox
            type="checkbox"
            checked={rules?.aiConfig?.includeComments ?? true}
            onChange={(e) =>
              updateNestedValue('aiConfig.includeComments', e.target.checked)
            }
          />
        </Field>

        <Field>
          <Label>Include Types</Label>
          <Checkbox
            type="checkbox"
            checked={rules?.aiConfig?.includeTypes ?? true}
            onChange={(e) =>
              updateNestedValue('aiConfig.includeTypes', e.target.checked)
            }
          />
        </Field>
      </Grid>

      <Field>
        <Label>System Prompt</Label>
        <TextArea
          rows={4}
          value={rules?.aiConfig?.systemPrompt ?? ''}
          onChange={(e) => updateNestedValue('aiConfig.systemPrompt', e.target.value)}
          placeholder="Enter system-level instructions for the AI..."
        />
      </Field>
    </Section>
  </TabContent>
);
