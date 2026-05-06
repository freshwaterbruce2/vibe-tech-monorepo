/**
 * Workspace Templates Panel Component
 * Quick project scaffolding with predefined templates
 */

import { motion } from 'framer-motion';
import { shouldForwardMotionProp } from '../utils/motionProps';
import {
  Code2,
  FileCode,
  Folder,
  Layers,
  Loader2,
  Package,
  Plus,
  Search,
  Server,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

import { logger } from '../services/Logger';
import type { ProjectTemplate } from '../services/WorkspaceTemplateService';
import { WorkspaceTemplateService } from '../services/WorkspaceTemplateService';
import { vibeTheme } from '../styles/theme';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${vibeTheme.colors.secondary};
  border-left: 1px solid rgba(139, 92, 246, 0.1);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
`;

const CloseButton = styled.button`
  background: transparent;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.xs};
  cursor: pointer;
  color: ${vibeTheme.colors.textSecondary};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: ${vibeTheme.colors.text};
  }
`;

const SearchContainer = styled.div`
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  padding-left: 36px;
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
  }

  &::placeholder {
    color: ${vibeTheme.colors.textSecondary};
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: ${vibeTheme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${vibeTheme.colors.textSecondary};
  pointer-events: none;
`;

const SearchWrapper = styled.div`
  position: relative;
`;

const FilterTabs = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 2px;
  }
`;

const FilterTab = styled.button<{ $active: boolean }>`
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  border: 1px solid rgba(139, 92, 246, 0.2);
  background: ${props => (props.$active ? 'rgba(139, 92, 246, 0.2)' : 'transparent')};
  color: ${props => (props.$active ? vibeTheme.colors.text : vibeTheme.colors.textSecondary)};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    color: ${vibeTheme.colors.text};
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${vibeTheme.spacing.md};
`;

const TemplateCard = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.md};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
  }
`;

const TemplateHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${vibeTheme.spacing.sm};
  margin-bottom: ${vibeTheme.spacing.sm};
`;

const TemplateIcon = styled.div`
  font-size: 32px;
  line-height: 1;
`;

const TemplateInfo = styled.div`
  flex: 1;
`;

const TemplateName = styled.div`
  font-size: ${vibeTheme.typography.fontSize.md};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  margin-bottom: ${vibeTheme.spacing.xs};
`;

const TemplateDescription = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.4;
`;

const TemplateTags = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
  flex-wrap: wrap;
  margin-top: ${vibeTheme.spacing.sm};
`;

const Tag = styled.span`
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  background: rgba(139, 92, 246, 0.1);
  color: ${vibeTheme.colors.text};
`;

const TemplateFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${vibeTheme.spacing.sm};
  padding-top: ${vibeTheme.spacing.sm};
  border-top: 1px solid rgba(139, 92, 246, 0.1);
`;

const SetupTime = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

const Modal = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: ${vibeTheme.colors.secondary};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.large};
  padding: ${vibeTheme.spacing.xl};
  max-width: 500px;
  width: 90%;
`;

const ModalTitle = styled.h3`
  margin: 0 0 ${vibeTheme.spacing.md} 0;
  font-size: ${vibeTheme.typography.fontSize.xl};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
`;

const FormGroup = styled.div`
  margin-bottom: ${vibeTheme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  color: ${vibeTheme.colors.text};
  margin-bottom: ${vibeTheme.spacing.xs};
`;

