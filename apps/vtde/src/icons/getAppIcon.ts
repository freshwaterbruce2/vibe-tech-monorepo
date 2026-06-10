import React from 'react';
import {
  AiIcon,
  CodeIcon,
  DashboardIcon,
  EducationIcon,
  FinanceIcon,
  FolderIcon,
  HealingIcon,
  MemoryIcon,
  MobileIcon,
  MonitorIcon,
  NovaIcon,
  SettingsIcon,
  ShippingIcon,
  TerminalIcon,
  ToolsIcon,
  WebIcon,
} from './index';

type IconComponent = (props: React.SVGProps<SVGSVGElement> & { size?: number }) => React.ReactNode;

const APP_ICONS: Record<string, IconComponent> = {
  'nova agent': NovaIcon,
  'nova-agent': NovaIcon,
  'nova quick chat': NovaIcon,
  'vibe code studio': CodeIcon,
  'vibe-code-studio': CodeIcon,
  terminal: TerminalIcon,
  'system monitor': MonitorIcon,
  memory: MemoryIcon,
  'memory panel': MemoryIcon,
  healing: HealingIcon,
  'healing dashboard': HealingIcon,
  'avge dashboard': DashboardIcon,
  'avge-dashboard': DashboardIcon,
  vibeblox: EducationIcon,
  'vibe tutor': EducationIcon,
  'vibe-tutor': EducationIcon,
  'vibe shop': FinanceIcon,
  'vibe-shop': FinanceIcon,
  'vibe justice': CodeIcon,
  'vibe-justice': CodeIcon,
  'crypto enhanced': FinanceIcon,
  'crypto-enhanced': FinanceIcon,
  'invoice automation': FinanceIcon,
  'invoice-automation-saas': FinanceIcon,
  'shipping pwa': ShippingIcon,
  'shipping-pwa': ShippingIcon,
  'prompt engineer': ToolsIcon,
  'prompt-engineer': ToolsIcon,
  'nova mobile': MobileIcon,
  'nova-mobile-app': MobileIcon,
  settings: SettingsIcon,
  'file explorer': FolderIcon,
};

const CATEGORY_ICONS: Record<string, IconComponent> = {
  ai: AiIcon,
  tool: ToolsIcon,
  tools: ToolsIcon,
  web: WebIcon,
  mobile: MobileIcon,
  dashboard: DashboardIcon,
  education: EducationIcon,
  finance: FinanceIcon,
  shipping: ShippingIcon,
  code: CodeIcon,
  system: MonitorIcon,
  default: WebIcon,
};

export function getAppIcon(name?: string, category?: string): IconComponent {
  if (name) {
    const key = name.toLowerCase();
    if (APP_ICONS[key]) return APP_ICONS[key];
  }
  if (category) {
    const cat = category.toLowerCase();
    if (CATEGORY_ICONS[cat]) return CATEGORY_ICONS[cat];
  }
  return WebIcon;
}
