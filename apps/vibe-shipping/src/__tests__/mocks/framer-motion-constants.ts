/// <reference types="jest" />

// Mock other exports - moved here to avoid react-refresh warnings
export const domAnimation = {};

export const isValidMotionProp = (key: string) => {
  const motionProps = ['animate', 'initial', 'exit', 'transition', 'whileHover', 'whileTap'];
  return motionProps.includes(key);
};

// Mock hooks
export const useAnimation = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  set: vi.fn()
});

export const useMotionValue = (initial: any) => ({
  get: () => initial,
  set: vi.fn(),
  onChange: vi.fn()
});

export const useTransform = jest.fn((input: any) => input);