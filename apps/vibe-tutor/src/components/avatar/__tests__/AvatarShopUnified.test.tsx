import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarShopUnified } from '../AvatarShopUnified';
import { dataStore } from '../../../services/dataStore';

const dataStoreMock = vi.hoisted(() => ({
  getAvatarState: vi.fn(),
  getUserSettings: vi.fn(),
  saveAvatarState: vi.fn(),
  saveUserSettings: vi.fn(),
}));

vi.mock('../../../services/dataStore', () => ({
  dataStore: dataStoreMock,
}));

vi.mock('../../../utils/electronStore', () => ({
  appStore: {
    delete: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('AvatarShopUnified', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataStoreMock.getAvatarState.mockResolvedValue({
      equippedItems: {},
      ownedItems: [],
      purchaseHistory: [],
      selectedAvatarId: 'avatar-boy-headphones',
      unlockedAvatars: ['avatar-boy-headphones'],
    });
    dataStoreMock.getUserSettings.mockResolvedValue('avatar-boy-headphones');
    dataStoreMock.saveAvatarState.mockResolvedValue(undefined);
    dataStoreMock.saveUserSettings.mockResolvedValue(undefined);
  });

  it('renders shared avatar character images and equips a selected avatar', async () => {
    render(<AvatarShopUnified userTokens={0} onSpendTokens={vi.fn()} />);

    const scienceAvatar = await screen.findByRole('img', { name: /science star/i });
    expect(scienceAvatar).toHaveAttribute('src', '/avatars/avatar-girl-glasses.png');

    dataStoreMock.saveAvatarState.mockClear();

    const card = scienceAvatar.closest('.glass-card');
    expect(card).not.toBeNull();

    fireEvent.click(within(card as HTMLElement).getByRole('button', { name: /^equip$/i }));

    await waitFor(() => {
      expect(dataStore.saveAvatarState).toHaveBeenCalledWith(
        expect.objectContaining({ selectedAvatarId: 'avatar-girl-glasses' }),
      );
    });
  });
});
