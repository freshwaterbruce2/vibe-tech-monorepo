import { Code } from 'lucide-react';

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
} from './styled';

interface GlobalTabProps {
  rules: DeepCodeRules | null;
  updateNestedValue: (path: string, value: unknown) => void;
}

export const GlobalTab = ({ rules, updateNestedValue }: GlobalTabProps) => (
  <TabContent>
    <Section>
      <SectionTitle>
        <Code size={16} />
        Style Preferences
      </SectionTitle>
      <Grid>
        <Field>
          <Label>Indentation</Label>
          <Select
            value={rules?.global?.style?.indentation ?? 'spaces'}
            onChange={(e) =>
              updateNestedValue('global.style.indentation', e.target.value)
            }
          >
            <option value="spaces">Spaces</option>
            <option value="tabs">Tabs</option>
          </Select>
        </Field>

        <Field>
          <Label>Indent Size</Label>
          <Input
            type="number"
            min="1"
            max="8"
            value={rules?.global?.style?.indentSize ?? 2}
            onChange={(e) =>
              updateNestedValue('global.style.indentSize', parseInt(e.target.value))
            }
          />
        </Field>

        <Field>
          <Label>Quotes</Label>
          <Select
            value={rules?.global?.style?.quotes ?? 'single'}
            onChange={(e) => updateNestedValue('global.style.quotes', e.target.value)}
          >
            <option value="single">Single</option>
            <option value="double">Double</option>
          </Select>
        </Field>

        <Field>
          <Label>Semicolons</Label>
          <Checkbox
            type="checkbox"
            checked={rules?.global?.style?.semicolons ?? true}
            onChange={(e) =>
              updateNestedValue('global.style.semicolons', e.target.checked)
            }
          />
        </Field>

        <Field>
          <Label>Line Length</Label>
          <Input
            type="number"
            min="40"
            max="200"
            value={rules?.global?.style?.lineLength ?? 100}
            onChange={(e) =>
              updateNestedValue('global.style.lineLength', parseInt(e.target.value))
            }
          />
        </Field>
      </Grid>
    </Section>

    <Section>
      <SectionTitle>Naming Conventions</SectionTitle>
      <Grid>
        <Field>
          <Label>Variables</Label>
          <Select
            value={rules?.global?.style?.naming?.variables ?? 'camelCase'}
            onChange={(e) =>
              updateNestedValue('global.style.naming.variables', e.target.value)
            }
          >
            <option value="camelCase">camelCase</option>
            <option value="snake_case">snake_case</option>
            <option value="PascalCase">PascalCase</option>
          </Select>
        </Field>

        <Field>
          <Label>Functions</Label>
          <Select
            value={rules?.global?.style?.naming?.functions ?? 'camelCase'}
            onChange={(e) =>
              updateNestedValue('global.style.naming.functions', e.target.value)
            }
          >
            <option value="camelCase">camelCase</option>
            <option value="snake_case">snake_case</option>
            <option value="PascalCase">PascalCase</option>
          </Select>
        </Field>

        <Field>
          <Label>Classes</Label>
          <Select
            value={rules?.global?.style?.naming?.classes ?? 'PascalCase'}
            onChange={(e) =>
              updateNestedValue('global.style.naming.classes', e.target.value)
            }
          >
            <option value="PascalCase">PascalCase</option>
            <option value="snake_case">snake_case</option>
          </Select>
        </Field>

        <Field>
          <Label>Constants</Label>
          <Select
            value={rules?.global?.style?.naming?.constants ?? 'SCREAMING_SNAKE_CASE'}
            onChange={(e) =>
              updateNestedValue('global.style.naming.constants', e.target.value)
            }
          >
            <option value="SCREAMING_SNAKE_CASE">SCREAMING_SNAKE_CASE</option>
            <option value="camelCase">camelCase</option>
          </Select>
        </Field>
      </Grid>
    </Section>
  </TabContent>
);
