/* eslint-disable react-refresh/only-export-components */
/// <reference types="jest" />

import { createElement, type ComponentType, type ReactNode } from 'react';

const actual = jest.requireActual('framer-motion');

// Create a custom component factory
function custom(Component: string | ComponentType<any>) {
  return (props: any) => {
    // Filter out motion-specific props, keeping ref
    const { ref, ...rest } = props;
    const regularProps = Object.entries(rest).reduce((acc: any, [key, value]) => {
      if (!actual.isValidMotionProp(key)) acc[key] = value;
      return acc;
    }, {});

    return typeof Component === 'string' ?
      createElement(Component, { ...regularProps, ref }) :
      <Component {...regularProps} ref={ref} />;
  };
}

// Create component cache
const componentCache = new Map<string, any>();

// Create motion proxy
export const motion = new Proxy(custom, {
  get: (_target, key: string) => {
    if (!componentCache.has(key)) {
      componentCache.set(key, custom(key));
    }
    return componentCache.get(key);
  }
});

// Mock AnimatePresence
export const AnimatePresence = ({ children }: { children: ReactNode }) => <>{children}</>;

// Mock component exports only
export const LazyMotion = ({ children }: { children: ReactNode }) => <>{children}</>;
export const m = motion;

// Re-export constants to maintain API
export {
  domAnimation,
  isValidMotionProp,
  useAnimation,
  useMotionValue,
  useTransform
} from './framer-motion-constants'; 