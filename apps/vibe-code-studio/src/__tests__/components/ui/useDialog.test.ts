import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDialog } from '../../../components/ui/useDialog';

describe('useDialog', () => {
  it('starts with no dialog', () => {
    const { result } = renderHook(() => useDialog());
    expect(result.current.dialog).toBeNull();
  });

  it('showDialog opens with defaults and options', () => {
    const { result } = renderHook(() => useDialog());
    const onConfirm = () => undefined;

    act(() => {
      result.current.showDialog('Title', 'Body');
    });
    expect(result.current.dialog).toEqual({
      isOpen: true,
      title: 'Title',
      message: 'Body',
      variant: 'info',
      confirmLabel: 'Confirm',
      onConfirm: undefined,
    });

    act(() => {
      result.current.showDialog('T2', 'M2', {
        variant: 'danger',
        confirmLabel: 'Yes',
        onConfirm,
      });
    });
    expect(result.current.dialog).toMatchObject({
      isOpen: true,
      title: 'T2',
      message: 'M2',
      variant: 'danger',
      confirmLabel: 'Yes',
      onConfirm,
    });
  });

  it('hideDialog clears state', () => {
    const { result } = renderHook(() => useDialog());
    act(() => {
      result.current.showDialog('A', 'B');
    });
    act(() => {
      result.current.hideDialog();
    });
    expect(result.current.dialog).toBeNull();
  });
});
