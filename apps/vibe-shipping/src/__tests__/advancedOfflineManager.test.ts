import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * Minimal fake IndexedDB sufficient to satisfy AdvancedOfflineManager's
 * initialization sequence. jsdom (the test environment for this project)
 * does not implement IndexedDB, so `indexedDB` is undefined by default and
 * must be stubbed before the module under test is imported.
 */
function createFakeIndexedDB() {
  class FakeRequest {
    onsuccess: (() => void) | null = null
    onerror: (() => void) | null = null
    onupgradeneeded:
      | ((event: { target: { result: FakeDatabase } }) => void)
      | null = null
    result: unknown = undefined
    error: unknown = undefined
  }

  class FakeObjectStore {
    createIndex(): void {
      // No-op: index creation has no observable effect in this fake.
    }
    put(): FakeRequest {
      const request = new FakeRequest()
      queueMicrotask(() => request.onsuccess?.())
      return request
    }
    getAll(): FakeRequest {
      const request = new FakeRequest()
      request.result = []
      queueMicrotask(() => request.onsuccess?.())
      return request
    }
  }

  class FakeDatabase {
    objectStoreNames = { contains: () => false }
    createObjectStore(): FakeObjectStore {
      return new FakeObjectStore()
    }
    transaction(): { objectStore: () => FakeObjectStore } {
      return { objectStore: () => new FakeObjectStore() }
    }
  }

  return {
    open(): FakeRequest {
      const request = new FakeRequest()
      const db = new FakeDatabase()
      request.result = db
      queueMicrotask(() => {
        request.onupgradeneeded?.({ target: { result: db } })
        request.onsuccess?.()
      })
      return request
    },
  }
}

describe('advancedOfflineManager.getSyncStatus', () => {
  beforeAll(() => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB())
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('reports lastSync as null instead of a fabricated timestamp when no sync has completed', async () => {
    const { advancedOfflineManager } =
      await import('../services/advanced-offline-manager')

    const status = await advancedOfflineManager.getSyncStatus()

    expect(status.lastSync).toBeNull()
  })
})
