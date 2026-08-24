/**
 * VisualEditor palette definition tests
 *
 * Regression: the "Input" palette item shipped with a corrupted icon literal
 * (two U+FFFD replacement characters from a broken emoji), which rendered as
 * mojibake in the component palette.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getDefaultProps, PALETTE_ITEMS, renderElement } from '../../components/VisualEditor/utils';
import type { UIElement } from '../../components/VisualEditor/types';

describe('VisualEditor PALETTE_ITEMS', () => {
  it('defines a non-empty icon for every palette item', () => {
    expect(PALETTE_ITEMS.length).toBeGreaterThan(0);
    for (const item of PALETTE_ITEMS) {
      expect(item.icon.length, `icon for "${item.type}"`).toBeGreaterThan(0);
    }
  });

  it('contains no U+FFFD replacement characters (mojibake) in any icon', () => {
    for (const item of PALETTE_ITEMS) {
      expect(item.icon, `icon for "${item.type}"`).not.toMatch(/�/);
    }
  });

  it('renders the Input item with its memo icon', () => {
    const input = PALETTE_ITEMS.find(item => item.type === 'input');
    expect(input?.label).toBe('Input');
    expect(input?.icon).toBe('📝');
  });

  it('keeps palette types aligned with getDefaultProps', () => {
    for (const item of PALETTE_ITEMS) {
      // Every palette entry must resolve to a defined default-props object.
      expect(getDefaultProps(item.type)).toBeTypeOf('object');
    }
  });

  it('renderElement covers text, button, and card cases', () => {
    const textEl: UIElement = {
      id: 't1',
      type: 'text',
      props: { content: 'Hello text' },
    };
    const { unmount } = render(renderElement(textEl));
    expect(screen.getByText('Hello text')).toBeInTheDocument();
    unmount();

    const buttonEl: UIElement = {
      id: 'b1',
      type: 'button',
      props: { text: 'Go' },
    };
    const r2 = render(renderElement(buttonEl));
    expect(r2.getByText('Go')).toBeInTheDocument();
    r2.unmount();

    const cardEl: UIElement = {
      id: 'c1',
      type: 'card',
      props: { title: 'Card T' },
    };
    const r3 = render(renderElement(cardEl));
    expect(r3.getByText('Card T')).toBeInTheDocument();
  });
});
