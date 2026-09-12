import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => '123e4567-e89b-42d3-a456-426614174002') });
  });
  afterEach(() => vi.unstubAllGlobals());

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

  it('keeps retained cosmetic categories reachable without a real-rewards tab', async () => {
    render(<AvatarShopUnified userTokens={0} onSpendTokens={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /shirts/i }));
    expect(await screen.findByText("Adventurer's Tunic")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /real rewards/i })).not.toBeInTheDocument();
  });

  it('persists a purchase intent before requesting its token debit and emits its exact durable ID only after confirmation', async () => {
    const onSpendTokens = vi.fn().mockResolvedValue(false);
    const onPurchaseComplete = vi.fn();
    render(<AvatarShopUnified userTokens={100} onSpendTokens={onSpendTokens} onPurchaseComplete={onPurchaseComplete} />);

    fireEvent.click(await screen.findByRole('button', { name: /hats/i }));
    fireEvent.click(await screen.findByRole('button', { name: /buy 100/i }));

    await waitFor(() => expect(onSpendTokens).toHaveBeenCalledTimes(1));
    const firstSaveOrder = dataStoreMock.saveAvatarState.mock.invocationCallOrder[0];
    const spendOrder = onSpendTokens.mock.invocationCallOrder[0];
    expect(firstSaveOrder).toBeLessThan(spendOrder);
    expect(dataStoreMock.saveAvatarState).toHaveBeenCalledWith(expect.objectContaining({
      pendingPurchase: expect.objectContaining({
        itemId: 'hat-math', cost: 100, reason: "Bought Mathematician's Cap", operationId: expect.stringMatching(/^avatar-purchase:/),
      }),
    }));
    expect(onPurchaseComplete).not.toHaveBeenCalled();
  });

  it('forwards the exact persisted operation ID after a confirmed purchase', async () => {
    const onPurchaseComplete = vi.fn();
    render(<AvatarShopUnified userTokens={100} onSpendTokens={vi.fn().mockResolvedValue(true)} onPurchaseComplete={onPurchaseComplete} />);
    fireEvent.click(await screen.findByRole('button', { name: /hats/i }));
    fireEvent.click(await screen.findByRole('button', { name: /buy 100/i }));
    await waitFor(() => expect(onPurchaseComplete).toHaveBeenCalledWith('avatar-purchase:123e4567-e89b-42d3-a456-426614174002'));
  });

  it('withholds catalog actions while loading and exposes a recoverable storage failure without defaults', async () => {
    let resolveLoad!: (value: unknown) => void;
    dataStoreMock.getAvatarState.mockImplementationOnce(async () => new Promise((resolve) => { resolveLoad = resolve; }));
    render(<AvatarShopUnified userTokens={100} onSpendTokens={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading avatar shop');
    expect(screen.queryByRole('button', { name: /buy/i })).not.toBeInTheDocument();
    resolveLoad({ equippedItems: {}, ownedItems: [], selectedAvatarId: 'avatar-boy-headphones', unlockedAvatars: ['avatar-boy-headphones'] });
    expect(await screen.findByText('Science Star')).toBeInTheDocument();
  });

  it('shows an accessible load failure and reloads into the retained catalog', async () => {
    dataStoreMock.getAvatarState.mockRejectedValueOnce(new Error('storage unavailable')).mockResolvedValueOnce({ equippedItems: {}, ownedItems: [], selectedAvatarId: 'avatar-boy-headphones', unlockedAvatars: ['avatar-boy-headphones'] });
    render(<AvatarShopUnified userTokens={100} onSpendTokens={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('storage unavailable');
    expect(screen.queryByText("Mathematician's Cap")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reload avatar shop/i }));
    expect(await screen.findByText('Science Star')).toBeInTheDocument();
  });

  it('keeps a pending retry enabled despite low displayed balance and disables other buys', async () => {
    dataStoreMock.getAvatarState.mockResolvedValue({ equippedItems: {}, ownedItems: [], selectedAvatarId: 'avatar-boy-headphones', unlockedAvatars: ['avatar-boy-headphones'], pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:retry', itemId: 'hat-math', cost: 100, reason: "Bought Mathematician's Cap", createdAt: 1 } });
    const onSpendTokens = vi.fn().mockResolvedValue(false);
    render(<AvatarShopUnified userTokens={0} onSpendTokens={onSpendTokens} />);
    fireEvent.click(await screen.findByRole('button', { name: /hats/i }));
    expect(screen.getByRole('button', { name: /need 100 more/i })).toBeDisabled();
    fireEvent.click(await screen.findByRole('button', { name: /retry purchase/i }));
    await waitFor(() => expect(onSpendTokens).toHaveBeenCalledWith(100, "Bought Mathematician's Cap", 'avatar-purchase:retry'));
    expect(screen.getByRole('alert')).toHaveTextContent('token payment was not confirmed');
  });
});
