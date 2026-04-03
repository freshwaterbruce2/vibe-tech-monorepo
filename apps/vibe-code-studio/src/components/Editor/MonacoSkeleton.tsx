/**
 * Monaco Editor Loading Skeleton
 * Displays while Monaco Editor is being lazy-loaded
 * Provides visual feedback and maintains layout stability
 */
import styled, { keyframes } from 'styled-components';
import { Code2, Loader2 } from 'lucide-react';
import { vibeTheme } from '../../styles/theme';

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const SkeletonContainer = styled.div`
  width: 100%;
  height: 100%;
  background: ${vibeTheme.colors.primary};
  border-radius: ${vibeTheme.borderRadius.medium};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`;

const SkeletonHeader = styled.div`
  height: 35px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  padding: 0 ${vibeTheme.spacing.md};
  gap: ${vibeTheme.spacing.sm};
`;

const SkeletonTab = styled.div`
  width: 120px;
  height: 20px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 1000px 100%;
  animation: ${shimmer} 2s infinite linear;
  border-radius: 4px;
`;

const SkeletonContent = styled.div`
  flex: 1;
  padding: ${vibeTheme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.xs};
`;

const SkeletonLine = styled.div<{ width?: string; delay?: number }>`
  height: 16px;
  width: ${props => props.width ?? '100%'};
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 1000px 100%;
  animation: ${shimmer} 2s infinite linear;
  animation-delay: ${props => props.delay ?? 0}s;
  border-radius: 3px;
  margin-bottom: 4px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${vibeTheme.spacing.md};
  z-index: 10;
`;

const LoadingIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    rgba(139, 92, 246, 0.2) 0%, 
    rgba(0, 212, 255, 0.2) 100%
  );
  border-radius: ${vibeTheme.borderRadius.medium};
  border: 2px solid rgba(139, 92, 246, 0.3);
  animation: ${pulse} 2s infinite;

  svg {
    color: ${vibeTheme.colors.accent};
    animation: ${pulse} 1.5s infinite;
  }
`;

const LoadingText = styled.div`
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  animation: ${pulse} 2s infinite;
`;

const LoadingSubtext = styled.div`
  color: ${vibeTheme.colors.textMuted};
  font-size: ${vibeTheme.typography.fontSize.xs};
`;

interface MonacoSkeletonProps {
  message?: string;
  showOverlay?: boolean;
}

export const MonacoSkeleton = ({ 
  message = 'Loading editor...', 
  showOverlay = true 
}: MonacoSkeletonProps) => {
  return (
    <SkeletonContainer>
      {/* Fake tab bar */}
      <SkeletonHeader>
        <SkeletonTab />
        <SkeletonTab style={{ width: '100px' }} />
      </SkeletonHeader>

      {/* Fake code lines */}
      <SkeletonContent>
        <SkeletonLine width="40%" delay={0} />
        <SkeletonLine width="85%" delay={0.1} />
        <SkeletonLine width="60%" delay={0.2} />
        <SkeletonLine width="90%" delay={0.3} />
        <SkeletonLine width="30%" delay={0.4} />
        <SkeletonLine width="75%" delay={0.5} />
        <SkeletonLine width="95%" delay={0.6} />
        <SkeletonLine width="50%" delay={0.7} />
        <SkeletonLine width="80%" delay={0.8} />
        <SkeletonLine width="65%" delay={0.9} />
        <SkeletonLine width="40%" delay={1.0} />
        <SkeletonLine width="90%" delay={1.1} />
      </SkeletonContent>

      {/* Loading overlay */}
      {showOverlay && (
        <LoadingOverlay>
          <LoadingIcon>
            <Loader2 size={24} />
          </LoadingIcon>
          <LoadingText>{message}</LoadingText>
          <LoadingSubtext>
            <Code2 size={12} style={{ display: 'inline-block', marginRight: '4px' }} />
            Initializing Monaco Editor
          </LoadingSubtext>
        </LoadingOverlay>
      )}
    </SkeletonContainer>
  );
};

export default MonacoSkeleton;
