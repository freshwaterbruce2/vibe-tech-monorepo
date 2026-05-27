import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

 
export const AdminLogin = () => {
  const { login, isLoading, error, clearError, isAuthenticated } = useAdminAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error('Please enter both username and password');
      return;
    }

    const success = await login(formData.username.trim(), formData.password);

    if (success) {
      toast.success('Successfully logged in to admin panel');
      // Navigation will happen automatically due to the Navigate component above
    } else {
      toast.error('Login failed. Please check your credentials.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 text-white rounded-full mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
          <p className="text-slate-600">
            Sign in to access the warehouse management system administration
          </p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Administrator Login
            </CardTitle>
            <CardDescription>
              Enter your admin credentials to access the management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter your username"
                  disabled={isLoading}
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !formData.username.trim() || !formData.password.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Sign In to Admin Panel
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Default Admin Credentials</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <div>
                  <strong>Username:</strong> superadmin
                </div>
                <div>
                  <strong>Password:</strong> admin123!
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  These are the default credentials created on first startup.
                  Please change them in production.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Warehouse Management System Administration v1.0
          </p>
        </div>
      </div>
    </div>
  );
};