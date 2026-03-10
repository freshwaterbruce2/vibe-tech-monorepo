/**
 * CollapsibleSection Component
 * Reusable collapsible section for sidebar panels
 */
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';
import styled from 'styled-components';
import { vibeTheme } from '../../styles/theme';

export const SidebarSection = styled.div`
  border-bottom: ${vibeTheme.borders.thin};
`;

export const SidebarHeader = styled.div`
  padding: 16px 20px;
  font-weight: 600;
  font-size: 14px;
  color: ${vibeTheme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
    color: ${vibeTheme.colors.purple};
  }
`;

export const SidebarContent = styled(motion.div)`
  padding: 0 20px 16px;
  font-size: 13px;
`;

/** Props for the CollapsibleSection component */
export interface CollapsibleSectionProps {
  /** Section title */
  readonly title: string;
  /** Icon to display in the header */
  readonly icon: React.ReactNode;
  /** Default expansion state (default: true) */
  readonly defaultExpanded?: boolean;
  /** Content to display when expanded */
  readonly children: React.ReactNode;
  /** Optional custom class name */
  readonly className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  defaultExpanded = true,
  children,
  className
}: CollapsibleSectionProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <SidebarSection className={className}>
      <SidebarHeader
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        {icon}
        <span className="flex-1">{title}</span>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </SidebarHeader>

      <AnimatePresence>
        {isExpanded && (
          <SidebarContent
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </SidebarContent>
        )}
      </AnimatePresence>
    </SidebarSection>
  );
}

export default CollapsibleSection;
