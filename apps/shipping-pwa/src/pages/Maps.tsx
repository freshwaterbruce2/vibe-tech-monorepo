import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@vibetech/ui'
import {
  AlertTriangle,
  Building2,
  Clock,
  Filter,
  Globe,
  Layers,
  MapPin,
  MoreVertical,
  Navigation,
  Navigation2,
  RefreshCw,
  Route,
  Search,
  Truck,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const Maps = () => {
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null)
  const [mapView, setMapView] = useState<'satellite' | 'street' | 'terrain'>(
    'street'
  )
  const [showTraffic, setShowTraffic] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)

  // Mock data for demonstration
  const activeShipments = [
    {
      id: 'SHP-001847',
      vehicle: 'TR-8901',
      driver: 'John Martinez',
      origin: 'DC 8980',
      destination: 'DC 6024 - Atlanta',
      coordinates: { lat: 33.749, lng: -84.388 },
      status: 'In Transit',
      progress: 75,
      eta: '2:15 PM',
      distance: '285 miles',
      speed: '65 mph',
      estimatedDelay: null,
      priority: 'High',
      cargo: 'Electronics - 18 pallets',
    },
    {
      id: 'SHP-001846',
      vehicle: 'TR-8902',
      driver: 'Sarah Chen',
      origin: 'DC 8980',
      destination: 'DC 6070 - Charlotte',
      coordinates: { lat: 35.2271, lng: -80.8431 },
      status: 'Loading',
      progress: 25,
      eta: '4:30 PM',
      distance: '245 miles',
      speed: '0 mph',
      estimatedDelay: null,
      priority: 'Normal',
      cargo: 'Home & Garden - 22 pallets',
    },
    {
      id: 'SHP-001845',
      vehicle: 'TR-8903',
      driver: 'Mike Rodriguez',
      origin: 'DC 8980',
      destination: 'DC 6039 - Memphis',
      coordinates: { lat: 35.1495, lng: -90.049 },
      status: 'Delayed',
      progress: 60,
      eta: '5:45 PM',
      distance: '340 miles',
      speed: '15 mph',
      estimatedDelay: '45 min',
      priority: 'High',
      cargo: 'Grocery - 15 pallets',
    },
  ]

  const warehouseLocations = [
    {
      id: 'DC-8980',
      name: 'DC 8980 - Bentonville',
      type: 'origin',
      coordinates: { lat: 36.3729, lng: -94.2088 },
      address: '702 SW 8th St, Bentonville, AR 72712',
      active: true,
    },
    {
      id: 'DC-6024',
      name: 'DC 6024 - Atlanta',
      type: 'destination',
      coordinates: { lat: 33.749, lng: -84.388 },
      address: 'Atlanta Distribution Center, GA',
      active: true,
    },
    {
      id: 'DC-6070',
      name: 'DC 6070 - Charlotte',
      type: 'destination',
      coordinates: { lat: 35.2271, lng: -80.8431 },
      address: 'Charlotte Distribution Center, NC',
      active: true,
    },
    {
      id: 'DC-6039',
      name: 'DC 6039 - Memphis',
      type: 'destination',
      coordinates: { lat: 35.1495, lng: -90.049 },
      address: 'Memphis Distribution Center, TN',
      active: true,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Transit':
        return 'bg-blue-500'
      case 'Loading':
        return 'bg-yellow-500'
      case 'Delayed':
        return 'bg-red-500'
      case 'Delivered':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'In Transit':
        return 'secondary'
      case 'Loading':
        return 'outline'
      case 'Delayed':
        return 'destructive'
      case 'Delivered':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const getPriorityColor = (priority: string) => {
    return priority === 'High' ? 'text-red-600' : 'text-blue-600'
  }

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return undefined

    const interval = setInterval(() => {
      // Simulate real-time updates
      console.warn('Refreshing map data...')
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Real-Time Tracking
          </h1>
          <p className="text-gray-600 mt-1">
            Live shipment tracking and route optimization
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <label htmlFor="auto-refresh" className="text-sm">
              Auto-refresh
            </label>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Live Tracking Map
                </CardTitle>
                <div className="flex gap-2">
                  <Select
                    value={mapView}
                    onValueChange={v =>
                      setMapView(v as 'satellite' | 'terrain' | 'street')
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Street</SelectItem>
                      <SelectItem value="satellite">Satellite</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Layers className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Interactive map showing real-time vehicle positions and routes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Map Placeholder */}
              <div className="w-full h-96 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg relative overflow-hidden border-2 border-dashed border-gray-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">
                      Interactive Map Component
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Real-time tracking visualization would appear here
                    </p>
                  </div>
                </div>

                {/* Simulated Vehicle Markers */}
                <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse">
                  <div className="absolute -top-6 -left-8 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    TR-8901
                  </div>
                </div>
                <div className="absolute top-2/3 left-1/2 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-lg">
                  <div className="absolute -top-6 -left-8 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    TR-8902
                  </div>
                </div>
                <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-bounce">
                  <div className="absolute -top-6 -left-8 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    TR-8903
                  </div>
                </div>

                {/* Simulated Route Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <pattern
                      id="routePattern"
                      x="0"
                      y="0"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="2" cy="2" r="1" fill="#3B82F6" />
                    </pattern>
                  </defs>
                  <path
                    d="M 100 100 Q 200 50 300 150"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="10,5"
                    className="animate-pulse"
                  />
                  <path
                    d="M 120 120 Q 250 80 400 200"
                    stroke="#EAB308"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="8,4"
                  />
                </svg>

                {/* Map Controls */}
                <div className="absolute top-4 right-4 space-y-2">
                  <Button variant="outline" size="sm" className="w-10 h-10 p-0">
                    <Navigation2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="w-10 h-10 p-0">
                    <Zap className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-10 h-8 p-0 text-lg font-bold"
                    >
                      +
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-10 h-8 p-0 text-lg font-bold"
                    >
                      −
                    </Button>
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
                  <h4 className="text-sm font-medium mb-2">Legend</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>In Transit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Loading</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Delayed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Delivered</span>
                    </div>
                  </div>
                </div>

                {/* Map Settings */}
                <div className="absolute top-4 left-4 space-y-2">
                  <div className="bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Switch
                        checked={showTraffic}
                        onCheckedChange={setShowTraffic}
                      />
                      <span className="text-sm">Traffic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={showRoutes}
                        onCheckedChange={setShowRoutes}
                      />
                      <span className="text-sm">Routes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Controls */}
              <div className="mt-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">
                    Auto-refresh interval:
                  </label>
                  <div className="flex items-center gap-2 w-32">
                    <Slider
                      value={[refreshInterval]}
                      onValueChange={value =>
                        setRefreshInterval(value[0] ?? 10)
                      }
                      max={120}
                      min={10}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-600 w-8">
                      {refreshInterval}s
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Route Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Route Analytics
              </CardTitle>
              <CardDescription>
                Real-time route optimization and traffic analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">847 mi</div>
                  <div className="text-sm text-gray-600">Total Distance</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    6.2 hrs
                  </div>
                  <div className="text-sm text-gray-600">Avg Travel Time</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">2</div>
                  <div className="text-sm text-gray-600">Traffic Delays</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Vehicle Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search vehicles..." className="pl-8" />
              </div>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  <SelectItem value="in-transit">In Transit</SelectItem>
                  <SelectItem value="loading">Loading</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Active Shipments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Active Shipments ({activeShipments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activeShipments.map(shipment => (
                  <div
                    key={shipment.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedShipment === shipment.id
                        ? 'border-blue-500 bg-blue-50'
                        : ''
                    }`}
                    onClick={() => setSelectedShipment(shipment.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {shipment.vehicle}
                          </span>
                          <Badge
                            variant={getStatusBadgeVariant(shipment.status)}
                            className="text-xs"
                          >
                            {shipment.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {shipment.driver}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium ${getPriorityColor(shipment.priority)}`}
                      >
                        {shipment.priority}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">
                          → {shipment.destination}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">
                          ETA: {shipment.eta}
                        </span>
                        {shipment.estimatedDelay && (
                          <span className="text-red-600 font-medium">
                            (+{shipment.estimatedDelay})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">
                          {shipment.distance} @ {shipment.speed}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{shipment.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getStatusColor(shipment.status)}`}
                          style={{ width: `${shipment.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Warehouse Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {warehouseLocations.map(location => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          location.type === 'origin'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{location.name}</p>
                        <p className="text-xs text-gray-600">{location.id}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Live Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Traffic Delay
                    </p>
                    <p className="text-xs text-red-700">
                      TR-8903 delayed 45min on I-40
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Loading Alert
                    </p>
                    <p className="text-xs text-yellow-700">
                      TR-8902 loading behind schedule
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Maps
