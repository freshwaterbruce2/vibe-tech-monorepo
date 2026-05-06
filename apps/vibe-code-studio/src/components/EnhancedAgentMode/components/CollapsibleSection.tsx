/**
 * CollapsibleSection Component
 * Reusable collapsible section for sidebar panels
 * No manual memoization needed - React 19 handles optimization
 */
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { SidebarContent, SidebarHeader, SidebarSection } from '../styled';

/** Props for the CollapsibleSection component */
export interface CollapsibleSectionProps {
  /** Section title */
  readonly title: string;
  /** Icon to display in the header */
  readonly icon: React.ReactNode;
  /** Whether the section is expanded */
  readonly isExpanded: boolean;
  /** Callback when the section header is clicked */
  readonly onToggle: () => void;
  /** Content to display when expanded */
  readonly children: React.ReactNode;
  /** Optional custom class name */
  readonly className?: string;
  /** Optional test ID for testing */
  readonly testId?: string;
}

/**
 * A reusable collapsible section component with smooth animations.
 * Used in sidebars to organize content into expandable/collapsible sections.
 *
 * @param props - Component props
 * @returns Collapsible section element
 */
export function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  className,
  testId
}: CollapsibleSectionProps): React.ReactElement {
  return (
    <SidebarSection className={className} data-testid={testId}>
      <SidebarHeader
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {icon}
        {title}
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </SidebarHeader>

      <AnimatePresence>
        {isExpanded && (
          <SidebarContent
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="region"
            aria-label={`${title} content`}
          >
            {children}
          </SidebarContent>
        )}
      </AnimatePresence>
    </SidebarSection>
  );
}

export default CollapsibleSection;