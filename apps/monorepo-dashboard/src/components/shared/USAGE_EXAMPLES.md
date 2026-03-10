# Shared Components Usage Examples

## MetricCard

Display key metrics with optional trend indicators and variants.

```tsx
import { MetricCard } from '@/components/shared';
import { Shield, Users, Activity } from 'lucide-react';

// Basic usage
<MetricCard
  title="Total Coverage"
  value={85.3}
  icon={Shield}
  suffix="%"
  variant="success"
/>

// With trend indicator
<MetricCard
  title="Active Users"
  value={1234}
  icon={Users}
  trend="up"
  trendValue="+12%"
  variant="success"
  subtitle="Last 7 days"
/>

// With glow effect
<MetricCard
  title="Health Score"
  value={95}
  icon={Activity}
  suffix="%"
  variant="success"
  glow={true}
/>

// Danger variant with down trend
<MetricCard
  title="Error Rate"
  value={2.4}
  icon={AlertTriangle}
  suffix="%"
  trend="down"
  trendValue="-0.5%"
  variant="danger"
/>
```

**Props:**

- `title` - Card title
- `value` - Numeric value to display
- `icon` - Lucide icon component
- `trend?` - 'up' | 'down' | 'stable'
- `trendValue?` - Trend percentage (e.g., "+2.1%")
- `variant?` - 'default' | 'success' | 'warning' | 'danger'
- `prefix?` - Value prefix (e.g., "$")
- `suffix?` - Value suffix (e.g., "%")
- `decimals?` - Decimal places (default: 0)
- `subtitle?` - Optional subtitle text
- `glow?` - Enable glow effect (default: false)

---

## TrendChart

Responsive line chart for displaying time-series data.

```tsx
import { TrendChart } from '@/components/shared';
import type { TrendDataPoint } from '@/components/shared';

// Sample data
const performanceData: TrendDataPoint[] = [
  { timestamp: new Date('2026-01-18T10:00:00'), value: 85.2 },
  { timestamp: new Date('2026-01-18T11:00:00'), value: 87.5 },
  { timestamp: new Date('2026-01-18T12:00:00'), value: 86.1 },
  { timestamp: new Date('2026-01-18T13:00:00'), value: 88.9 },
];

// Basic usage
<TrendChart
  data={performanceData}
  title="Performance Over Time"
  color="#10b981"
  yAxisLabel="Score"
/>

// Custom formatter
<TrendChart
  data={performanceData}
  title="Revenue Trend"
  color="#3b82f6"
  yAxisLabel="Revenue"
  valueFormatter={(value) => `$${value.toFixed(2)}`}
  height={400}
/>
```

**Props:**

- `data` - Array of { timestamp, value } objects
- `title` - Chart title
- `color?` - Line color (default: '#10b981' emerald)
- `yAxisLabel?` - Y-axis label
- `valueFormatter?` - Custom value formatter function
- `height?` - Chart height in pixels (default: 300)

---

## MetricTable

Sortable table with mobile-responsive horizontal scrolling.

```tsx
import { MetricTable } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import type { TableColumn } from '@/components/shared';

// Define data type
interface ProjectData {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  coverage: number;
  dependencies: number;
}

// Define columns
const columns: TableColumn<ProjectData>[] = [
  {
    header: 'Project Name',
    accessor: 'name',
    sortable: true,
  },
  {
    header: 'Status',
    accessor: 'status',
    render: (status) => <StatusBadge status={status} />,
    sortable: true,
  },
  {
    header: 'Coverage',
    accessor: 'coverage',
    render: (coverage) => `${coverage}%`,
    sortable: true,
  },
  {
    header: 'Dependencies',
    accessor: 'dependencies',
    sortable: true,
  },
];

// Sample data
const projects: ProjectData[] = [
  { name: 'vibe-code-studio', status: 'healthy', coverage: 85, dependencies: 42 },
  { name: 'nova-agent', status: 'warning', coverage: 72, dependencies: 38 },
  { name: 'crypto-enhanced', status: 'healthy', coverage: 90, dependencies: 15 },
];

// Render table
<MetricTable
  columns={columns}
  data={projects}
  emptyMessage="No projects found"
  stickyHeader={true}
/>
```

**Props:**

- `columns` - Array of column definitions
- `data` - Array of data objects
- `emptyMessage?` - Message when no data (default: "No data available")
- `stickyHeader?` - Enable sticky header on scroll (default: false)

**Column Definition:**

- `header` - Column header text
- `accessor` - Object key to access value (supports nested like 'user.name')
- `render?` - Custom render function (value, row) => ReactNode
- `sortable?` - Enable sorting (default: true)
- `className?` - Custom CSS classes

---

## Complete Example

```tsx
import { MetricCard, TrendChart, MetricTable } from '@/components/shared';
import { Shield, TrendingUp, Package } from 'lucide-react';

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total Coverage"
          value={85.3}
          icon={Shield}
          suffix="%"
          trend="up"
          trendValue="+2.1%"
          variant="success"
        />
        <MetricCard
          title="Active Projects"
          value={52}
          icon={Package}
          trend="stable"
          variant="default"
        />
        <MetricCard
          title="Build Success Rate"
          value={94.7}
          icon={TrendingUp}
          suffix="%"
          trend="up"
          trendValue="+5.2%"
          variant="success"
          glow={true}
        />
      </div>

      {/* Trend Chart */}
      <TrendChart
        data={performanceData}
        title="Coverage Trend (7 Days)"
        color="#10b981"
        yAxisLabel="Coverage %"
      />

      {/* Projects Table */}
      <MetricTable
        columns={projectColumns}
        data={projects}
        stickyHeader={true}
      />
    </div>
  );
}
```

---

## Styling Notes

All components use:

- **Tailwind CSS 3.4.18** for styling
- **clsx** for conditional classes
- **lucide-react** for icons
- **Responsive design** (mobile-first)
- **Dark theme** compatible

Components follow the dashboard's existing design patterns:

- Gradient backgrounds: `bg-gradient-to-br from-{color}-500/20 to-{color}-600/5`
- Borders: `border border-{color}-500/30`
- Rounded corners: `rounded-lg`
- Padding: `p-6`
- Hover effects: `hover:shadow-lg hover:scale-[1.02]`
