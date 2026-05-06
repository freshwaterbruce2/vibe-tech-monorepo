import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarProfile from '../AvatarProfile';

const dataStoreMock = vi.hoisted(() => ({
  getAvatarState: vi.fn(),
  getUserSettings: vi.fn(),
  saveAvatarState: vi.fn(),
}));

vi.mock('../../../services/dataStore', () => ({
  dataStore: dataStoreMock,
}));

describe('AvatarProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataStoreMock.getAvatarState.mockResolvedValue({
      equippedItems: {},
      ownedItems: [],
      purchaseHistory: [],
      selectedAvatarId: 'avatar-teen-neon-hair',
      unlockedAvatars: ['avatar-teen-neon-hair'],
    });
    dataStoreMock.getUserSettings.mockResolvedValue('avatar-teen-neon-hair');
    dataStoreMock.saveAvatarState.mockResolvedValue(undefined);
  });

  it('renders the selected shared avatar image in the profile', async () => {
    render(<AvatarProfile />);

    expect(await screen.findByText('Neon Thinker')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /avatar/i })).toHaveAttribute(
      'src',
      '/avatars/avatar-teen-neon-hair.png',
    );
  });
});
