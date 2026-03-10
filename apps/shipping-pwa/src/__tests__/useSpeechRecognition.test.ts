import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { act, renderHook, waitFor } from '@testing-library/react'

// Mock SpeechRecognition for testing

// Define a class-based mock for SpeechRecognition
class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = 'en-US'
  onresult = null
  onend = null
  onerror = null
  start = vi.fn(function (this: any) {
    if (this.onresult) {
      this.onresult({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: {
              transcript: 'add door 342',
              confidence: 0.9,
            },
            length: 1,
          },
        ],
      })
    }
  })
  stop = vi.fn()
}

beforeAll(() => {
  Object.defineProperty(window, 'SpeechRecognition', {
    writable: true,
    configurable: true,
    value: MockSpeechRecognition,
  })
})

afterAll(() => {
  // Optionally restore the original property if needed
  // delete window.SpeechRecognition;
})

// Temporarily commenting out due to removed dependencies.
// import { renderHook } from '@testing-library/react-hooks';

describe('useSpeechRecognition Hook', () => {
  test('initializes without errors', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    expect(result.current).toBeDefined()
  })
})

// Mock the Web Speech Grammar List
Object.defineProperty(window, 'SpeechGrammarList', {
  value: class MockSpeechGrammarList {
    addFromString = vi.fn()
    addFromURI = vi.fn()
    length = 0
  },
})

describe('useSpeechRecognition hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should accept commands with high confidence', async () => {
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
  })

  it('should reject commands with low confidence', async () => {
    // Override start to emit low confidence
    ;(window as any).SpeechRecognition.prototype.start = vi.fn(function (
      this: any
    ) {
      if (this.onresult) {
        this.onresult({
          resultIndex: 0,
          results: [
            {
              isFinal: true,
              0: {
                transcript: 'add door 342',
                confidence: 0.6,
              },
              length: 1,
            },
          ],
        })
      }
    })
    // Commenting out renderHook usages due to removed dependency
    const { result } = renderHook(() =>
      useSpeechRecognition({
        confidenceThreshold: 0.8,
      })
    )
    act(() => {
      result.current.startListening()
    })
    // Transcript should not be set with the low confidence value
    expect(result.current.transcript).toBe('')
    expect(result.current.confidence).toBe(0)
  })
})
