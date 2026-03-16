import { useCallback, useEffect, useRef, useState } from 'react'

// Define SpeechRecognition interface
interface SpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  grammars?: SpeechGrammarList
  onresult: (event: SpeechRecognitionEvent) => void
  onend: () => void
  onerror: (event: unknown) => void
  onaudiostart?: () => void
  onspeechstart?: () => void
  onspeechend?: () => void
  onnomatch?: (event: unknown) => void
  start: () => void
  stop: () => void
  abort: () => void
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: {
    transcript: string
    confidence: number
  }
  length: number
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
  interpretation: unknown
}

interface SpeechGrammarList {
  addFromString: (grammar: string, weight?: number) => void
  addFromURI: (src: string, weight?: number) => void
  length: number
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
    SpeechGrammarList?: new () => SpeechGrammarList
    webkitSpeechGrammarList?: new () => SpeechGrammarList
  }
}

interface SpeechRecognitionOptions {
  confidenceThreshold?: number
  commandTimeout?: number
  noiseSupression?: boolean
  echoCancellation?: boolean
  useGrammar?: boolean
  autoStop?: boolean
}

// Define speech recognition hook return type
interface SpeechRecognitionHook {
  transcript: string
  interimTranscript: string // Added for showing partial results
  isListening: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  confidence: number
  isProcessing: boolean
  isFinal: boolean // Added to indicate if the result is final
  browserSupportsSpeechRecognition: boolean // Added for compatibility check
}

// JSGF grammar for warehouse commands (reserved for future use)
const _WAREHOUSE_GRAMMAR = `#JSGF V1.0;
grammar warehouseCommands;
public <command> = <doorCommand> | <palletCommand>;
<doorCommand> = (add | new) door [<doorNumber>] [to <dcNumber>] [freight <freightType>] [status <trailerStatus>];
<palletCommand> = (add | new) (counter | pallet);
<doorNumber> = (332 | 333 | 334 | 335 | 336 | 337 | 338 | 339 | 340 | 341 | 342 | 343 | 344 | 345 |
                346 | 347 | 348 | 349 | 350 | 351 | 352 | 353 | 354 | 355 | 356 | 357 | 358 | 359 |
                360 | 361 | 362 | 363 | 364 | 365 | 366 | 367 | 368 | 369 | 370 | 371 | 372 | 373 |
                374 | 375 | 376 | 377 | 378 | 379 | 380 | 381 | 382 | 383 | 384 | 385 | 386 | 387 |
                388 | 389 | 390 | 391 | 392 | 393 | 394 | 395 | 396 | 397 | 398 | 399 | 400 | 401 |
                402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 |
                416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 425 | 426 | 427 | 428 | 429 |
                430 | 431 | 432 | 433 | 434 | 435 | 436 | 437 | 438 | 439 | 440 | 441 | 442 | 443 |
                444 | 445 | 446 | 447 | 448 | 449 | 450 | 451 | 452 | 453 | 454);
<dcNumber> = (6024 | 6070 | 6039 | 6040 | 7045);
<freightType> = (23/43 | 28 | XD);
<trailerStatus> = (empty | partial | shipload | 25% | 50% | 75%);
`

// Factory function to create recognition engine based on type
export type Engine = 'browser'

export const createRecognizer = (_engine: Engine) => {
  return null // Let the hook handle browser recognition
}

export const useSpeechRecognition = (
  _options: SpeechRecognitionOptions & { engine?: Engine } = {}
): SpeechRecognitionHook => {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [isFinal, setIsFinal] = useState(false)

  const recognitionRef = useRef<any>(null)

  // Check browser support for speech recognition with iPhone/Safari specific detection
  const browserSupportsSpeechRecognition = (() => {
    // Check if we're on iPhone/Safari PWA
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari =
      /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches

    // Safari on iOS PWA has limited speech recognition support
    if (isIOS && isSafari && isPWA) {
      console.warn(
        'Voice commands may have limited functionality on iPhone Safari PWA'
      )
      return false // Disable for now to prevent issues
    }

    return !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)
  })()

  // Simple speech recognition setup
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.warn('Speech recognition not supported on this device/browser')
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.maxAlternatives = 1

        recognition.onresult = event => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]!
            const transcript = result[0]!.transcript
            if (result.isFinal) {
              finalTranscript += transcript
              setTranscript(finalTranscript)
              setConfidence(result[0]!.confidence || 0.8)
              setIsFinal(true)
            } else {
              interimTranscript += transcript
              setInterimTranscript(interimTranscript)
            }
          }
        }

        recognition.onend = () => {
          setIsListening(false)
          setIsProcessing(false)
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event)
          console.error('Error type:', event.error)
          setIsListening(false)
          setIsProcessing(false)

          // Provide user-friendly error messages
          if (event.error === 'not-allowed') {
            console.warn(
              'Microphone access denied. Please enable microphone permissions.'
            )
          } else if (event.error === 'no-speech') {
            console.warn('No speech detected. Please try again.')
          } else if (event.error === 'network') {
            console.warn('Network error occurred during speech recognition.')
          }
        }

        recognition.onaudiostart = () => {}

        recognition.onspeechstart = () => {}

        recognition.onspeechend = () => {}

        recognitionRef.current = recognition
      } catch (error) {
        console.error('Failed to initialize speech recognition:', error)
      }
    }
  }, [browserSupportsSpeechRecognition])

  const startListening = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      console.warn('Speech recognition not supported on this device')
      return
    }

    if (recognitionRef.current) {
      setTranscript('')
      setInterimTranscript('')
      setConfidence(0)
      setIsFinal(false)
      setIsProcessing(true)
      setIsListening(true)

      try {
        recognitionRef.current.start()
      } catch (error: any) {
        console.error('Speech recognition start error:', error)
        setIsListening(false)
        setIsProcessing(false)

        // Handle specific error cases
        if (error.name === 'InvalidStateError') {
          console.warn('Speech recognition is already running')
        } else if (error.name === 'NotAllowedError') {
          console.warn('Microphone access denied')
        }
      }
    } else {
      console.warn('Speech recognition not initialized')
    }
  }, [browserSupportsSpeechRecognition])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setConfidence(0)
    setIsFinal(false)
  }, [])

  return {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    confidence,
    isProcessing,
    isFinal,
    browserSupportsSpeechRecognition,
  }
}
