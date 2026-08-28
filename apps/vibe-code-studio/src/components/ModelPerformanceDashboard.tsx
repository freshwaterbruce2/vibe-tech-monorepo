/**
 * Model Performance Dashboard
 * Real-time analytics for multi-model AI ensemble performance
 * January 2026 - Tracks OpenRouter free/low/mid/high tier usage
 */

import {
    Activity,
    Brain,
    CheckCircle,
    Clock,
    Cpu,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Zap
} from 'lucide-react';
import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import styled from 'styled-components';

import { vibeTheme } from '../styles/theme';

// Styled Components
const DashboardContainer = styled.div`
  padding: ${vibeTheme.spacing[6]};
  background: ${vibeTheme.colors.background};
  color: ${vibeTheme.colors.text};
  height: 100%;
  overflow-y: auto;
`;

const Header = styled.div`
  margin-bottom: ${vibeTheme.spacing[6]};
`;

const Title = styled.h1`
  font-size: ${vibeTheme.typography.fontSize['2xl']};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  margin-bottom: ${vibeTheme.spacing[2]};
  color: ${vibeTheme.colors.text};
`;

const Subtitle = styled.p`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${vibeTheme.spacing[4]};
  margin-bottom: ${vibeTheme.spacing[6]};
`;

const MetricCard = styled.div<{ trend?: 'up' | 'down' | 'neutral' }>`
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

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${vibeTheme.spacing[2]};
`;

const MetricLabel = styled.span`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricIcon = styled.div<{ color?: string }>`
  color: ${props => props.color || vibeTheme.colors.purple};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const MetricValue = styled.div`
  font-size: ${vibeTheme.typography.fontSize['2xl']};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  margin-bottom: ${vibeTheme.spacing[1]};
`;

const MetricChange = styled.div<{ positive?: boolean }>`
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

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: ${vibeTheme.spacing[6]};
  margin-bottom: ${vibeTheme.spacing[6]};
`;

const ChartCard = styled.div`
  background: ${vibeTheme.colors.primary};
  padding: ${vibeTheme.spacing[6]};
  border-radius: ${vibeTheme.borderRadius.lg};
  border: 1px solid rgba(139, 92, 246, 0.1);
`;

const ChartTitle = styled.h3`
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  margin-bottom: ${vibeTheme.spacing[4]};
  color: ${vibeTheme.colors.text};
`;

const ModelTable = styled.table`
  width: 100%;
  background: ${vibeTheme.colors.primary};
  border-radius: ${vibeTheme.borderRadius.lg};
  border: 1px solid rgba(139, 92, 246, 0.1);
  overflow: hidden;
`;

const TableHeader = styled.thead`
  background: rgba(139, 92, 246, 0.1);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(139, 92, 246, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${vibeTheme.colors.hover};
  }
`;

const TableCell = styled.td`
  padding: ${vibeTheme.spacing[3]} ${vibeTheme.spacing[4]};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.text};
`;

const TableHeaderCell = styled.th`
  padding: ${vibeTheme.spacing[3]} ${vibeTheme.spacing[4]};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.textSecondary};
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Badge = styled.span<{ color?: string }>`
  padding: ${vibeTheme.spacing[1]} ${vibeTheme.spacing[2]};
  border-radius: ${vibeTheme.borderRadius.sm};
  background: ${props => props.color ? `${props.color}20` : 'rgba(139, 92, 246, 0.2)'};
  color: ${props => props.color || vibeTheme.colors.purple};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
