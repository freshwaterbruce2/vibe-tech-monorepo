import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibetech/ui'
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  Filter,
  PieChart as PieChartIcon,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d')

  // Mock data for charts
  const shipmentVolumeData = [
    { date: 'Mon', shipments: 45, delivered: 42, delayed: 3 },
    { date: 'Tue', shipments: 52, delivered: 48, delayed: 4 },
    { date: 'Wed', shipments: 38, delivered: 36, delayed: 2 },
    { date: 'Thu', shipments: 61, delivered: 55, delayed: 6 },
    { date: 'Fri', shipments: 49, delivered: 46, delayed: 3 },
    { date: 'Sat', shipments: 33, delivered: 31, delayed: 2 },
    { date: 'Sun', shipments: 28, delivered: 27, delayed: 1 },
  ]

  const performanceTrends = [
    { month: 'Jan', onTime: 85.2, efficiency: 78.5, satisfaction: 92.1 },
    { month: 'Feb', onTime: 87.1, efficiency: 82.3, satisfaction: 93.2 },
    { month: 'Mar', onTime: 89.3, efficiency: 85.1, satisfaction: 94.5 },
    { month: 'Apr', onTime: 86.7, efficiency: 83.8, satisfaction: 91.8 },
    { month: 'May', onTime: 91.2, efficiency: 87.9, satisfaction: 95.3 },
    { month: 'Jun', onTime: 88.9, efficiency: 86.2, satisfaction: 94.1 },
  ]

  const destinationData = [
    { name: 'DC 6024', value: 35, color: '#8884d8' },
    { name: 'DC 6070', value: 28, color: '#82ca9d' },
    { name: 'DC 6039', value: 20, color: '#ffc658' },
    { name: 'DC 6040', value: 12, color: '#ff7300' },
    { name: 'DC 7045', value: 5, color: '#00ff88' },
  ]

  const doorUtilizationData = [
    { door: '332-340', utilization: 92, shipments: 156 },
    { door: '341-350', utilization: 87, shipments: 142 },
    { door: '351-360', utilization: 94, shipments: 168 },
    { door: '361-370', utilization: 78, shipments: 124 },
    { door: '371-380', utilization: 83, shipments: 135 },
    { door: '381-390', utilization: 89, shipments: 151 },
    { door: '391-400', utilization: 91, shipments: 158 },
    { door: '401-410', utilization: 76, shipments: 118 },
    { door: '411-420', utilization: 85, shipments: 139 },
    { door: '421-430', utilization: 88, shipments: 145 },
    { door: '431-440', utilization: 93, shipments: 162 },
    { door: '441-454', utilization: 82, shipments: 131 },
  ]

  const kpiData = [
    {
      title: 'Average Load Time',
      value: '2.4 hrs',
      change: -0.3,
      trend: 'down',
      icon: Clock,
      description: '15 min improvement',
    },
    {
      title: 'Fleet Utilization',
      value: '87.3%',
      change: 2.1,
      trend: 'up',
      icon: Truck,
      description: '+2.1% from last period',
    },
    {
      title: 'Error Rate',
      value: '1.2%',
      change: -0.5,
      trend: 'down',
      icon: AlertTriangle,
      description: '0.5% reduction',
    },
    {
      title: 'Target Achievement',
      value: '94.7%',
      change: 1.8,
      trend: 'up',
      icon: Target,
      description: 'Above 94% target',
    },
  ]

  const formatTooltipValue = (value: any, name?: string) => {
    if (name === 'onTime' || name === 'efficiency' || name === 'satisfaction') {
      return [
        `${value}%`,
        name === 'onTime'
          ? 'On-Time %'
          : name === 'efficiency'
            ? 'Efficiency %'
            : 'Satisfaction %',
      ]
    }
    return [value, name]
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Performance insights and operational metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon
          const isPositive = kpi.trend === 'up'
          const TrendIcon = isPositive ? TrendingUp : TrendingDown

          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon
                    className={`h-3 w-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                  />
                  <span
                    className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {Math.abs(kpi.change)}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {kpi.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="volume" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Volume
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Distribution
          </TabsTrigger>
          <TabsTrigger value="utilization" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Utilization
          </TabsTrigger>
        </TabsList>

        {/* Volume Analytics */}
        <TabsContent value="volume" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Shipment Volume</CardTitle>
                <CardDescription>
                  Shipments processed over the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={shipmentVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="delivered" fill="#22c55e" name="Delivered" />
                    <Bar dataKey="delayed" fill="#ef4444" name="Delayed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipment Trend</CardTitle>
                <CardDescription>
                  Volume trend with success rate overlay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={shipmentVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="shipments"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      name="Total Shipments"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Analytics */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Key performance metrics over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[70, 100]} />
                  <Tooltip formatter={formatTooltipValue} />
                  <Line
                    type="monotone"
                    dataKey="onTime"
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="On-Time Delivery"
                  />
                  <Line
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Operational Efficiency"
                  />
                  <Line
                    type="monotone"
                    dataKey="satisfaction"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    name="Customer Satisfaction"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Analytics */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Shipments by Destination</CardTitle>
                <CardDescription>
                  Distribution of shipments across DCs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={destinationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {destinationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribution Summary</CardTitle>
                <CardDescription>
                  Detailed breakdown by destination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {destinationData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{item.value}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Utilization Analytics */}
        <TabsContent value="utilization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Door Utilization Analysis</CardTitle>
              <CardDescription>
                Efficiency metrics by door range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={doorUtilizationData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="door" type="category" width={80} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'utilization' ? `${value}%` : value,
                      name === 'utilization' ? 'Utilization' : 'Shipments',
                    ]}
                  />
                  <Bar
                    dataKey="utilization"
                    fill="#3b82f6"
                    name="utilization"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Analytics
