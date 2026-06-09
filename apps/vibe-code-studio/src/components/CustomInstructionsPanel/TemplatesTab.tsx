import { BookOpen } from 'lucide-react';

import type { DeepCodeRules } from '../../types/customInstructions';
import type { CodeTemplate } from './types';

import {
  CloseButton,
  PreviewCode,
  PreviewHeader,
  Section,
  SectionTitle,
  SourceName,
  TabContent,
  Tag,
  TemplateCard,
  TemplateDescription,
  TemplateList,
  TemplateName,
  TemplatePreview,
  TemplateSource,
  TemplateTags,
} from './styled';

interface TemplatesTabProps {
  templates?: Map<string, DeepCodeRules['templates']>;
  selectedTemplate: string | null;
  setSelectedTemplate: (name: string | null) => void;
}

export const TemplatesTab = ({
  templates,
  selectedTemplate,
  setSelectedTemplate,
}: TemplatesTabProps) => (
  <TabContent>
    <Section>
      <SectionTitle>
        <BookOpen size={16} />
        Code Templates ({templates?.size ?? 0} sources)
      </SectionTitle>

      {templates && (
        <TemplateList>
          {Array.from(templates.entries()).map(([source, sourceTemplates]) => (
            <TemplateSource key={source}>
              <SourceName>{source}</SourceName>
              {sourceTemplates &&
                Object.entries(sourceTemplates).map(([name, template]: [string, CodeTemplate]) => (
                  <TemplateCard
                    key={name}
                    onClick={() => setSelectedTemplate(name)}
                    $selected={selectedTemplate === name}
                  >
                    <TemplateName>{template.name}</TemplateName>
                    {template.description && (
                      <TemplateDescription>{template.description}</TemplateDescription>
                    )}
                    <TemplateTags>
                      {template.trigger && <Tag>Trigger: {template.trigger}</Tag>}
                      {template.language && <Tag>{template.language}</Tag>}
                      {template.tags?.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </TemplateTags>
                  </TemplateCard>
                ))}
            </TemplateSource>
          ))}
        </TemplateList>
      )}

      {selectedTemplate && templates && (
        <TemplatePreview>
          <PreviewHeader>
            <h3>Template Preview</h3>
            <CloseButton onClick={() => setSelectedTemplate(null)}>x</CloseButton>
          </PreviewHeader>
          {Array.from(templates.values())
            .flatMap((t) => (t ? Object.entries(t) : []))
            .filter(([name]) => name === selectedTemplate)
            .map(([, template]) => (
              <PreviewCode key={selectedTemplate}>{(template as CodeTemplate).code}</PreviewCode>
            ))}
        </TemplatePreview>
      )}
    </Section>
  </TabContent>
);
