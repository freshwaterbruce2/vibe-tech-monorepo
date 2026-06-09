import styled from 'styled-components';

import { vibeTheme } from '../styles/theme';

export const DashboardContainer = styled.div`
  padding: ${vibeTheme.spacing[6]};
  background: ${vibeTheme.colors.background};
  color: ${vibeTheme.colors.text};
  height: 100%;
  overflow-y: auto;
`;

export const Header = styled.div`
  margin-bottom: ${vibeTheme.spacing[6]};
`;

export const Title = styled.h1`
  font-size: ${vibeTheme.typography.fontSize['2xl']};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  margin-bottom: ${vibeTheme.spacing[2]};
  color: ${vibeTheme.colors.text};
`;

export const Subtitle = styled.p`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
`;

export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${vibeTheme.spacing[4]};
  margin-bottom: ${vibeTheme.spacing[6]};
`;

export const MetricCard = styled.div<{ trend?: 'up' | 'down' | 'neutral' }>`
  background: ${vibeTheme.colors.primary};
  padding: ${vibeTheme.spacing[4]};
  border-radius: ${vibeTheme.borderRadius.lg};
  border: 1px solid rgba(139, 92, 246, 0.1);
  transition: ${vibeTheme.animation.transition.all};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
  }
`;

export const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${vibeTheme.spacing[2]};
`;

export const MetricLabel = styled.span`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const MetricIcon = styled.div<{ color?: string }>`
  color: ${props => props.color || vibeTheme.colors.purple};

  svg {
    width: 20px;
    height: 20px;
  }
`;

export const MetricValue = styled.div`
  font-size: ${vibeTheme.typography.fontSize['2xl']};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  margin-bottom: ${vibeTheme.spacing[1]};
`;

export const MetricChange = styled.div<{ positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${props => props.positive ? vibeTheme.colors.green : vibeTheme.colors.red};

  svg {
    width: 16px;
    height: 16px;
  }
`;

export const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: ${vibeTheme.spacing[6]};
  margin-bottom: ${vibeTheme.spacing[6]};
`;

export const ChartCard = styled.div`
  background: ${vibeTheme.colors.primary};
  padding: ${vibeTheme.spacing[6]};
  border-radius: ${vibeTheme.borderRadius.lg};
  border: 1px solid rgba(139, 92, 246, 0.1);
`;

export const ChartTitle = styled.h3`
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  margin-bottom: ${vibeTheme.spacing[4]};
  color: ${vibeTheme.colors.text};
`;

export const ModelTable = styled.table`
  width: 100%;
  background: ${vibeTheme.colors.primary};
  border-radius: ${vibeTheme.borderRadius.lg};
  border: 1px solid rgba(139, 92, 246, 0.1);
  overflow: hidden;
`;

export const TableHeader = styled.thead`
  background: rgba(139, 92, 246, 0.1);
`;

export const TableRow = styled.tr`
  border-bottom: 1px solid rgba(139, 92, 246, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${vibeTheme.colors.hover};
  }
`;

export const TableCell = styled.td`
  padding: ${vibeTheme.spacing[3]} ${vibeTheme.spacing[4]};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.text};
`;

export const TableHeaderCell = styled.th`
  padding: ${vibeTheme.spacing[3]} ${vibeTheme.spacing[4]};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.textSecondary};
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const Badge = styled.span<{ color?: string }>`
  padding: ${vibeTheme.spacing[1]} ${vibeTheme.spacing[2]};
  border-radius: ${vibeTheme.borderRadius.sm};
  background: ${props => props.color ? `${props.color}20` : 'rgba(139, 92, 246, 0.2)'};
  color: ${props => props.color || vibeTheme.colors.purple};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
`;
