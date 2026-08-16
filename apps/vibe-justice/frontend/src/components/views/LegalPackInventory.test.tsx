import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { justiceApi, type LegalPacksResponse } from '../../services/api'
import { LegalPackInventory } from './LegalPackInventory'

vi.mock('../../services/api', () => ({ justiceApi: { listLegalPacks: vi.fn(), getLegalPackSource: vi.fn() } }))

const inventory: LegalPacksResponse = { packs: [{ pack_id: 'sc-landlord-tenant', jurisdiction: 'South Carolina', matter_type: 'Landlord–tenant', version: '1.0.0', as_of: '2025 Session', status: 'source_checked', retrieval_status: 'offline_verified', approval_status: 'not_approved_for_matching', retrieved_at: '2026-08-16T12:00:00Z', sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', sources: [{ source_id: 'sc-code-27-40-440', title: 'S.C. Code § 27-40-440', canonical_url: 'https://www.scstatehouse.gov/code/t27c040.php', official: true, status: 'source_checked', sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', excerpt: 'A landlord shall comply with applicable building and housing codes.', locator: 'Title 27, Chapter 40, Section 440' }] }] }
const sourceDetail = { ...inventory.packs[0]!.sources[0]!, pack_id: 'sc-landlord-tenant', pack_status: 'source_checked', approval_status: 'not_approved_for_matching', version: '1.0.0', as_of: '2025 Session', retrieved_at: '2026-08-16T12:00:00Z', elements: [{ element_id: 'duty', ordinal: 1, authority_text: 'Maintain fit premises.', applicability: 'When the residential act applies.', status: 'not_approved_for_matching' }] }

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }

describe('LegalPackInventory', () => {
  beforeEach(() => { vi.mocked(justiceApi.listLegalPacks).mockReset().mockResolvedValue({ packs: [] }); vi.mocked(justiceApi.getLegalPackSource).mockReset().mockResolvedValue(sourceDetail) })

  it('shows installed pack provenance, exact source detail, official link, and conspicuous limitations', async () => {
    vi.mocked(justiceApi.listLegalPacks).mockResolvedValue(inventory)
    render(<LegalPackInventory />)
    expect(screen.getByText(/web Code is current through the 2025 Session, but it is an unofficial research source/i)).toBeInTheDocument()
    expect(screen.getByText(/Not legal advice.*Verify current law.*every deadline/i)).toBeInTheDocument()
    expect(await screen.findByText(/South Carolina · Landlord–tenant/i)).toBeInTheDocument()
    expect(screen.getByText('offline_verified')).toBeInTheDocument()
    expect(screen.getByText('not_approved_for_matching')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /S\.C\. Code § 27-40-440/i }))
    expect(screen.getByText(/A landlord shall comply/i)).toBeInTheDocument()
    expect(screen.getByText(/Title 27, Chapter 40, Section 440/i)).toBeInTheDocument()
    expect(screen.getByText('Maintain fit premises.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /canonical official source/i })).toHaveAttribute('href', 'https://www.scstatehouse.gov/code/t27c040.php')
    expect(screen.queryByText(/violation|broke the law/i)).not.toBeInTheDocument()
  })

  it('shows truthful empty and error states', async () => {
    const { unmount } = render(<LegalPackInventory />)
    expect(await screen.findByText(/No installed legal packs were reported/i)).toBeInTheDocument()
    unmount()
    vi.mocked(justiceApi.listLegalPacks).mockRejectedValue(new Error('List legal packs failed: 503 unavailable'))
    render(<LegalPackInventory />)
    expect(await screen.findByRole('alert')).toHaveTextContent('503 unavailable')
  })

  it('keeps the newest refresh when an older request resolves last', async () => {
    const older = deferred<LegalPacksResponse>(); const newer = deferred<LegalPacksResponse>()
    vi.mocked(justiceApi.listLegalPacks).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    render(<LegalPackInventory />)
    await userEvent.click(screen.getByRole('button', { name: /refresh packs/i }))
    newer.resolve(inventory)
    expect(await screen.findByText(/South Carolina · Landlord–tenant/i)).toBeInTheDocument()
    older.resolve({ packs: [{ ...inventory.packs[0]!, pack_id: 'stale', matter_type: 'Stale pack' }] })
    await older.promise
    await waitFor(() => expect(screen.queryByText(/Stale pack/i)).not.toBeInTheDocument())
    expect(screen.getByText(/Landlord–tenant/i)).toBeInTheDocument()
  })

  it('invalidates an in-flight source detail when refresh removes that source', async () => {
    const lateDetail = deferred<typeof sourceDetail>(); const refreshed = deferred<LegalPacksResponse>()
    vi.mocked(justiceApi.listLegalPacks).mockResolvedValueOnce(inventory).mockReturnValueOnce(refreshed.promise)
    vi.mocked(justiceApi.getLegalPackSource).mockReturnValue(lateDetail.promise)
    render(<LegalPackInventory />)
    await userEvent.click(await screen.findByRole('button', { name: /S\.C\. Code § 27-40-440/i }))
    await waitFor(() => expect(justiceApi.getLegalPackSource).toHaveBeenCalledWith('sc-landlord-tenant', 'sc-code-27-40-440'))
    await userEvent.click(screen.getByRole('button', { name: /refresh packs/i }))
    refreshed.resolve({ packs: [] })
    expect(await screen.findByText(/No installed legal packs were reported/i)).toBeInTheDocument()
    lateDetail.resolve(sourceDetail)
    await lateDetail.promise
    expect(screen.queryByRole('heading', { name: /S\.C\. Code § 27-40-440/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/A landlord shall comply/i)).not.toBeInTheDocument()
  })
})
