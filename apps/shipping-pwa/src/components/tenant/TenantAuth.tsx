import { useState, type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Building, MapPin } from 'lucide-react';
import { useTenantAuth } from '@/contexts/TenantAuthContext';
import { tenantApi, CreateTenantRequest } from '@/services/tenantApiService';
import { defaultWarehouseConfig } from '@/config/warehouse';
import { toast } from 'sonner';

 
export const TenantAuth = () => {
  const { login, isLoading, error, clearError } = useTenantAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginForm, setLoginForm] = useState({
    apiKey: '',
    tenantId: ''
  });

  // Signup form state
  const [signupForm, setSignupForm] = useState<CreateTenantRequest>({
    name: '',
    subdomain: '',
    config: {
      ...defaultWarehouseConfig,
      companyName: '',
      warehouseName: '',
      warehouseCode: '',
      appName: '',
      appShortName: '',
      appDescription: '',
      location: {
        address: '',
        city: '',
        state: '',
        zipCode: ''
      }
    }
  });

  const [signupLoading, setSignupLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!loginForm.apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    const success = await login({
      apiKey: loginForm.apiKey.trim(),
      tenantId: loginForm.tenantId.trim() || undefined
    });

    if (success) {
      toast.success('Successfully logged in!');
      setLoginForm({ apiKey: '', tenantId: '' });
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSignupLoading(true);

    try {
      // Validate required fields
      const { name, subdomain, config } = signupForm;
      if (!name.trim() || !subdomain.trim() || !config.companyName.trim()) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Create tenant
      const response = await tenantApi.createTenant(signupForm);

      if (response.success) {
        toast.success(`Welcome to your new warehouse system! Your API key is: ${response.tenant.apiKey}`);

        // Automatically log in with the new credentials
        const loginSuccess = await login({
          apiKey: response.tenant.apiKey,
          tenantId: response.tenant.id
        });

        if (loginSuccess) {
          // Reset form
          setSignupForm({
            name: '',
            subdomain: '',
            config: {
              ...defaultWarehouseConfig,
              companyName: '',
              warehouseName: '',
              warehouseCode: '',
              appName: '',
              appShortName: '',
              appDescription: '',
              location: {
                address: '',
                city: '',
                state: '',
                zipCode: ''
              }
            }
          });

          toast.success('Account created and logged in successfully!');
        }
      }
    } catch (_error) {
      const errorMessage = _error instanceof Error ? _error.message : 'Failed to create account';
      toast.error(errorMessage);
    } finally {
      setSignupLoading(false);
    }
  };

  const updateSignupField = (field: string, value: any, isNested = false, parent?: string) => {
    setSignupForm(prev => {
      if (isNested && parent) {
        const parentValue = prev[parent as keyof CreateTenantRequest];
        if (typeof parentValue === 'object' && parentValue !== null && !Array.isArray(parentValue)) {
          return {
            ...prev,
            [parent]: {
              ...parentValue,
              [field]: value
            }
          };
        }
        return prev;
      } else if (isNested) {
        return {
          ...prev,
          config: {
            ...prev.config,
            [field]: value
          }
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Your Warehouse System</h1>
        <p className="text-muted-foreground">
          Sign in to your existing account or create a new warehouse management system
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Create Account</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Sign In to Your Account
              </CardTitle>
              <CardDescription>
                Enter your API key to access your warehouse management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={loginForm.apiKey}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="sk_..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tenantId">Tenant ID (optional)</Label>
                  <Input
                    id="tenantId"
                    value={loginForm.tenantId}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, tenantId: e.target.value }))}
                    placeholder="tenant_..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Create Your Warehouse Account
              </CardTitle>
              <CardDescription>
                Set up your customized warehouse management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-name">Organization Name *</Label>
                      <Input
                        id="signup-name"
                        value={signupForm.name}
                        onChange={(e) => updateSignupField('name', e.target.value)}
                        placeholder="Acme Logistics Inc."
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-subdomain">Subdomain *</Label>
                      <Input
                        id="signup-subdomain"
                        value={signupForm.subdomain}
                        onChange={(e) => updateSignupField('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="acmelogistics"
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Your URL: {signupForm.subdomain || 'yoursubdomain'}.yourdomain.com
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-company">Company Name *</Label>
                      <Input
                        id="signup-company"
                        value={signupForm.config.companyName}
                        onChange={(e) => updateSignupField('companyName', e.target.value, true)}
                        placeholder="Acme Logistics Inc."
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-warehouse">Warehouse Name *</Label>
                      <Input
                        id="signup-warehouse"
                        value={signupForm.config.warehouseName}
                        onChange={(e) => updateSignupField('warehouseName', e.target.value, true)}
                        placeholder="Main Distribution Center"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* App Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">App Configuration</h3>
                  <div>
                    <Label htmlFor="signup-app-name">App Name</Label>
                    <Input
                      id="signup-app-name"
                      value={signupForm.config.appName}
                      onChange={(e) => updateSignupField('appName', e.target.value, true)}
                      placeholder="Acme Shipping System"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-app-description">App Description</Label>
                    <Textarea
                      id="signup-app-description"
                      value={signupForm.config.appDescription}
                      onChange={(e) => updateSignupField('appDescription', e.target.value, true)}
                      placeholder="Streamlined shipping operations for Acme Logistics"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h3>
                  <div>
                    <Label htmlFor="signup-address">Address</Label>
                    <Input
                      id="signup-address"
                      value={signupForm.config.location.address}
                      onChange={(e) => updateSignupField('address', e.target.value, true, 'location')}
                      placeholder="123 Warehouse Blvd"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="signup-city">City</Label>
                      <Input
                        id="signup-city"
                        value={signupForm.config.location.city}
                        onChange={(e) => updateSignupField('city', e.target.value, true, 'location')}
                        placeholder="Industrial City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-state">State</Label>
                      <Input
                        id="signup-state"
                        value={signupForm.config.location.state}
                        onChange={(e) => updateSignupField('state', e.target.value, true, 'location')}
                        placeholder="TX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-zip">ZIP Code</Label>
                      <Input
                        id="signup-zip"
                        value={signupForm.config.location.zipCode}
                        onChange={(e) => updateSignupField('zipCode', e.target.value, true, 'location')}
                        placeholder="75001"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={signupLoading}>
                  {signupLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  You'll receive a free 30-day trial with up to 5 users and 20 doors
                </p>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};