const Input = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.sm};
  margin-top: ${vibeTheme.spacing.lg};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  border-radius: ${vibeTheme.borderRadius.medium};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${vibeTheme.spacing.xs};

  ${props =>
    props.$variant === 'primary'
      ? `
    background: ${vibeTheme.gradients.primary};
    border: none;
    color: ${vibeTheme.colors.text};

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
  `
      : `
    background: transparent;
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: ${vibeTheme.colors.text};

    &:hover {
      background: rgba(139, 92, 246, 0.1);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${vibeTheme.spacing.xl} ${vibeTheme.spacing.md};
  color: ${vibeTheme.colors.textSecondary};
`;

const EmptyIcon = styled.div`
  margin-bottom: ${vibeTheme.spacing.md};
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
`;

export interface WorkspaceTemplatesPanelProps {
  onClose: () => void;
  onSuccess?: (title: string, message: string) => void;
  onError?: (title: string, message: string) => void;
}

export const WorkspaceTemplatesPanel = ({ onClose, onSuccess, onError }: WorkspaceTemplatesPanelProps) => {
  const [templateService] = useState(() => new WorkspaceTemplateService());
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ProjectTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Load templates on mount
  useEffect(() => {
    const allTemplates = templateService.getAllTemplates();
    setTemplates(allTemplates);
    setFilteredTemplates(allTemplates);
    logger.info('[WorkspaceTemplates] Loaded templates:', allTemplates.length);
  }, [templateService]);

  // Filter templates
  useEffect(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = templateService.getTemplatesByCategory(selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = templateService.searchTemplates(searchQuery);
    }

    setFilteredTemplates(filtered);
  }, [searchQuery, selectedCategory, templates, templateService]);

  const categories = [
    { id: 'all', label: 'All Templates', icon: Layers },
    { id: 'frontend', label: 'Frontend', icon: Code2 },
    { id: 'backend', label: 'Backend', icon: Server },
    { id: 'fullstack', label: 'Full-Stack', icon: Package },
    { id: 'desktop', label: 'Desktop', icon: Folder },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
  ];

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.icon ?? Folder;
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setProjectName('');
    setTargetPath('');
  };

  const handleGenerateProject = async () => {
    if (!selectedTemplate || !projectName.trim() || !targetPath.trim()) {
      return;
    }

    setIsGenerating(true);

    try {
      const result = await templateService.generateProject(selectedTemplate.id, projectName, targetPath);

      logger.info('[WorkspaceTemplates] Generated project:', result);

      // Close modal and panel
      setSelectedTemplate(null);
      onClose();

      const nextStepsText = result.nextSteps
        .map((step: string, i: number) => `${i + 1}. ${step}`)
        .join('\n');
      if (onSuccess) {
        onSuccess(
          'Project Created',
          `"${projectName}" generated successfully.\n\nNext steps:\n${nextStepsText}`
        );
      }
    } catch (error) {
      logger.error('[WorkspaceTemplates] Failed to generate project:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (onError) {
        onError('Project Generation Failed', `Could not generate "${projectName}": ${message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <Sparkles size={20} />
          Workspace Templates
        </Title>
        <CloseButton onClick={onClose}>
          <X size={16} />
        </CloseButton>
      </Header>

      <SearchContainer>
        <SearchWrapper>
          <SearchIcon size={16} />
          <SearchInput
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </SearchWrapper>
      </SearchContainer>

      <FilterTabs>
        {categories.map(category => {
          const Icon = category.icon;
          return (
            <FilterTab
              key={category.id}
              $active={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              <Icon size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {category.label}
            </FilterTab>
          );
        })}
      </FilterTabs>

      <Content>
        {filteredTemplates.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <FileCode size={48} />
            </EmptyIcon>
            <EmptyText>No templates found matching your search</EmptyText>
          </EmptyState>
        ) : (
          <TemplateGrid>
            {filteredTemplates.map(template => {
              const CategoryIcon = getCategoryIcon(template.category);
              return (
                <TemplateCard
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <TemplateHeader>
                    <TemplateIcon>{template.icon}</TemplateIcon>
                    <TemplateInfo>
                      <TemplateName>{template.name}</TemplateName>
                      <TemplateDescription>{template.description}</TemplateDescription>
                    </TemplateInfo>
                  </TemplateHeader>

                  <TemplateTags>
                    {template.tags.slice(0, 3).map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </TemplateTags>

                  <TemplateFooter>
                    <SetupTime>
                      <Zap size={12} />
                      {template.estimatedSetupTime ?? '~3 min'}
                    </SetupTime>
                    <CategoryIcon size={16} style={{ opacity: 0.5 }} />
                  </TemplateFooter>
                </TemplateCard>
              );
            })}
          </TemplateGrid>
        )}
      </Content>

      {/* Generation Modal */}
      {selectedTemplate && (
        <Modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isGenerating && setSelectedTemplate(null)}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <ModalTitle>
              {selectedTemplate.icon} Create {selectedTemplate.name}
            </ModalTitle>

            <FormGroup>
              <Label>Project Name</Label>
              <Input
                type="text"
                placeholder="my-awesome-project"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                disabled={isGenerating}
              />
            </FormGroup>

            <FormGroup>
              <Label>Target Directory</Label>
              <Input
                type="text"
                placeholder="C:\dev\apps\my-project"
                value={targetPath}
                onChange={e => setTargetPath(e.target.value)}
                disabled={isGenerating}
              />
            </FormGroup>

            <ModalActions>
              <Button $variant="secondary" onClick={() => setSelectedTemplate(null)} disabled={isGenerating}>
                <X size={16} />
                Cancel
              </Button>
              <Button
                $variant="primary"
                onClick={handleGenerateProject}
                disabled={!projectName.trim() || !targetPath.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Project
                  </>
                )}
              </Button>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default WorkspaceTemplatesPanel;
