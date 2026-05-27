import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '@/utils/api';
import { ArrowRight, Check, Loader2, Truck } from 'lucide-react';
import { Button } from "@vibetech/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface SignupFormData {
  // Account Info
  email: string;
  password: string;
  confirmPassword: string;

  // Company Info
  companyName: string;
  warehouseName: string;
  warehouseCode: string;
  subdomain: string;

  // Contact Info
  firstName: string;
  lastName: string;
  phone: string;

  // Location
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Plan Selection
  plan: 'free' | 'starter' | 'professional' | 'enterprise';

  // Warehouse Config
  doorRangeMin: number;
  doorRangeMax: number;
  avgDoorsPerDay: number;
  teamSize: number;
}

const SignupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    warehouseName: '',
    warehouseCode: '',
    subdomain: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    plan: 'starter',
    doorRangeMin: 100,
    doorRangeMax: 500,
    avgDoorsPerDay: 50,
    teamSize: 10
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const validateStep = (): boolean => {
    setError('');

    switch (step) {
      case 1:
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          setError('Please fill in all fields');
          return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        return true;

      case 2:
        if (!formData.companyName || !formData.warehouseName || !formData.subdomain) {
          setError('Please fill in all required fields');
          return false;
        }
        if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
          setError('Subdomain can only contain lowercase letters, numbers, and hyphens');
          return false;
        }
        return true;

      case 3:
        if (!formData.firstName || !formData.lastName) {
          setError('Please provide your name');
          return false;
        }
        return true;

      case 4:
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Create the tenant configuration
      const tenantConfig = {
        name: formData.companyName,
        subdomain: formData.subdomain,
        config: {
          companyName: formData.companyName,
          warehouseName: formData.warehouseName,
          warehouseCode: formData.warehouseCode || formData.subdomain.toUpperCase(),
          appName: `${formData.companyName} Shipping`,
          appShortName: formData.warehouseCode || 'WMS',
          appDescription: `Shipping management system for ${formData.warehouseName}`,
          brandColors: {
            primary: '#1f2937',
            secondary: '#3f4f5f',
            accent: '#3b82f6',
            background: '#ffffff',
            text: '#1f2937'
          },
          doorNumberRange: {
            min: formData.doorRangeMin,
            max: formData.doorRangeMax
          },
          destinationDCs: ['6024', '6070', '6039', '6040', '7045'],
          freightTypes: ['23/43', '28', 'XD'],
          location: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode
          },
          ownerEmail: formData.email,
          ownerName: `${formData.firstName} ${formData.lastName}`,
          ownerPhone: formData.phone
        },
        subscription: {
          tier: formData.plan,
          status: 'active',
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14-day trial
          maxUsers: formData.plan === 'free' ? 5 : formData.plan === 'starter' ? 25 : formData.plan === 'professional' ? 100 : -1,
          maxDoors: formData.plan === 'free' ? 20 : formData.plan === 'starter' ? 500 : formData.plan === 'professional' ? 2000 : -1
        }
      };

      // Call the API to create the tenant
      const response = await apiFetch('/api/tenants/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tenantConfig)
      });

      const data = await response.json();

      if (data.success) {
        // Store the API key and tenant info
        localStorage.setItem('tenantApiKey', data.tenant.apiKey);
        localStorage.setItem('tenantId', data.tenant.id);
        localStorage.setItem('tenantSubdomain', data.tenant.subdomain);

        toast({
          title: 'Account created successfully!',
          description: 'Redirecting to your dashboard...'
        });

        // Redirect to the onboarding wizard
        setTimeout(() => {
          navigate('/onboarding');
        }, 2000);
      } else {
        setError(data.error ?? 'Failed to create account');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof SignupFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate subdomain from company name
    if (field === 'companyName' && !formData.subdomain) {
      const subdomain = value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({
        ...prev,
        subdomain
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <Truck className="w-10 h-10 text-blue-600 mr-2" />
            <span className="text-2xl font-bold">ShipDock</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-600 mt-2">14-day free trial · No credit card required</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span className={step >= 1 ? 'text-blue-600 font-semibold' : ''}>Account</span>
            <span className={step >= 2 ? 'text-blue-600 font-semibold' : ''}>Company</span>
            <span className={step >= 3 ? 'text-blue-600 font-semibold' : ''}>Contact</span>
            <span className={step >= 4 ? 'text-blue-600 font-semibold' : ''}>Plan</span>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Account Information'}
              {step === 2 && 'Company & Warehouse Details'}
              {step === 3 && 'Contact Information'}
              {step === 4 && 'Choose Your Plan'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Create your login credentials'}
              {step === 2 && 'Tell us about your warehouse'}
              {step === 3 && 'How can we reach you?'}
              {step === 4 && 'Select the plan that fits your needs'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Account Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Company Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Acme Logistics Inc."
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="warehouseName">Warehouse Name</Label>
                  <Input
                    id="warehouseName"
                    placeholder="Main Distribution Center"
                    value={formData.warehouseName}
                    onChange={(e) => updateFormData('warehouseName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="warehouseCode">Warehouse Code (Optional)</Label>
                  <Input
                    id="warehouseCode"
                    placeholder="DC001"
                    value={formData.warehouseCode}
                    onChange={(e) => updateFormData('warehouseCode', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="subdomain">Your ShipDock URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdomain"
                      placeholder="acme"
                      value={formData.subdomain}
                      onChange={(e) => updateFormData('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <span className="text-gray-600 whitespace-nowrap">.shipdock.io</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    This will be your unique URL: {formData.subdomain || 'yourcompany'}.shipdock.io
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Contact Info */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => updateFormData('lastName', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Street Address (Optional)</Label>
                  <Input
                    id="address"
                    placeholder="123 Warehouse Blvd"
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Springfield"
                      value={formData.city}
                      onChange={(e) => updateFormData('city', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="IL"
                        maxLength={2}
                        value={formData.state}
                        onChange={(e) => updateFormData('state', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP</Label>
                      <Input
                        id="zipCode"
                        placeholder="62701"
                        value={formData.zipCode}
                        onChange={(e) => updateFormData('zipCode', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Plan Selection */}
            {step === 4 && (
              <div className="space-y-6">
                <RadioGroup
                  value={formData.plan}
                  onValueChange={(value: any) => updateFormData('plan', value)}
                >
                  <div className="space-y-4">
                    {/* Free Plan */}
                    <label htmlFor="plan-free" className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${formData.plan === 'free' ? 'border-blue-600 bg-blue-50' : ''}`}>
                      <RadioGroupItem value="free" id="plan-free" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Free</span>
                          <span className="text-2xl font-bold">$0</span>
                          <span className="text-gray-600">/month</span>
                        </div>
                        <p className="text-sm text-gray-600">5 users · 20 doors/month · Basic features</p>
                        <p className="text-sm text-gray-500 mt-1">Perfect for testing or very small operations</p>
                      </div>
                    </label>

                    {/* Starter Plan */}
                    <label htmlFor="plan-starter" className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${formData.plan === 'starter' ? 'border-blue-600 bg-blue-50' : ''}`}>
                      <RadioGroupItem value="starter" id="plan-starter" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Starter</span>
                          <span className="text-2xl font-bold">$29</span>
                          <span className="text-gray-600">/month</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">RECOMMENDED</span>
                        </div>
                        <p className="text-sm text-gray-600">25 users · 500 doors/month · Voice commands · API access</p>
                        <p className="text-sm text-gray-500 mt-1">+ $0.10 per door after 500</p>
                      </div>
                    </label>

                    {/* Professional Plan */}
                    <label htmlFor="plan-professional" className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${formData.plan === 'professional' ? 'border-blue-600 bg-blue-50' : ''}`}>
                      <RadioGroupItem value="professional" id="plan-professional" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Professional</span>
                          <span className="text-2xl font-bold">$79</span>
                          <span className="text-gray-600">/month</span>
                        </div>
                        <p className="text-sm text-gray-600">100 users · 2,000 doors/month · Advanced analytics · SSO</p>
                        <p className="text-sm text-gray-500 mt-1">+ $0.05 per door after 2,000</p>
                      </div>
                    </label>

                    {/* Enterprise Plan */}
                    <label htmlFor="plan-enterprise" className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${formData.plan === 'enterprise' ? 'border-blue-600 bg-blue-50' : ''}`}>
                      <RadioGroupItem value="enterprise" id="plan-enterprise" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Enterprise</span>
                          <span className="text-2xl font-bold">$199</span>
                          <span className="text-gray-600">/month</span>
                        </div>
                        <p className="text-sm text-gray-600">Unlimited everything · White-label · Dedicated support</p>
                        <p className="text-sm text-gray-500 mt-1">Custom usage rates available</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900">14-Day Free Trial</p>
                      <p className="text-sm text-blue-700">
                        Try all features free for 14 days. No credit card required.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {step === totalSteps ? 'Create Account' : 'Continue'}
                {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;