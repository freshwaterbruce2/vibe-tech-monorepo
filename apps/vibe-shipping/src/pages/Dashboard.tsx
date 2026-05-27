import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle,
  MapPin,
  TrendingUp,
  Bell,
  Plus,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { Input } from "@vibetech/ui";

const Dashboard = () => {
  // Mock data for demonstration
  const shipmentStats = {
    totalShipments: 1847,
    inTransit: 342,
    delivered: 1401,
    delayed: 104,
    onTimeDelivery: 87.3
  };

  const recentShipments = [
    {
      id: "SHP-001847",
      destination: "DC 6024",
      status: "In Transit",
      progress: 75,
      eta: "2 hours",
      door: "332"
    },
    {
      id: "SHP-001846",
      destination: "DC 6070",
      status: "Delivered",
      progress: 100,
      eta: "Completed",
      door: "338"
    },
    {
      id: "SHP-001845",
      destination: "DC 6039",
      status: "Loading",
      progress: 25,
      eta: "4 hours",
      door: "354"
    },
    {
      id: "SHP-001844",
      destination: "DC 6040",
      status: "Delayed",
      progress: 60,
      eta: "3 hours",
      door: "342"
    }
  ];

  const activeLoads = [
    {
      door: "332",
      trailer: "TR-8901",
      type: "23/43",
      pallets: 18,
      destination: "DC 6024",
      priority: "High"
    },
    {
      door: "338",
      trailer: "TR-8902",
      type: "28",
      pallets: 22,
      destination: "DC 6070",
      priority: "Normal"
    },
    {
      door: "354",
      trailer: "TR-8903",
      type: "XD",
      pallets: 15,
      destination: "DC 6039",
      priority: "High"
    }
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Delivered": return "default";
      case "In Transit": return "secondary";
      case "Loading": return "outline";
      case "Delayed": return "destructive";
      default: return "secondary";
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === "High" ? "text-red-600" : "text-blue-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shipping Dashboard</h1>
          <p className="text-gray-600 mt-1">DC 8980 Operations Overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Shipment
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipmentStats.totalShipments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipmentStats.inTransit}</div>
            <p className="text-xs text-muted-foreground">Active shipments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipmentStats.onTimeDelivery}%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipmentStats.delayed}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="shipments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shipments">Recent Shipments</TabsTrigger>
          <TabsTrigger value="loads">Active Loads</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
        </TabsList>

        {/* Recent Shipments Tab */}
        <TabsContent value="shipments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Shipments</CardTitle>
                  <CardDescription>Latest shipment updates and status</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search shipments..." className="pl-8 w-64" />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentShipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-8 rounded-full bg-blue-500"></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{shipment.id}</p>
                          <Badge variant={getStatusBadgeVariant(shipment.status)}>
                            {shipment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Door {shipment.door} → {shipment.destination}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">ETA: {shipment.eta}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={shipment.progress} className="w-20" />
                          <span className="text-xs text-gray-500">{shipment.progress}%</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Loads Tab */}
        <TabsContent value="loads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Loading Operations</CardTitle>
              <CardDescription>Current door assignments and loading status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {activeLoads.map((load, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Door {load.door}</p>
                          <Badge variant="outline">{load.type}</Badge>
                          <span className={`text-sm font-medium ${getPriorityColor(load.priority)}`}>
                            {load.priority} Priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{load.trailer} → {load.destination}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{load.pallets} Pallets</p>
                      <p className="text-sm text-gray-600">Loading</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alerts & Issues
              </CardTitle>
              <CardDescription>System notifications and issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Shipment SHP-001844 Delayed</p>
                    <p className="text-sm text-red-700">Expected delay of 3+ hours due to traffic conditions</p>
                    <p className="text-xs text-red-600 mt-1">2 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Door 354 Loading Behind Schedule</p>
                    <p className="text-sm text-yellow-700">Loading operation 45 minutes behind target completion</p>
                    <p className="text-xs text-yellow-600 mt-1">15 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Door 338 Loading Complete</p>
                    <p className="text-sm text-green-700">Shipment SHP-001846 ready for dispatch</p>
                    <p className="text-xs text-green-600 mt-1">1 hour ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Performance Update</p>
                    <p className="text-sm text-blue-700">On-time delivery rate improved by 2.1% this month</p>
                    <p className="text-xs text-blue-600 mt-1">2 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;