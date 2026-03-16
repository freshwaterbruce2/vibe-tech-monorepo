import type { ReactNode } from 'react';
import { useFlag, useVariant } from './hooks';

export interface FeatureGateProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFlag(flag);
  return <>{enabled ? children : fallback}</>;
}

export interface VariantGateProps {
  flag: string;
  variant: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function VariantGate({ flag, variant, children, fallback = null }: VariantGateProps) {
  const { variant: currentVariant } = useVariant(flag);
  return <>{currentVariant === variant ? children : fallback}</>;
}