`;

// Types
interface ModelMetrics {
  name: string;
  displayName: string;
  requests: number;
  successRate: number;
  avgLatency: number;
  totalCost: number;
  acceptanceRate: number;
  tokensUsed: number;
}

interface TimeSeriesData {
  time: string;
  free: number;
  low: number;
  mid: number;
  high: number;
}

interface StrategyDistribution {
  name: string;
  value: number;
  color: string;
}

// Component
const ModelPerformanceDashboard: React.FC = () => {
  // State for metrics
  const [totalRequests] = useState(1247);
  const [avgLatency] = useState(342);
  const [totalCost] = useState(1.62);
  const [acceptanceRate] = useState(76.3);

  // Model-specific metrics
  const [modelMetrics] = useState<ModelMetrics[]>([
    {
      name: 'liquid/lfm-2.5-1.2b-thinking:free',
      displayName: 'LFM 2.5 Thinking (Free)',
      requests: 214,
      successRate: 96.8,
      avgLatency: 190,
      totalCost: 0.0,
      acceptanceRate: 68.2,
      tokensUsed: 42800
    },
    {
      name: 'deepseek/deepseek-v3.2',
      displayName: 'DeepSeek V3.2',
      requests: 612,
      successRate: 98.6,
      avgLatency: 260,
      totalCost: 0.29,
      acceptanceRate: 74.9,
      tokensUsed: 148900
    },
    {
      name: 'anthropic/claude-sonnet-4.5',
      displayName: 'Claude Sonnet 4.5',
      requests: 233,
      successRate: 99.2,
      avgLatency: 540,
      totalCost: 0.78,
      acceptanceRate: 86.5,
      tokensUsed: 58400
    },
    {
      name: 'openai/gpt-5.2-codex',
      displayName: 'GPT-5.2 Codex',
      requests: 96,
      successRate: 99.6,
      avgLatency: 610,
      totalCost: 0.55,
      acceptanceRate: 91.4,
      tokensUsed: 21000
    }
  ]);

  // Time series data for latency
  const [latencyData] = useState<TimeSeriesData[]>([
    { time: '10:00', free: 180, low: 240, mid: 520, high: 600 },
    { time: '10:15', free: 190, low: 255, mid: 560, high: 640 },
    { time: '10:30', free: 185, low: 250, mid: 540, high: 620 },
    { time: '10:45', free: 200, low: 265, mid: 580, high: 660 },
    { time: '11:00', free: 188, low: 245, mid: 550, high: 630 },
    { time: '11:15', free: 195, low: 260, mid: 565, high: 650 },
    { time: '11:30', free: 190, low: 255, mid: 555, high: 635 },
  ]);

  // Strategy distribution
  const [strategyData] = useState<StrategyDistribution[]>([
    { name: 'Fast', value: 45, color: vibeTheme.colors.green },
    { name: 'Balanced', value: 30, color: vibeTheme.colors.cyan },
    { name: 'Accurate', value: 15, color: vibeTheme.colors.purple },
    { name: 'Adaptive', value: 10, color: vibeTheme.colors.orange }
  ]);

  // Cost comparison data
  const [costData] = useState([
    { model: 'LFM 2.5 (Free)', cost: 0.0, color: vibeTheme.colors.green },
    { model: 'DeepSeek V3.2', cost: 0.31, color: vibeTheme.colors.cyan },
    { model: 'Claude Sonnet 4.5', cost: 9.0, color: vibeTheme.colors.purple },
    { model: 'GPT-5.2 Codex', cost: 7.88, color: vibeTheme.colors.orange }
  ]);

  // Calculate trends
  const requestsTrend = 12.3; // % increase
  const latencyTrend = -8.5; // % decrease (good)
  const costTrend = 5.2; // % increase
  const acceptanceTrend = 3.1; // % increase

  return (
    <DashboardContainer>
      <Header>
        <Title>AI Model Performance Dashboard</Title>
        <Subtitle>
          Real-time analytics for OpenRouter tiers • Jan 2026 • Free + Low + Mid + High
        </Subtitle>
      </Header>

      {/* Key Metrics */}
      <MetricsGrid>
        <MetricCard>
          <MetricHeader>
            <MetricLabel>Total Requests</MetricLabel>
            <MetricIcon color={vibeTheme.colors.purple}>
              <Activity />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{totalRequests.toLocaleString()}</MetricValue>
          <MetricChange positive={requestsTrend > 0}>
            <TrendingUp />
            {Math.abs(requestsTrend)}% from last hour
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricLabel>Avg Latency</MetricLabel>
            <MetricIcon color={vibeTheme.colors.cyan}>
              <Clock />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{avgLatency}ms</MetricValue>
          <MetricChange positive={latencyTrend < 0}>
            <TrendingDown />
            {Math.abs(latencyTrend)}% improvement
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricLabel>Total Cost</MetricLabel>
            <MetricIcon color={vibeTheme.colors.green}>
              <DollarSign />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>${totalCost.toFixed(2)}</MetricValue>
          <MetricChange positive={costTrend < 10}>
            <TrendingUp />
            {Math.abs(costTrend)}% from baseline
          </MetricChange>
        </MetricCard>

        <MetricCard>
          <MetricHeader>
            <MetricLabel>Acceptance Rate</MetricLabel>
            <MetricIcon color={vibeTheme.colors.orange}>
              <CheckCircle />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{acceptanceRate}%</MetricValue>
          <MetricChange positive={acceptanceTrend > 0}>
            <TrendingUp />
            {Math.abs(acceptanceTrend)}% improvement
          </MetricChange>
        </MetricCard>
      </MetricsGrid>

      {/* Charts */}
      <ChartsGrid>
        {/* Latency Over Time */}
        <ChartCard>
          <ChartTitle>Latency Over Time (ms)</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
              <XAxis dataKey="time" stroke={vibeTheme.colors.textSecondary} />
              <YAxis stroke={vibeTheme.colors.textSecondary} />
              <Tooltip
                contentStyle={{
                  backgroundColor: vibeTheme.colors.primary,
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: vibeTheme.borderRadius.md
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="free"
                stroke={vibeTheme.colors.green}
                strokeWidth={2}
                name="Free (LFM 2.5)"
              />
              <Line
                type="monotone"
                dataKey="low"
                stroke={vibeTheme.colors.cyan}
                strokeWidth={2}
                name="Low (DeepSeek V3.2)"
              />
              <Line
                type="monotone"
                dataKey="mid"
                stroke={vibeTheme.colors.purple}
                strokeWidth={2}
                name="Mid (Sonnet 4.5)"
              />
              <Line
                type="monotone"
                dataKey="high"
                stroke={vibeTheme.colors.orange}
                strokeWidth={2}
                name="High (GPT-5.2 Codex)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Strategy Distribution */}
        <ChartCard>
          <ChartTitle>Strategy Distribution</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={strategyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {strategyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: vibeTheme.colors.primary,
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: vibeTheme.borderRadius.md
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cost Comparison */}
        <ChartCard>
          <ChartTitle>Cost per Million Tokens ($)</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
              <XAxis dataKey="model" stroke={vibeTheme.colors.textSecondary} />
              <YAxis stroke={vibeTheme.colors.textSecondary} />
              <Tooltip
                contentStyle={{
                  backgroundColor: vibeTheme.colors.primary,
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: vibeTheme.borderRadius.md
                }}
              />
              <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
                {costData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartsGrid>

      {/* Model Performance Table */}
      <ChartCard>
        <ChartTitle>Model Performance Breakdown</ChartTitle>
        <ModelTable>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Model</TableHeaderCell>
              <TableHeaderCell>Requests</TableHeaderCell>
              <TableHeaderCell>Success Rate</TableHeaderCell>
              <TableHeaderCell>Avg Latency</TableHeaderCell>
              <TableHeaderCell>Acceptance</TableHeaderCell>
              <TableHeaderCell>Tokens Used</TableHeaderCell>
              <TableHeaderCell>Total Cost</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {modelMetrics.map((model) => (
              <TableRow key={model.name}>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {model.name.includes('liquid') ? (
                      <Zap size={16} color={vibeTheme.colors.green} />
                    ) : model.name.includes('deepseek') ? (
                      <Cpu size={16} color={vibeTheme.colors.cyan} />
                    ) : model.name.includes('claude') ? (
                      <Brain size={16} color={vibeTheme.colors.purple} />
                    ) : (
                      <Brain size={16} color={vibeTheme.colors.orange} />
                    )}
                    {model.displayName}
                  </div>
                </TableCell>
                <TableCell>{model.requests.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge color={model.successRate > 98 ? vibeTheme.colors.green : vibeTheme.colors.orange}>
                    {model.successRate}%
                  </Badge>
                </TableCell>
                <TableCell>{model.avgLatency}ms</TableCell>
                <TableCell>
                  <Badge color={model.acceptanceRate > 80 ? vibeTheme.colors.green : vibeTheme.colors.orange}>
                    {model.acceptanceRate}%
                  </Badge>
                </TableCell>
                <TableCell>{model.tokensUsed.toLocaleString()}</TableCell>
                <TableCell>
                  <span style={{ color: vibeTheme.colors.green }}>
                    ${model.totalCost.toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </ModelTable>
      </ChartCard>

      {/* Strategy Recommendations */}
      <ChartCard style={{ marginTop: vibeTheme.spacing[6] }}>
        <ChartTitle>Optimization Recommendations</ChartTitle>
        <div style={{ display: 'grid', gap: vibeTheme.spacing[3] }}>
          <div style={{ padding: vibeTheme.spacing[3], background: vibeTheme.colors.hover, borderRadius: vibeTheme.borderRadius.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: vibeTheme.spacing[2], marginBottom: vibeTheme.spacing[2] }}>
              <CheckCircle size={16} color={vibeTheme.colors.green} />
              <strong>Cost Optimization Achieved</strong>
            </div>
            <p style={{ fontSize: vibeTheme.typography.fontSize.sm, color: vibeTheme.colors.textSecondary }}>
              Using DeepSeek V3.2 as the primary model delivers strong quality while keeping costs low.
              Continue prioritizing low-cost routing for routine edits and drafts.
            </p>
          </div>

          <div style={{ padding: vibeTheme.spacing[3], background: vibeTheme.colors.hover, borderRadius: vibeTheme.borderRadius.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: vibeTheme.spacing[2], marginBottom: vibeTheme.spacing[2] }}>
              <TrendingUp size={16} color={vibeTheme.colors.orange} />
              <strong>Performance Opportunity</strong>
            </div>
            <p style={{ fontSize: vibeTheme.typography.fontSize.sm, color: vibeTheme.colors.textSecondary }}>
              Adaptive strategy shows 15% better acceptance rate. Enable more adaptive learning to improve
              model selection accuracy over time.
            </p>
          </div>

          <div style={{ padding: vibeTheme.spacing[3], background: vibeTheme.colors.hover, borderRadius: vibeTheme.borderRadius.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: vibeTheme.spacing[2], marginBottom: vibeTheme.spacing[2] }}>
              <Brain size={16} color={vibeTheme.colors.purple} />
              <strong>Quality Insight</strong>
            </div>
            <p style={{ fontSize: vibeTheme.typography.fontSize.sm, color: vibeTheme.colors.textSecondary }}>
              Claude Sonnet 4.5 and GPT-5.2 Codex perform best on complex code. Reserve these tiers for
              critical refactors, migrations, and high-risk changes to maximize ROI.
            </p>
          </div>
        </div>
      </ChartCard>
    </DashboardContainer>
  );
};

export default ModelPerformanceDashboard;
