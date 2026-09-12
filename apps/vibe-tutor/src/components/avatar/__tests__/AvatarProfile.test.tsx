import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('hides the saved profile on load failure and reloads it only after storage recovers', async () => {
    dataStoreMock.getAvatarState.mockRejectedValueOnce(new Error('profile storage unavailable'));
    render(<AvatarProfile />);
    expect(await screen.findByRole('alert')).toHaveTextContent('profile storage unavailable');
    expect(screen.queryByRole('heading', { name: 'Avatar Profile' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reload avatar profile/i }));
    expect(await screen.findByRole('heading', { name: 'Avatar Profile' })).toBeInTheDocument();
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

    it('keeps the saved name and parent callback unchanged on a failed save, then allows retry', async () => {
      const onUserNameSaved = vi.fn();
      dataStoreMock.saveUserSettings.mockRejectedValueOnce(new Error('name write failed')).mockResolvedValue(undefined);
      render(<AvatarProfile onUserNameSaved={onUserNameSaved} />);
      const input = await screen.findByDisplayValue('Blake');
      fireEvent.change(input, { target: { value: 'Alex' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('name write failed');
      expect(onUserNameSaved).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onUserNameSaved).toHaveBeenCalledWith('Alex'));
    });
  });

  it('retains equipped gear after a failed unequip and serializes the retry', async () => {
    dataStoreMock.getAvatarState.mockResolvedValue({ equippedItems: { hat: 'hat-math' }, ownedItems: ['hat-math'], purchaseHistory: [], selectedAvatarId: 'avatar-teen-neon-hair', unlockedAvatars: ['avatar-teen-neon-hair'] });
    dataStoreMock.saveAvatarState.mockRejectedValueOnce(new Error('gear write failed')).mockResolvedValue(undefined);
    render(<AvatarProfile />);
    const unequip = await screen.findByRole('button', { name: 'Unequip' });
    const hatRow = unequip.parentElement!;
    fireEvent.click(unequip);
    expect(await screen.findByRole('alert')).toHaveTextContent('gear write failed');
    expect(within(hatRow).getByText("Mathematician's Cap")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unequip' }));
    await waitFor(() => expect(within(hatRow).getByText('Empty Slot')).toBeInTheDocument());
  });

  it('serializes profile writes by disabling controls while an unequip is pending', async () => {
    let resolveSave!: () => void;
    dataStoreMock.getAvatarState.mockResolvedValue({ equippedItems: { hat: 'hat-math' }, ownedItems: ['hat-math'], purchaseHistory: [], selectedAvatarId: 'avatar-teen-neon-hair', unlockedAvatars: ['avatar-teen-neon-hair'] });
    dataStoreMock.saveAvatarState.mockImplementationOnce(async () => new Promise<void>((resolve) => { resolveSave = resolve; }));
    render(<AvatarProfile />);
    const unequip = await screen.findByRole('button', { name: 'Unequip' });
    const hatRow = unequip.parentElement!;
    fireEvent.click(unequip);
    expect(within(hatRow).getByRole('button', { name: 'Unequip' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    resolveSave();
    await waitFor(() => expect(within(hatRow).getByText('Empty Slot')).toBeInTheDocument());
  });
});
