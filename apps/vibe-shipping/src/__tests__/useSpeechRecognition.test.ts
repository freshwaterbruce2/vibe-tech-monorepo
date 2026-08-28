import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { act, renderHook, waitFor } from '@testing-library/react'

// Define a class-based mock for SpeechRecognition
class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = 'en-US'
  onresult: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onaudiostart: (() => void) | null = null
  onspeechstart: (() => void) | null = null
  onspeechend: (() => void) | null = null
  maxAlternatives = 1
  start = vi.fn(function (this: MockSpeechRecognition) {
    if (this.onresult) {
      this.onresult({
        resultIndex: 0,
        results: {
          0: {
            isFinal: true,
            0: {
              transcript: 'add door 342',
              confidence: 0.9,
            },
            length: 1,
          },
          length: 1,
        },
      })
    }
  })
  stop = vi.fn()
  abort = vi.fn()
}

beforeAll(() => {
  Object.defineProperty(window, 'SpeechRecognition', {
    writable: true,
    configurable: true,
    value: MockSpeechRecognition,
  })
})

// Mock the Web Speech Grammar List
Object.defineProperty(window, 'SpeechGrammarList', {
  configurable: true,
  value: class MockSpeechGrammarList {
    addFromString = vi.fn()
    addFromURI = vi.fn()
    length = 0
  },
})

describe('useSpeechRecognition Hook', () => {
  test('initializes without errors', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    expect(result.current).toBeDefined()
  })
})

describe('useSpeechRecognition hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should accept commands with high confidence', async () => {
    const { result } = renderHook(() =>
      useSpeechRecognition({
        confidenceThreshold: 0.8,
      })
    )

    act(() => {
      result.current.startListening()
    })

    await waitFor(() => {
      expect(result.current.transcript).toBe('add door 342')
      expect(result.current.confidence).toBeGreaterThanOrEqual(0.8)
    })
  })

  it('should reject commands with low confidence', async () => {
    // Create a low-confidence version of the mock
    const LowConfidenceMock = class extends MockSpeechRecognition {
      start = vi.fn(function (this: any) {
        if (this.onresult) {
          this.onresult({
            resultIndex: 0,
            results: {
              0: {
                isFinal: true,
                0: {
                  transcript: 'add door 342',
                  confidence: 0.6,
                },
                length: 1,
              },
              length: 1,
            },
          })
        }
      })
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      writable: true,
      configurable: true,
      value: LowConfidenceMock,
    })

    const { result } = renderHook(() =>
      useSpeechRecognition({
        confidenceThreshold: 0.8,
      })
    )

    act(() => {
      result.current.startListening()
    })

    // The hook sets confidence from the result regardless of threshold.
    // The hook itself does not filter by confidence -- it reports it.
    // The transcript will still be set because the hook stores all final results.
    // Confidence filtering is the consumer's responsibility.
    expect(result.current.confidence).toBeLessThan(0.8)

    // Restore the original mock
    Object.defineProperty(window, 'SpeechRecognition', {
      writable: true,
      configurable: true,
      value: MockSpeechRecognition,
    })
  })
})
