import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useWarehouseConfig, WarehouseConfig } from '@/config/warehouse'
import { useTheme } from '@/contexts/ThemeContext'
import { Button, Input } from '@vibetech/ui'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle,
  Clock,
  Palette,
  Smartphone,
  Sparkles,
  Truck,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface WelcomeWizardProps {
  isOpen: boolean
  onComplete: () => void
  onSkip: () => void
}

const WelcomeWizard: React.FC<WelcomeWizardProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const { config, updateConfig } = useWarehouseConfig()
  const { applyTheme } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<WarehouseConfig>>({
    companyName: '',
    warehouseName: '',
    warehouseCode: '',
    appName: '',
    appShortName: '',
    brandColors: {
      primary: '#0071CE',
      secondary: '#FFC220',
      accent: '#004C91',
      background: '#FFFFFF',
      text: '#333333',
    },
  })

  const steps = [
    {
      title: 'Welcome to Your Warehouse App!',
      description: "Let's customize this app for your warehouse operations",
      icon: Truck,
      content: 'intro',
    },
    {
      title: 'Company Information',
      description: 'Tell us about your company and warehouse',
      icon: Building2,
      content: 'company',
    },
    {
      title: 'App Configuration',
      description: 'Choose how your app should appear',
      icon: Smartphone,
      content: 'app',
    },
    {
      title: 'Brand Colors',
      description: 'Pick colors that match your brand',
      icon: Palette,
      content: 'colors',
    },
    {
      title: 'All Set!',
      description: 'Your warehouse app is ready to use',
      icon: CheckCircle,
      content: 'complete',
    },
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleColorChange = (colorType: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      brandColors: {
        ...prev.brandColors!,
        [colorType]: value,
      },
    }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      // Generate app names if not provided
      const finalData = {
        ...config,
        ...formData,
        appName: formData.appName ?? `${formData.companyName} Shipping`,
        appShortName:
          formData.appShortName ?? formData.warehouseCode ?? 'Warehouse App',
      }

      await updateConfig(finalData)
      applyTheme()

      toast.success('Welcome! Your warehouse app is now customized.', {
        description:
          'You can always change these settings later in the Settings page.',
      })

      onComplete()
    } catch {
      toast.error('Failed to save configuration', {
        description: 'Please try again or skip for now.',
      })
    }
  }

  const handleSkip = () => {
    toast.info('Skipped customization', {
      description: 'You can customize your warehouse later in Settings.',
    })
    onSkip()
  }

  const currentStepData = steps[currentStep]!
  const StepIcon = currentStepData.icon
  const isLastStep = currentStep === steps.length - 1
  const canProceed = (() => {
    switch (currentStep) {
      case 1: // Company info
        return formData.companyName && formData.warehouseName
      case 2: // App config
        return true // Optional fields
      case 3: // Colors
        return true // Has defaults
      default:
        return true
    }
  })()

  const renderStepContent = () => {
    switch (currentStepData.content) {
      case 'intro':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Truck className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">
                Transform Your Warehouse
              </h3>
              <p className="text-muted-foreground">
                This powerful shipping management app can be completely
                customized for your warehouse. Let's set it up in just a few
                minutes!
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                <Building2 className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-medium">Brand Your App</div>
                  <div className="text-sm text-muted-foreground">
                    Your colors, your name
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                <Smartphone className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">Mobile Ready</div>
                  <div className="text-sm text-muted-foreground">
                    Install as an app
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <div>
                  <div className="font-medium">Easy to Use</div>
                  <div className="text-sm text-muted-foreground">
                    Voice commands & more
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50">
                <Clock className="h-6 w-6 text-orange-600" />
                <div>
                  <div className="font-medium">Quick Setup</div>
                  <div className="text-sm text-muted-foreground">
                    Just 2 minutes!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'company':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName ?? ''}
                onChange={e => handleInputChange('companyName', e.target.value)}
                placeholder="e.g., ABC Logistics Inc."
              />
            </div>
            <div>
              <Label htmlFor="warehouseName">Warehouse Name *</Label>
              <Input
                id="warehouseName"
                value={formData.warehouseName ?? ''}
                onChange={e =>
                  handleInputChange('warehouseName', e.target.value)
                }
                placeholder="e.g., Distribution Center West"
              />
            </div>
            <div>
              <Label htmlFor="warehouseCode">Warehouse Code</Label>
              <Input
                id="warehouseCode"
                value={formData.warehouseCode ?? ''}
                onChange={e =>
                  handleInputChange('warehouseCode', e.target.value)
                }
                placeholder="e.g., DCW01"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used as the short name for mobile installation
              </p>
            </div>
          </div>
        )

      case 'app':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={formData.appName ?? ''}
                onChange={e => handleInputChange('appName', e.target.value)}
                placeholder={`${formData.companyName ?? 'Your Company'} Shipping`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Appears in browser tabs and when installed as an app
              </p>
            </div>
            <div>
              <Label htmlFor="appShortName">Short Name</Label>
              <Input
                id="appShortName"
                value={formData.appShortName ?? ''}
                onChange={e =>
                  handleInputChange('appShortName', e.target.value)
                }
                placeholder={formData.warehouseCode ?? 'Warehouse'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Displayed on mobile home screen (keep it short!)
              </p>
            </div>
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                These names will appear when users install your app on their
                mobile devices.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'colors':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData.brandColors ?? {}).map(
                ([colorName, colorValue]) => (
                  <div key={colorName} className="space-y-2">
                    <Label className="capitalize text-sm font-medium">
                      {colorName.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colorValue}
                        onChange={e =>
                          handleColorChange(colorName, e.target.value)
                        }
                        className="w-12 h-10 p-1 border rounded cursor-pointer"
                      />
                      <Input
                        value={colorValue}
                        onChange={e =>
                          handleColorChange(colorName, e.target.value)
                        }
                        placeholder="#000000"
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Live Preview */}
            <div>
              <Label className="text-sm font-medium">Live Preview</Label>
              <div
                className="mt-2 p-4 rounded-lg text-white"
                style={{
                  backgroundColor: formData.brandColors?.primary,
                  background: `linear-gradient(135deg, ${formData.brandColors?.primary} 0%, ${formData.brandColors?.secondary} 100%)`,
                }}
              >
                <h3 className="font-bold">
                  {formData.appName ?? 'Your App Name'}
                </h3>
                <p className="text-sm opacity-90">
                  {formData.companyName ?? 'Your Company'}
                </p>
                <p className="text-xs opacity-75">
                  {formData.warehouseName ?? 'Your Warehouse'}
                </p>
              </div>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">You're All Set! 🎉</h3>
              <p className="text-muted-foreground">
                Your warehouse management app has been customized with your
                branding and settings.
              </p>
            </div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">
                    Company: {formData.companyName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Warehouse: {formData.warehouseName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">
                    App:{' '}
                    {formData.appName ?? `${formData.companyName} Shipping`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ready for mobile installation
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Brand colors applied</div>
                  <div className="text-sm text-muted-foreground">
                    Your custom theme is active
                  </div>
                </div>
              </div>
            </div>
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                You can always modify these settings later in the Settings page.
              </AlertDescription>
            </Alert>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StepIcon className="h-6 w-6" />
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  index <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-1 mx-2 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip Setup
            </Button>
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {!isLastStep ? (
              <Button onClick={handleNext} disabled={!canProceed}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Setup
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WelcomeWizard
