import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Truck, Package, BarChart3, Shield, Clock, Zap, ChevronRight, Star, Menu, X } from 'lucide-react';
import { Button } from "@vibetech/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const LandingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for small operations',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        '5 users',
        '20 doors per month',
        'Basic pallet tracking',
        'CSV exports',
        'Community support'
      ],
      limitations: [
        'No voice commands',
        'No API access',
        'Limited reporting'
      ],
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Starter',
      description: 'Growing warehouse teams',
      monthlyPrice: 29,
      annualPrice: 24,
      usageRate: 0.10,
      features: [
        '25 users',
        '500 doors per month',
        'Voice commands',
        'Advanced pallet tracking',
        'Multi-shift support',
        'Priority email support',
        'API access',
        'Custom reports'
      ],
      limitations: [],
      cta: 'Start 14-Day Trial',
      popular: true
    },
    {
      name: 'Professional',
      description: 'Large distribution centers',
      monthlyPrice: 79,
      annualPrice: 67,
      usageRate: 0.05,
      features: [
        '100 users',
        '2,000 doors per month',
        'Everything in Starter',
        'Barcode scanning',
        'Real-time analytics',
        'Webhook integrations',
        'SSO authentication',
        'Phone support'
      ],
      limitations: [],
      cta: 'Start 14-Day Trial',
      popular: false
    },
    {
      name: 'Enterprise',
      description: 'Custom solutions at scale',
      monthlyPrice: 199,
      annualPrice: 169,
      usageRate: 'Custom',
      features: [
        'Unlimited users',
        'Unlimited doors',
        'Everything in Professional',
        'White-label options',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        '24/7 phone support',
        'On-premise deployment'
      ],
      limitations: [],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const features = [
    {
      icon: <Truck className="w-6 h-6" />,
      title: 'Smart Door Scheduling',
      description: 'AI-powered optimization for door assignments and shipment routing'
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: 'Real-Time Pallet Tracking',
      description: 'Track pallet counts and locations with instant updates across teams'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Advanced Analytics',
      description: 'Gain insights into efficiency, throughput, and optimization opportunities'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Enterprise Security',
      description: 'Bank-level encryption, SSO support, and compliance certifications'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Offline First',
      description: 'Works without internet, syncs automatically when connection returns'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Voice Commands',
      description: 'Hands-free operation with natural language voice commands'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Operations Manager',
      company: 'MegaLogistics DC',
      content: 'ShipDock reduced our door scheduling time by 75%. The voice commands are a game-changer for our team.',
      rating: 5
    },
    {
      name: 'Mike Rodriguez',
      role: 'Warehouse Director',
      company: 'FastShip Distribution',
      content: 'Finally, a solution that works offline! Our rural DC had connectivity issues, but ShipDock keeps us running.',
      rating: 5
    },
    {
      name: 'Emily Watson',
      role: 'Supply Chain VP',
      company: 'National Retail Corp',
      content: 'The analytics dashboard gives us insights we never had before. ROI was proven within 2 months.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Truck className="w-8 h-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold">ShipDock</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonials</a>
              <Button variant="ghost" onClick={() => navigate('/login')}>Sign In</Button>
              <Button onClick={() => navigate('/signup')}>Start Free Trial</Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b">
            <div className="px-4 py-2 space-y-2">
              <a href="#features" className="block py-2 text-gray-600">Features</a>
              <a href="#pricing" className="block py-2 text-gray-600">Pricing</a>
              <a href="#testimonials" className="block py-2 text-gray-600">Testimonials</a>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button className="w-full" onClick={() => navigate('/signup')}>
                Start Free Trial
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4" variant="secondary">
            🚀 Trusted by 500+ warehouses nationwide
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Ship Smarter with
            <span className="text-blue-600"> Voice-Powered</span>
            <br />Warehouse Management
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your shipping operations with AI-driven door scheduling, real-time pallet tracking,
            and hands-free voice commands. Works offline, syncs everywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" onClick={() => navigate('/signup')}>
              Start 14-Day Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate('/demo')}>
              Watch Demo
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required · Setup in 5 minutes · Cancel anytime
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Optimize Shipping
            </h2>
            <p className="text-xl text-gray-600">
              Purpose-built for modern distribution centers and warehouses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Pay only for what you use. No hidden fees.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Label htmlFor="annual-toggle">Monthly</Label>
              <Switch
                id="annual-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label htmlFor="annual-toggle">
                Annual
                <Badge className="ml-2" variant="secondary">Save 20%</Badge>
              </Label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'ring-2 ring-blue-600 scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-600">/month</span>
                    {plan.usageRate && (
                      <p className="text-sm text-gray-500 mt-2">
                        + ${plan.usageRate === 'Custom' ? 'Custom' : plan.usageRate}/door after limit
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full mb-6"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => navigate(plan.name === 'Enterprise' ? '/contact' : '/signup')}
                  >
                    {plan.cta}
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, i) => (
                      <li key={i} className="flex items-start gap-2 opacity-60">
                        <X className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm line-through">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Warehouse Teams Everywhere
            </h2>
            <p className="text-xl text-gray-600">
              Join 500+ distribution centers already using ShipDock
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardDescription className="text-base">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-sm text-gray-500">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Shipping Operations?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 500+ warehouses saving 10+ hours per week with ShipDock
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8" onClick={() => navigate('/signup')}>
              Start 14-Day Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent text-white border-white hover:bg-white hover:text-blue-600">
              Schedule Demo
            </Button>
          </div>
          <p className="mt-4 text-blue-100">
            No credit card required · Setup in 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Truck className="w-6 h-6 text-blue-400 mr-2" />
                <span className="text-white font-bold">ShipDock</span>
              </div>
              <p className="text-sm">
                Modern warehouse management for the AI era.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="hover:text-white">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/demo" className="hover:text-white">Demo</Link></li>
                <li><Link to="/api" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white">About</Link></li>
                <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link to="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link to="/status" className="hover:text-white">System Status</Link></li>
                <li><Link to="/security" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>© 2025 ShipDock. All rights reserved. | <Link to="/privacy" className="hover:text-white">Privacy</Link> | <Link to="/terms" className="hover:text-white">Terms</Link></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;