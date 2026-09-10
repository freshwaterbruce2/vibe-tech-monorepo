import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getStatus: vi.fn(), checkout: vi.fn(), save: vi.fn(), user: { email: 'dev@example.com' } }));
vi.mock('../../services/AuthService', () => ({ authService: { getCurrentUser: () => mocks.user, subscribe: (fn: (value: unknown) => void) => { fn(mocks.user); return () => {}; }, logout: vi.fn() } }));
vi.mock('../../services/BillingService', () => ({ billingService: { getStatus: mocks.getStatus, triggerCheckout: mocks.checkout, openPortal: vi.fn() } }));
vi.mock('../../services/AIUsageMode', () => ({ activeAIUsageMode: 'byok', getSavedAIUsageMode: () => 'byok', saveAIUsageMode: mocks.save }));
vi.mock('../../components/AuthModal', () => ({ AuthModal: () => null }));
import { AIPlanSection } from '../../components/Settings/AIPlanSection';

const unavailable = { ok: true, plan: 'free', subscription: null, managedAI: { configured: false, available: false, used: 0, limit: 0, remaining: 0, models: [], resetsAt: null }, checkoutAvailable: false, portalAvailable: false };
describe('AI plan settings', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getStatus.mockResolvedValue(unavailable); mocks.save.mockResolvedValue(undefined); });
  it('does not offer checkout before the backend is configured', async () => {
    render(<AIPlanSection isOpen />);
    expect(await screen.findByText(/Subscription AI is not available yet/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View subscription checkout' })).toBeNull();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it('shows server allowance and offers billing management without claiming unlimited usage', async () => {
    mocks.getStatus.mockResolvedValue({ ...unavailable, subscription: { status: 'active', cancelAtPeriodEnd: false }, portalAvailable: true, managedAI: { ...unavailable.managedAI, configured: true, available: true, used: 4, limit: 10, remaining: 6, models: ['deepseek/deepseek-chat'] } });
    render(<AIPlanSection isOpen />);
    expect(await screen.findByText(/4 used of 10; 6 remaining/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manage billing or cancel' })).toBeTruthy();
  });
  it('clearly distinguishes saved next-launch funding from current funding', async () => {
    render(<AIPlanSection isOpen />);
    fireEvent.change(screen.getByLabelText(/AI payment option/), { target: { value: 'subscription' } });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('subscription'));
    expect(await screen.findByText(/Current session: Bring my own key.*Change saved/)).toBeTruthy();
  });
});
