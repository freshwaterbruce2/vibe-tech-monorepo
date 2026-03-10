import { useWarehouseConfig } from '@/config/warehouse'
import {
  generateColorScale,
  getForegroundColor,
  getMutedColor,
  hexToHSL,
  shadeColor,
} from '@/utils/colorUtils'
import React, { createContext, useContext, useEffect } from 'react'

interface ThemeContextType {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  applyTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { config } = useWarehouseConfig()

  const applyTheme = () => {
    const root = document.documentElement
    const colors = config.brandColors

    // Convert hex colors to HSL for shadcn/ui compatibility
    const primaryHSL = hexToHSL(colors.primary)
    const secondaryHSL = hexToHSL(colors.secondary)
    const accentHSL = hexToHSL(colors.accent || colors.secondary)

    // Apply CSS custom properties for shadcn/ui components
    // These are the variables that Tailwind CSS classes like 'bg-primary' use
    root.style.setProperty('--primary', primaryHSL)
    root.style.setProperty(
      '--primary-foreground',
      getForegroundColor(colors.primary)
    )

    root.style.setProperty('--secondary', secondaryHSL)
    root.style.setProperty(
      '--secondary-foreground',
      getForegroundColor(colors.secondary)
    )

    root.style.setProperty('--accent', accentHSL)
    root.style.setProperty(
      '--accent-foreground',
      getForegroundColor(colors.accent || colors.secondary)
    )

    // Set muted colors based on primary
    const mutedColor = getMutedColor(colors.primary)
    root.style.setProperty('--muted', mutedColor)
    root.style.setProperty('--muted-foreground', '215.4 16.3% 46.9%')

    // Update destructive colors (keep red for errors)
    root.style.setProperty('--destructive', '0 84.2% 60.2%')
    root.style.setProperty('--destructive-foreground', '210 40% 98%')

    // Update border and input colors based on theme
    root.style.setProperty('--border', getMutedColor(colors.primary))
    root.style.setProperty('--input', getMutedColor(colors.primary))
    root.style.setProperty('--ring', primaryHSL)

    // Also set the legacy variables for backward compatibility
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-secondary', colors.secondary)
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-background', colors.background)
    root.style.setProperty('--color-text', colors.text)

    // Set brand color variables
    root.style.setProperty('--brand-primary', colors.primary)
    root.style.setProperty('--brand-secondary', colors.secondary)
    root.style.setProperty('--brand-accent', colors.accent)
    root.style.setProperty('--brand-background', colors.background)
    root.style.setProperty('--brand-text', colors.text)

    // Generate and set Walmart color scale variables based on primary color
    const primaryScale = generateColorScale(colors.primary)
    const secondaryScale = generateColorScale(colors.secondary)

    // Set wal-blue scale (based on primary color)
    Object.entries(primaryScale).forEach(([level, color]) => {
      root.style.setProperty(`--wal-blue-${level}`, color)
    })

    // Set wal-yellow scale (based on secondary color)
    Object.entries(secondaryScale).forEach(([level, color]) => {
      root.style.setProperty(`--wal-yellow-${level}`, color)
    })

    // Set walmart-specific variables for compatibility
    root.style.setProperty('--walmart-blue', colors.primary)
    root.style.setProperty(
      '--walmart-blue-dark',
      shadeColor(colors.primary, 0.8)
    )
    root.style.setProperty(
      '--walmart-blue-light',
      shadeColor(colors.primary, 1.3)
    )
    root.style.setProperty('--walmart-yellow', colors.secondary)
    root.style.setProperty(
      '--walmart-yellow-dark',
      shadeColor(colors.secondary, 0.8)
    )
    root.style.setProperty(
      '--walmart-yellow-light',
      shadeColor(colors.secondary, 1.3)
    )

    // Update document title
    document.title = config.appShortName

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', config.appDescription)
    }

    // Update meta theme color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.primary)
    }

    // Update apple-mobile-web-app-title
    const appleMobileTitle = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]'
    )
    if (appleMobileTitle) {
      appleMobileTitle.setAttribute('content', config.appShortName)
    }

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', config.appName)
    }

    const ogDescription = document.querySelector(
      'meta[property="og:description"]'
    )
    if (ogDescription) {
      ogDescription.setAttribute('content', config.appDescription)
    }
  }

  useEffect(() => {
    applyTheme()
  }, [config.brandColors])

  // Apply theme on initial mount
  useEffect(() => {
    applyTheme()
  }, [])

  const contextValue: ThemeContextType = {
    colors: config.brandColors,
    applyTheme,
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Hook for dynamic class names based on theme
export const useDynamicClasses = () => {
  const { colors } = useTheme()

  return {
    primaryBg: { backgroundColor: colors.primary },
    secondaryBg: { backgroundColor: colors.secondary },
    accentBg: { backgroundColor: colors.accent },
    primaryText: { color: colors.primary },
    secondaryText: { color: colors.secondary },
    accentText: { color: colors.accent },
  }
}
