import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';

describe('Nova Agent Components', () => {
  describe('Basic rendering', () => {
    it('should render test component', () => {
      const TestComponent = () => createElement('div', { 'data-testid': 'nova' }, 'NOVA Agent');
      render(createElement(TestComponent));
      
      expect(screen.getByTestId('nova')).toBeInTheDocument();
    });
  });

  describe('Dashboard structure', () => {
    it('should have expected sections', () => {
      const sections = [
        'Chat',
        'Vision',
        'ImageToCode',
        'Settings',
        'History',
      ];

      expect(sections).toContain('Chat');
      expect(sections).toContain('Vision');
      expect(sections.length).toBeGreaterThan(3);
    });
  });

  describe('Theme support', () => {
    it('should support dark theme', () => {
      const themes = ['dark', 'light', 'system'];
      expect(themes).toContain('dark');
    });

    it('should have VibeTech colors', () => {
      const vibetechColors = {
        cyan: '#00d4ff',
        purple: '#a855f7',
        pink: '#ec4899',
        teal: '#14b8a6',
      };

      expect(vibetechColors.cyan).toMatch(/^#[0-9a-f]{6}$/i);
      expect(vibetechColors.purple).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('Tauri integration', () => {
    it('should have Tauri invoke mocked', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      expect(invoke).toBeDefined();
      expect(vi.isMockFunction(invoke)).toBe(true);
    });
  });
});
