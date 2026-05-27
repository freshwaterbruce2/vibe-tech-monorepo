import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { apiFetch } from '@/utils/api';
import { Button } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Crown, ArrowUpRight, Check, AlertTriangle } from 'lucide-react';
import { useTenantAuth } from '@/contexts/TenantAuthContext';
import { tenantApi } from '@/services/tenantApiService';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: {
    maxUsers: number;
    maxDoors: number;
    voiceCommands: boolean;
    palletTracking: boolean;
    multiShift: boolean;
    barcodeScanning: boolean;
    prioritySupport: boolean;
  };
}

interface PaymentStatus {
  subscription: {
    tier: string;
    status: string;
    expiresAt: string;
    maxUsers: number;
    maxDoors: number;
  };
  usage: {
    doors: number;
    users: number;
  };
  limits: {
    doors: { used: number; max: number };
    users: { used: number; max: number };
  };
  needsUpgrade: boolean;
  upgradeReasons: string[];
  availableUpgrades: SubscriptionPlan[];
}

interface UpgradeButtonProps {
  variant?: 'button' | 'banner' | 'card';
  className?: string;
  showDetails?: boolean;
}

 
export const UpgradeButton = ({
  variant = 'button',
  className = '',
  showDetails: _showDetails = false
}: UpgradeButtonProps) => {
  const { isAuthenticated, tenantInfo: _tenantInfo } = useTenantAuth();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadPaymentStatus();
      loadAvailablePlans();
    }
  }, [isAuthenticated]);

  const loadPaymentStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch('/api/payment/status', {
        headers: {
          'Authorization': `Bearer ${tenantApi.getCredentials()?.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPaymentStatus(data);
        }
      }
    } catch (error) {
      console.error('Failed to load payment status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailablePlans = async () => {
    try {
      const response = await apiFetch('/api/payment/plans');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailablePlans(data.plans);
        }
      }
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setIsUpgrading(true);
      const credentials = tenantApi.getCredentials();
      if (!credentials) {
        toast.error('Authentication required');
        return;
      }

      const response = await apiFetch('/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.apiKey}`
        },
        body: JSON.stringify({
          planId,
          redirectUrl: `${window.location.origin}/settings?upgraded=true`
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.checkoutUrl) {
          // Redirect to Square checkout
          window.location.href = data.checkoutUrl;
        } else {
          toast.error(data.error ?? 'Failed to create checkout session');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error ?? 'Failed to start upgrade process');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Failed to start upgrade process');
    } finally {
      setIsUpgrading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price / 100);
  };

  const getUsagePercentage = (used: number, max: number) => {
    return max === -1 ? 0 : Math.min((used / max) * 100, 100);
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

  if (!isAuthenticated || !paymentStatus) {
    return null;
  }

  if (variant === 'banner' && paymentStatus.needsUpgrade) {
    return (
      <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          <div className="flex items-center justify-between">
            <div>
              <strong>Upgrade Required:</strong> {paymentStatus.upgradeReasons.join(', ')}
            </div>
            <Button
              onClick={() => setShowUpgradeDialog(true)}
              size="sm"
              className="ml-4"
            >
              Upgrade Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription Status
          </CardTitle>
          <CardDescription>
            Manage your subscription and usage limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge className={getTierColor(paymentStatus.subscription.tier)}>
                {paymentStatus.subscription.tier.toUpperCase()}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {paymentStatus.subscription.status === 'active' ? 'Active' : 'Inactive'}
              </p>
            </div>
            {paymentStatus.needsUpgrade && (
              <Button onClick={() => setShowUpgradeDialog(true)} size="sm">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Doors Used</span>
                <span>{paymentStatus.limits.doors.used} / {paymentStatus.limits.doors.max === -1 ? '∞' : paymentStatus.limits.doors.max}</span>
              </div>
              <Progress
                value={getUsagePercentage(paymentStatus.limits.doors.used, paymentStatus.limits.doors.max)}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Users</span>
                <span>{paymentStatus.limits.users.used} / {paymentStatus.limits.users.max === -1 ? '∞' : paymentStatus.limits.users.max}</span>
              </div>
              <Progress
                value={getUsagePercentage(paymentStatus.limits.users.used, paymentStatus.limits.users.max)}
                className="h-2"
              />
            </div>
          </div>

          {paymentStatus.upgradeReasons.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                {paymentStatus.upgradeReasons.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default button variant
  return (
    <>
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogTrigger asChild>
          <Button
            variant={paymentStatus.needsUpgrade ? "default" : "outline"}
            className={className}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Crown className="h-4 w-4 mr-2" />
            )}
            {paymentStatus.needsUpgrade ? 'Upgrade Required' : 'Manage Subscription'}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Choose Your Plan
            </DialogTitle>
            <DialogDescription>
              Upgrade your subscription to unlock more features and capacity
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {availablePlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${plan.id === 'professional' ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.id === 'professional' && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="text-2xl font-bold">
                    {formatPrice(plan.price, plan.currency)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.interval}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {plan.features.maxUsers === -1 ? 'Unlimited users' : `Up to ${plan.features.maxUsers} users`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {plan.features.maxDoors === -1 ? 'Unlimited doors' : `Up to ${plan.features.maxDoors} doors`}
                      </span>
                    </div>
                    {plan.features.voiceCommands && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Voice commands</span>
                      </div>
                    )}
                    {plan.features.palletTracking && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Pallet tracking</span>
                      </div>
                    )}
                    {plan.features.multiShift && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Multi-shift support</span>
                      </div>
                    )}
                    {plan.features.barcodeScanning && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Barcode scanning</span>
                      </div>
                    )}
                    {plan.features.prioritySupport && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Priority support</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={async () => handleUpgrade(plan.id)}
                    disabled={isUpgrading || plan.id === paymentStatus.subscription.tier}
                    className="w-full"
                    variant={plan.id === 'professional' ? 'default' : 'outline'}
                  >
                    {isUpgrading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : plan.id === paymentStatus.subscription.tier ? (
                      'Current Plan'
                    ) : (
                      <>
                        Upgrade Now
                        <ArrowUpRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current Usage</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Doors:</span>
                <span className="ml-2 font-medium">
                  {paymentStatus.usage.doors} / {paymentStatus.subscription.maxDoors === -1 ? '∞' : paymentStatus.subscription.maxDoors}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Users:</span>
                <span className="ml-2 font-medium">
                  {paymentStatus.usage.users} / {paymentStatus.subscription.maxUsers === -1 ? '∞' : paymentStatus.subscription.maxUsers}
                </span>
              </div>
            </div>
            {paymentStatus.upgradeReasons.length > 0 && (
              <Alert className="mt-3 border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700">
                  <strong>Upgrade needed:</strong> {paymentStatus.upgradeReasons.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};