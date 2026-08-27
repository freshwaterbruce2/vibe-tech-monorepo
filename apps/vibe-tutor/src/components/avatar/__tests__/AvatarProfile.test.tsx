import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarProfile from '../AvatarProfile';

const dataStoreMock = vi.hoisted(() => ({
  getAvatarState: vi.fn(),
  getUserSettings: vi.fn(),
  saveAvatarState: vi.fn(),
  saveUserSettings: vi.fn(),
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
    dataStoreMock.getUserSettings.mockImplementation(async (key: string) => {
      if (key === 'user_avatar') return Promise.resolve('avatar-teen-neon-hair');
      if (key === 'user_name') return Promise.resolve('Blake');
      return Promise.resolve('');
    });
    dataStoreMock.saveAvatarState.mockResolvedValue(undefined);
    dataStoreMock.saveUserSettings.mockResolvedValue(undefined);
  });

  it('renders the selected shared avatar image in the profile', async () => {
    render(<AvatarProfile />);

    expect(await screen.findByText('Neon Thinker')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /avatar/i })).toHaveAttribute(
      'src',
      '/avatars/avatar-teen-neon-hair.png',
    );
  });

  describe('name editor', () => {
    it('seeds the name input from the stored user_name', async () => {
      render(<AvatarProfile />);

      expect(await screen.findByDisplayValue('Blake')).toBeInTheDocument();
    });

    it('disables Save until the name is changed', async () => {
      render(<AvatarProfile />);

      const saveButton = await screen.findByRole('button', { name: 'Save' });
      expect(saveButton).toBeDisabled();
    });

    it('saves a new name and notifies the parent via onUserNameSaved', async () => {
      const onUserNameSaved = vi.fn();
      render(<AvatarProfile onUserNameSaved={onUserNameSaved} />);

      const input = await screen.findByDisplayValue('Blake');
      fireEvent.change(input, { target: { value: 'Alex' } });

      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).not.toBeDisabled();
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(dataStoreMock.saveUserSettings).toHaveBeenCalledWith('user_name', 'Alex');
        expect(onUserNameSaved).toHaveBeenCalledWith('Alex');
      });
    });

    it('trims whitespace before saving and allows clearing the name', async () => {
      const onUserNameSaved = vi.fn();
      render(<AvatarProfile onUserNameSaved={onUserNameSaved} />);

      const input = await screen.findByDisplayValue('Blake');
      fireEvent.change(input, { target: { value: '  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(dataStoreMock.saveUserSettings).toHaveBeenCalledWith('user_name', '');
        expect(onUserNameSaved).toHaveBeenCalledWith('');
      });
    });

    it('enforces a 24-character max length on the name input', async () => {
      render(<AvatarProfile />);

      const input = await screen.findByDisplayValue('Blake');
      expect(input).toHaveAttribute('maxLength', '24');
    });
  });
});
