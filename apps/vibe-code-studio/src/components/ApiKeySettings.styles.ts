import { motion } from 'framer-motion';
import styled from 'styled-components';
import { vibeTheme } from '../styles/theme';

export const Container = styled.div`
  padding: ${vibeTheme.spacing.lg};
  background: ${vibeTheme.colors.secondary};
  border-radius: ${vibeTheme.borderRadius.large};
  border: 2px solid rgba(139, 92, 246, 0.2);
  box-shadow: ${vibeTheme.shadows.large};
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  margin-bottom: ${vibeTheme.spacing.lg};
  padding-bottom: ${vibeTheme.spacing.md};
  border-bottom: 2px solid rgba(139, 92, 246, 0.2);
`;

export const Title = styled.h2`
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  margin: 0;
`;

export const SecurityNote = styled.div`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.md};
  margin-bottom: ${vibeTheme.spacing.lg};
  display: flex;
  align-items: flex-start;
  gap: ${vibeTheme.spacing.sm};
`;

export const SecurityText = styled.p`
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.sm};
  margin: 0;
  line-height: 1.5;
`;

export const ProviderSection = styled.div`
  margin-bottom: ${vibeTheme.spacing.lg};
  padding: ${vibeTheme.spacing.md};
  background: rgba(26, 26, 46, 0.5);
  border-radius: ${vibeTheme.borderRadius.medium};
  border: 1px solid rgba(139, 92, 246, 0.2);
`;

export const ProviderHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${vibeTheme.spacing.md};
`;

export const ProviderTitle = styled.h3`
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.base};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  margin: 0;
`;

export const StatusBadge = styled.div<{ $status: 'valid' | 'invalid' | 'unknown' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  background: ${(props) => {
    switch (props.$status) {
      case 'valid':
        return 'rgba(34, 197, 94, 0.2)';
      case 'invalid':
        return 'rgba(239, 68, 68, 0.2)';
      default:
        return 'rgba(107, 114, 128, 0.2)';
    }
  }};
  color: ${(props) => {
    switch (props.$status) {
      case 'valid':
        return '#22c55e';
      case 'invalid':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }};
`;

export const InputGroup = styled.div`
  margin-bottom: ${vibeTheme.spacing.md};
`;

export const Label = styled.label`
  display: block;
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  margin-bottom: ${vibeTheme.spacing.xs};
`;

export const InputWrapper = styled.div`
  position: relative;
  display: flex;
  gap: ${vibeTheme.spacing.sm};
`;

export const Input = styled.input`
  flex: 1;
  background: rgba(26, 26, 46, 0.8);
  border: 2px solid rgba(139, 92, 246, 0.2);
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  padding-right: 40px;
  border-radius: ${vibeTheme.borderRadius.medium};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-family: ${vibeTheme.typography.fontFamily.mono};
  transition: all ${vibeTheme.animation.duration.normal} ease;

  &:focus {
    outline: none;
    border-color: ${vibeTheme.colors.cyan};
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
  }

  &::placeholder {
    color: ${vibeTheme.colors.textMuted};
  }
`;

export const IconButton = styled(motion.button)`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: ${vibeTheme.colors.textMuted};
  cursor: pointer;
  padding: 4px;
  border-radius: ${vibeTheme.borderRadius.small};
  transition: all ${vibeTheme.animation.duration.fast} ease;

  &:hover {
    color: ${vibeTheme.colors.cyan};
    background: rgba(139, 92, 246, 0.1);
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.sm};
`;

export const Button = styled(motion.button)<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${(props) => {
    switch (props.variant) {
      case 'primary':
        return vibeTheme.gradients.primary;
      case 'danger':
        return 'rgba(239, 68, 68, 0.8)';
      default:
        return 'rgba(139, 92, 246, 0.2)';
    }
  }};
  border: 2px solid ${(props) => {
    switch (props.variant) {
      case 'primary':
        return 'transparent';
      case 'danger':
        return 'rgba(239, 68, 68, 0.3)';
      default:
        return 'rgba(139, 92, 246, 0.3)';
    }
  }};
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  border-radius: ${vibeTheme.borderRadius.medium};
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
  transition: all ${vibeTheme.animation.duration.normal} ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${vibeTheme.shadows.medium};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.sm};
  margin-top: ${vibeTheme.spacing.xs};
`;

export const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  padding: ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.sm};
  margin-top: ${vibeTheme.spacing.xs};
`;

export const PricingSection = styled.div`
  margin-top: ${vibeTheme.spacing.md};
  padding: ${vibeTheme.spacing.sm};
  background: rgba(139, 92, 246, 0.05);
  border-radius: ${vibeTheme.borderRadius.small};
  border: 1px solid rgba(139, 92, 246, 0.1);
`;

export const PricingTitle = styled.div`
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  margin-bottom: ${vibeTheme.spacing.xs};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const PricingTable = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: ${vibeTheme.spacing.xs};
  font-size: ${vibeTheme.typography.fontSize.xs};
`;

export const PricingHeader = styled.div`
  color: ${vibeTheme.colors.textMuted};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  padding: ${vibeTheme.spacing.xs} 0;
  text-align: right;

  &:first-child {
    text-align: left;
  }
`;

export const PricingCell = styled.div`
  color: ${vibeTheme.colors.textSecondary};
  padding: ${vibeTheme.spacing.xs} 0;
  text-align: right;
  font-family: ${vibeTheme.typography.fontFamily.mono};

  &:first-child {
    text-align: left;
    color: ${vibeTheme.colors.text};
    font-family: ${vibeTheme.typography.fontFamily.primary};
  }
`;