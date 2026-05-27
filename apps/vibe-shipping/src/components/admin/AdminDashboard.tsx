import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  LogOut,
  Building,
  DollarSign,
  Activity,
  Search,
  Pause,
  Play,
  AlertTriangle
} from 'lucide-react';
import { useAdminAuth, useAdminApi } from '@/contexts/AdminAuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  apiKey: string;
  isActive: boolean;
  ownerEmail?: string;
  subscription: {
    tier: string;
    status: string;
    expiresAt: string;
    maxUsers: number;
    maxDoors: number;
  };
  audit: {
    createdBy?: string;
    lastModifiedBy?: string;
    suspendedBy?: string;
    suspendedAt?: string;
    suspensionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Metrics {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    byTier: {
      free: number;
      starter: number;
      professional: number;
      enterprise: number;
    };
  };
  system: {
    uptime: number;
    requests: number;
    errors: number;
    errorRate: string;
    memoryUsage: any;
  };
}

 
export const AdminDashboard = () => {
  const { isAuthenticated, admin, logout } = useAdminAuth();
  const adminApi = useAdminApi();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [tenantsData, metricsData] = await Promise.all([
        adminApi.get('/api/admin/tenants'),
        adminApi.get('/api/admin/metrics')
      ]);

      if (tenantsData.success) {
        setTenants(tenantsData.tenants);
      }

      if (metricsData.success) {
        setMetrics(metricsData.metrics);
      }
    } catch (_error) {
      console.error('Failed to load dashboard data:', _error);
      setError(_error instanceof Error ? _error.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [adminApi]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  const handleSuspendTenant = async (tenantId: string, reason: string) => {
    try {
      const result = await adminApi.post(`/api/admin/tenants/${tenantId}/suspend`, { reason });

      if (result.success) {
        toast.success('Tenant suspended successfully');
        loadDashboardData(); // Refresh data
      } else {
        toast.error(result.error ?? 'Failed to suspend tenant');
      }
    } catch (_error) {
      console.error('Failed to suspend tenant:', _error);
      toast.error('Failed to suspend tenant');
    }
  };

  const handleReactivateTenant = async (tenantId: string) => {
    try {
      const result = await adminApi.post(`/api/admin/tenants/${tenantId}/reactivate`);

      if (result.success) {
        toast.success('Tenant reactivated successfully');
        loadDashboardData(); // Refresh data
      } else {
        toast.error(result.error ?? 'Failed to reactivate tenant');
      }
    } catch (_error) {
      console.error('Failed to reactivate tenant:', _error);
      toast.error('Failed to reactivate tenant');
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-500';
      case 'starter': return 'bg-blue-500';
      case 'professional': return 'bg-purple-500';
      case 'enterprise': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive || status === 'suspended') return 'bg-red-100 text-red-800';
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'cancelled') return 'bg-gray-100 text-gray-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Warehouse Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{admin?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{admin?.role}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.tenants.total}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.tenants.active} active, {metrics.tenants.suspended} suspended
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatUptime(metrics.system.uptime)}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.system.requests} total requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.system.errorRate}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.system.errors} total errors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Tiers</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Pro:</span>
                    <span>{metrics.tenants.byTier.professional}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Enterprise:</span>
                    <span>{metrics.tenants.byTier.enterprise}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tenants Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Tenant Management</CardTitle>
                <CardDescription>
                  Manage all warehouse tenants and their subscriptions
                </CardDescription>
              </div>
              <Button onClick={loadDashboardData} variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search tenants by name, subdomain, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tenants Table */}
            <div className="space-y-4">
              {filteredTenants.map((tenant) => (
                <div key={tenant.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{tenant.name}</h3>
                        <Badge className={getTierColor(tenant.subscription.tier)}>
                          {tenant.subscription.tier}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(tenant.subscription.status, tenant.isActive)}>
                          {tenant.isActive ? tenant.subscription.status : 'suspended'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <strong>Subdomain:</strong> {tenant.subdomain}
                        </div>
                        <div>
                          <strong>API Key:</strong> {tenant.apiKey}
                        </div>
                        <div>
                          <strong>Created:</strong> {new Date(tenant.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                          <strong>Max Users:</strong> {tenant.subscription.maxUsers}
                        </div>
                        <div>
                          <strong>Max Doors:</strong> {tenant.subscription.maxDoors}
                        </div>
                        <div>
                          <strong>Expires:</strong> {new Date(tenant.subscription.expiresAt).toLocaleDateString()}
                        </div>
                      </div>

                      {tenant.audit.suspensionReason && (
                        <div className="mt-2 text-sm text-red-600">
                          <strong>Suspension Reason:</strong> {tenant.audit.suspensionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {tenant.isActive ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Suspend
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Suspend Tenant</DialogTitle>
                              <DialogDescription>
                                This will suspend the tenant "{tenant.name}" and disable their access.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Reason for suspension:</label>
                                <Input
                                  value={suspensionReason}
                                  onChange={(e) => setSuspensionReason(e.target.value)}
                                  placeholder="Enter suspension reason..."
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSuspensionReason('')}>
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    if (suspensionReason.trim()) {
                                      handleSuspendTenant(tenant.id, suspensionReason);
                                      setSuspensionReason('');
                                    }
                                  }}
                                  disabled={!suspensionReason.trim()}
                                >
                                  Suspend Tenant
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => handleReactivateTenant(tenant.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredTenants.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No tenants found matching your search.' : 'No tenants found.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};