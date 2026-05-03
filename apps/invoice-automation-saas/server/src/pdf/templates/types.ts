import type { InvoicePdfData } from '../InvoicePdfDocument.js'

export type TemplateBase = 'classic' | 'modern' | 'minimal'

export interface TemplateConfig {
  primaryColor?: string
  accentColor?: string
  fontFamily?: 'Helvetica' | 'Times-Roman' | 'Courier'
  footerText?: string
  logoPath?: string
}

export interface TemplateProps {
  data: InvoicePdfData
  config?: TemplateConfig
}

export const DEFAULT_CONFIG: Required<Omit<TemplateConfig, 'logoPath' | 'footerText'>> &
  Pick<TemplateConfig, 'logoPath' | 'footerText'> = {
  primaryColor: '#111827',
  accentColor: '#2563eb',
  fontFamily: 'Helvetica',
}

export const mergeConfig = (config?: TemplateConfig): TemplateConfig => ({
  ...DEFAULT_CONFIG,
  ...config,
})
