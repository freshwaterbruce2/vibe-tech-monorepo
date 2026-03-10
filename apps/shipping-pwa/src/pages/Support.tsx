import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  HelpCircle,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Search,
  ExternalLink,
  BookOpen,
  Video,
  Download,
  Zap,
  AlertTriangle,
  CheckCircle, Clock, User, Building, Truck,
  Package,
  BarChart3, Settings,
  Globe, Shield,
  Headphones,
  Send, Star,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Support = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [supportTicket, setSupportTicket] = useState({
    subject: "",
    category: "",
    priority: "",
    description: "",
    attachments: []
  });

  // Mock data for FAQ and support content
  const faqCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: Zap,
      description: "Basic setup and configuration",
      items: [
        {
          question: "How do I set up my warehouse configuration?",
          answer: "Navigate to Settings > Warehouse Configuration to enter your company details, door ranges, and operational preferences. The system will guide you through the initial setup process."
        },
        {
          question: "How do I add my first shipment?",
          answer: "Go to the main Dashboard page and click 'New Shipment'. Enter the door number, destination DC, freight type, and trailer status. You can also use voice commands by saying 'door [number]'."
        },
        {
          question: "Can I use this app offline?",
          answer: "Yes! This is a Progressive Web App (PWA) that works offline. Your data is stored locally and will sync when you're back online."
        }
      ]
    },
    {
      id: "shipments",
      title: "Shipment Management",
      icon: Package,
      description: "Managing shipments and tracking",
      items: [
        {
          question: "How do I track shipment progress?",
          answer: "Use the Maps page to view real-time tracking of all active shipments. Each vehicle appears as a colored marker based on its status."
        },
        {
          question: "What do the different shipment statuses mean?",
          answer: "Loading (yellow) - being loaded at warehouse, In Transit (blue) - on the road, Delayed (red) - behind schedule, Delivered (green) - completed successfully."
        },
        {
          question: "How do I export shipment data?",
          answer: "Use the Analytics page to generate reports, or click the Export button on any data table to download CSV files."
        }
      ]
    },
    {
      id: "voice-commands",
      title: "Voice Commands",
      icon: Headphones,
      description: "Using voice control features",
      items: [
        {
          question: "What voice commands are available?",
          answer: "You can say 'door [number]' to add shipments, 'delete door [number]' to remove them, 'export data' to download reports, and many more. Check the Voice Help section for a full list."
        },
        {
          question: "Why isn't voice recognition working?",
          answer: "Ensure your browser has microphone permissions enabled and you're using HTTPS. Chrome and Edge work best for voice commands."
        },
        {
          question: "Can I customize voice commands?",
          answer: "Currently, voice commands are predefined for safety and consistency. Custom commands may be added in future updates."
        }
      ]
    },
    {
      id: "analytics",
      title: "Analytics & Reporting",
      icon: BarChart3,
      description: "Understanding your data",
      items: [
        {
          question: "How do I generate performance reports?",
          answer: "Visit the Analytics page to view comprehensive performance metrics, including shipment volumes, on-time delivery rates, and door utilization statistics."
        },
        {
          question: "What metrics are tracked?",
          answer: "We track shipment volumes, delivery performance, door utilization, team efficiency, temperature compliance (if enabled), and many other operational KPIs."
        },
        {
          question: "Can I export analytics data?",
          answer: "Yes, use the Export button on the Analytics page to download reports in CSV format for further analysis in Excel or other tools."
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: AlertTriangle,
      description: "Common issues and solutions",
      items: [
        {
          question: "The app is running slowly",
          answer: "Try refreshing the page, clearing your browser cache, or closing other browser tabs. If the issue persists, check your internet connection."
        },
        {
          question: "My data isn't syncing",
          answer: "Verify your internet connection and check if you're logged into your tenant account. Data syncs automatically when connected."
        },
        {
          question: "I can't install the PWA",
          answer: "Ensure you're using a supported browser (Chrome, Edge, Safari) and look for the install prompt in the address bar. You may need to visit the site multiple times."
        }
      ]
    }
  ];

  const quickLinks = [
    {
      title: "User Guide",
      description: "Complete documentation for all features",
      icon: BookOpen,
      link: "/docs/user-guide",
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Video Tutorials",
      description: "Step-by-step video instructions",
      icon: Video,
      link: "/docs/videos",
      color: "bg-green-100 text-green-600"
    },
    {
      title: "API Documentation",
      description: "Technical integration guides",
      icon: FileText,
      link: "/docs/api",
      color: "bg-purple-100 text-purple-600"
    },
    {
      title: "System Status",
      description: "Check service availability",
      icon: Globe,
      link: "/status",
      color: "bg-orange-100 text-orange-600"
    }
  ];

  const contactOptions = [
    {
      method: "Live Chat",
      description: "Get instant help from our support team",
      icon: MessageSquare,
      availability: "24/7",
      responseTime: "< 2 minutes",
      action: "Start Chat"
    },
    {
      method: "Phone Support",
      description: "Speak directly with a technical expert",
      icon: Phone,
      availability: "Mon-Fri 8AM-8PM EST",
      responseTime: "Immediate",
      action: "Call Now",
      number: "1-800-SUPPORT"
    },
    {
      method: "Email Support",
      description: "Detailed technical assistance",
      icon: Mail,
      availability: "24/7",
      responseTime: "< 4 hours",
      action: "Send Email",
      email: "support@warehouse.app"
    }
  ];

  const recentUpdates = [
    {
      version: "v2.4.1",
      date: "2025-09-25",
      type: "Feature",
      title: "Enhanced Voice Commands",
      description: "Added support for complex pallet counting commands and improved accuracy"
    },
    {
      version: "v2.4.0",
      date: "2025-09-20",
      type: "Major",
      title: "Real-time Tracking",
      description: "New Maps page with live vehicle tracking and route optimization"
    },
    {
      version: "v2.3.8",
      date: "2025-09-15",
      type: "Bug Fix",
      title: "Performance Improvements",
      description: "Reduced load times and fixed memory leaks in analytics dashboard"
    }
  ];

  const handleTicketSubmit = () => {
    // Handle support ticket submission
    console.log("Support ticket submitted:", supportTicket);
  };

  const filteredFAQ = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Support Center
          </h1>
          <p className="text-gray-600 mt-1">Get help, documentation, and contact support</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Guide
          </Button>
          <Button size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Live Chat
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for help articles, features, or common issues..."
              className="pl-10 h-12 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link, index) => {
          const Icon = link.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${link.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{link.title}</h3>
                    <p className="text-sm text-gray-600">{link.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="faq" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          {searchQuery && (
            <Alert>
              <Search className="h-4 w-4" />
              <AlertDescription>
                Showing results for "{searchQuery}" ({filteredFAQ.reduce((acc, cat) => acc + cat.items.length, 0)} found)
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            {(searchQuery ? filteredFAQ : faqCategories).map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {category.title}
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {category.items.map((item, index) => (
                        <AccordionItem key={index} value={`${category.id}-${index}`}>
                          <AccordionTrigger className="text-left">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-600">
                            {item.answer}
                            <div className="flex gap-2 mt-3">
                              <Button variant="ghost" size="sm" className="text-xs">
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                Helpful
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs">
                                <ThumbsDown className="h-3 w-3 mr-1" />
                                Not helpful
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contactOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5" />
                      {option.method}
                    </CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Availability:</span>
                        <span className="font-medium">{option.availability}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Response time:</span>
                        <span className="font-medium">{option.responseTime}</span>
                      </div>
                      {option.number && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{option.number}</span>
                        </div>
                      )}
                      {option.email && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{option.email}</span>
                        </div>
                      )}
                    </div>
                    <Button className="w-full">
                      {option.action}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Emergency Contact */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Emergency Support
              </CardTitle>
              <CardDescription className="text-red-700">
                For critical system outages or urgent production issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <p className="text-sm text-red-700 mb-2">
                    Available 24/7 for critical production issues affecting operations
                  </p>
                  <p className="font-medium text-red-800">Emergency Hotline: 1-800-URGENT-1</p>
                </div>
                <Button variant="destructive">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Emergency
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tickets Tab */}
        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Support Ticket</CardTitle>
              <CardDescription>
                Describe your issue in detail for faster resolution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of the issue"
                    value={supportTicket.subject}
                    onChange={(e) => setSupportTicket(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={supportTicket.category}
                    onValueChange={(value) => setSupportTicket(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="account">Account Issue</SelectItem>
                      <SelectItem value="billing">Billing Question</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={supportTicket.priority}
                  onValueChange={(value) => setSupportTicket(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General question</SelectItem>
                    <SelectItem value="medium">Medium - Non-critical issue</SelectItem>
                    <SelectItem value="high">High - Affecting workflow</SelectItem>
                    <SelectItem value="urgent">Urgent - Production down</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
                  rows={6}
                  value={supportTicket.description}
                  onChange={(e) => setSupportTicket(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Attach Files
                </Button>
                <Button onClick={handleTicketSubmit}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Ticket
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Your Recent Tickets</CardTitle>
              <CardDescription>Track the status of your support requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">#TICK-2024-001</p>
                    <p className="text-sm text-gray-600">Voice command not working in Chrome</p>
                    <p className="text-xs text-gray-500">Submitted 2 hours ago</p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    In Progress
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">#TICK-2024-002</p>
                    <p className="text-sm text-gray-600">Export function returns empty file</p>
                    <p className="text-xs text-gray-500">Submitted yesterday</p>
                  </div>
                  <Badge className="bg-green-50 text-green-700">
                    Resolved
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What's New</CardTitle>
              <CardDescription>
                Latest features, improvements, and bug fixes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentUpdates.map((update, index) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <Badge
                        variant={update.type === "Major" ? "default" : update.type === "Feature" ? "secondary" : "outline"}
                      >
                        {update.type}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{update.title}</h3>
                        <span className="text-sm text-gray-500">{update.version}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{update.description}</p>
                      <p className="text-xs text-gray-500">{update.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Update Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Major Updates</p>
                  <p className="text-sm text-gray-600">New features and significant improvements</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bug Fixes</p>
                  <p className="text-sm text-gray-600">Security patches and stability improvements</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Maintenance Windows</p>
                  <p className="text-sm text-gray-600">Scheduled maintenance and downtime notifications</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Support;