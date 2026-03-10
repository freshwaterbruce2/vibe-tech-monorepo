import type React from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../common/Card'

export interface RevenuePoint {
  month: string
  revenue: number
}

interface RevenueChartProps {
  data: RevenuePoint[]
}

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <Card className="ui-stack ui-stack--md">
      <div className="ui-row" style={{ justifyContent: 'space-between' }}>
        <h2 className="ui-h1" style={{ fontSize: '1.125rem' }}>
          Revenue
        </h2>
        <span className="ui-muted">Last 6 months</span>
      </div>

      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#8b95a5', fontSize: 13 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
              width={56}
              tick={{ fill: '#8b95a5', fontSize: 13 }}
            />
            <Tooltip
              formatter={(value) => formatUsd(Number(value))}
              contentStyle={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.5rem',
                color: '#f0f2f5',
              }}
              labelStyle={{ color: '#8b95a5' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#667eea"
              fill="rgba(102, 126, 234, 0.22)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default RevenueChart
