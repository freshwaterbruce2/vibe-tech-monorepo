import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBrainScan } from '../useBrainScan'
import type { BrainScanResult } from '@/types/logic'

// Mock window.vibeTech
const mockSearchLogic = vi.fn()

beforeEach(() => {
  // Setup window.vibeTech mock
  window.vibeTech = {
    searchLogic: mockSearchLogic,
    ping: vi.fn(),
    setSetting: vi.fn(),
    getSetting: vi.fn(),
    onLogicViolation: vi.fn(),
    onSettingsChanged: vi.fn(),
  } as typeof window.vibeTech

  // Suppress console.error and console.warn for cleaner test output
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).vibeTech
})

describe('useBrainScan', () => {
  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useBrainScan())

    expect(result.current.results).toEqual([])
    expect(result.current.isScanning).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.performScan).toBe('function')
  })

  it('sets isScanning to true during scan', async () => {
    mockSearchLogic.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    const { result } = renderHook(() => useBrainScan())

    act(() => {
      result.current.performScan('test code')
    })

    expect(result.current.isScanning).toBe(true)
  })

  it('returns results on successful scan', async () => {
    const mockResult: BrainScanResult = {
      patterns: [
        { id: '1', logic_rule: 'Rule A', tags: ['tag1', 'tag2'] },
        { id: '2', logic_rule: 'Rule B', tags: ['tag3'] },
      ],
      scores: [
        { score: 0.95 },
        { score: 0.78 },
      ],
    }

    mockSearchLogic.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('const x = 1;')
    })

    expect(result.current.results).toHaveLength(2)
    expect(result.current.results[0]).toEqual({
      id: '1',
      logic_rule: 'Rule A',
      tags: ['tag1', 'tag2'],
      relevance: 0.95,
    })
    expect(result.current.results[1]).toEqual({
      id: '2',
      logic_rule: 'Rule B',
      tags: ['tag3'],
      relevance: 0.78,
    })
    expect(result.current.isScanning).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets isScanning to false after completion', async () => {
    const mockResult: BrainScanResult = {
      patterns: [],
      scores: [],
    }

    mockSearchLogic.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('test')
    })

    expect(result.current.isScanning).toBe(false)
  })

  it('sets error state on failure', async () => {
    mockSearchLogic.mockRejectedValue(new Error('Connection failed'))

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('test code')
    })

    expect(result.current.error).toBe('Connection failed')
    expect(result.current.isScanning).toBe(false)
    expect(result.current.results).toEqual([])
  })

  it('handles legacy format by throwing error', async () => {
    // Backend returning legacy 'matches' format
    const legacyResult = {
      matches: [{ id: '1', text: 'match' }],
      patterns: undefined,
      scores: undefined,
    }

    mockSearchLogic.mockResolvedValue(legacyResult)

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('test code')
    })

    expect(result.current.error).toBe('Backend response format mismatch.')
    expect(result.current.isScanning).toBe(false)
  })

  it('clears error on subsequent successful scan', async () => {
    // First scan fails
    mockSearchLogic.mockRejectedValueOnce(new Error('First scan failed'))

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('test')
    })

    expect(result.current.error).toBe('First scan failed')

    // Second scan succeeds
    mockSearchLogic.mockResolvedValueOnce({
      patterns: [{ id: '1', logic_rule: 'Rule', tags: [] }],
      scores: [{ score: 0.9 }],
    })

    await act(async () => {
      await result.current.performScan('test again')
    })

    expect(result.current.error).toBeNull()
    expect(result.current.results).toHaveLength(1)
  })

  it('handles empty patterns array', async () => {
    mockSearchLogic.mockResolvedValue({
      patterns: [],
      scores: [],
    })

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('no matches')
    })

    expect(result.current.results).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.isScanning).toBe(false)
  })

  it('passes code snippet to searchLogic', async () => {
    mockSearchLogic.mockResolvedValue({
      patterns: [],
      scores: [],
    })

    const { result } = renderHook(() => useBrainScan())

    const codeSnippet = 'function test() { return true; }'

    await act(async () => {
      await result.current.performScan(codeSnippet)
    })

    expect(mockSearchLogic).toHaveBeenCalledWith(codeSnippet)
    expect(mockSearchLogic).toHaveBeenCalledTimes(1)
  })

  it('handles missing scores gracefully', async () => {
    mockSearchLogic.mockResolvedValue({
      patterns: [
        { id: '1', logic_rule: 'Rule', tags: [] },
      ],
      scores: [], // No scores provided
    })

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('test')
    })

    // Should use default score of 0
    expect(result.current.results[0].relevance).toBe(0)
  })

  it('provides fallback error message when none provided', async () => {
    mockSearchLogic.mockRejectedValue({})

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('test')
    })

    expect(result.current.error).toBe('BrainScan failed to connect to D: drive')
  })

  it('multiple scans update results correctly', async () => {
    // First scan
    mockSearchLogic.mockResolvedValueOnce({
      patterns: [{ id: '1', logic_rule: 'First Rule', tags: [] }],
      scores: [{ score: 0.5 }],
    })

    const { result } = renderHook(() => useBrainScan())

    await act(async () => {
      await result.current.performScan('first scan')
    })

    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].logic_rule).toBe('First Rule')

    // Second scan
    mockSearchLogic.mockResolvedValueOnce({
      patterns: [
        { id: '2', logic_rule: 'Second Rule A', tags: [] },
        { id: '3', logic_rule: 'Second Rule B', tags: [] },
      ],
      scores: [{ score: 0.9 }, { score: 0.8 }],
    })

    await act(async () => {
      await result.current.performScan('second scan')
    })

    expect(result.current.results).toHaveLength(2)
    expect(result.current.results[0].logic_rule).toBe('Second Rule A')
    expect(result.current.results[1].logic_rule).toBe('Second Rule B')
  })
})
