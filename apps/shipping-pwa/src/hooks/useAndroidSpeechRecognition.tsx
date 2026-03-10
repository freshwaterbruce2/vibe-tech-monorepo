import { detectAndroidEnvironment } from '@/utils/androidUtils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface AndroidSpeechRecognitionOptions {
  confidenceThreshold?: number
  commandTimeout?: number
  fallbackToTextInput?: boolean
  showCompatibilityWarnings?: boolean
}

interface AndroidSpeechRecognitionResult {
  transcript: string
  interimTranscript: string
  isListening: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  confidence: number
  isProcessing: boolean
  isFinal: boolean
  browserSupportsSpeechRecognition: boolean
  androidDeviceInfo: ReturnType<typeof detectAndroidEnvironment>
  showTextInputFallback: boolean
  compatibilityIssues: string[]
}

export const useAndroidSpeechRecognition = (
  options: AndroidSpeechRecognitionOptions = {}
): AndroidSpeechRecognitionResult => {
  const {
    confidenceThreshold = 0.7,
    commandTimeout = 10000,
    fallbackToTextInput = true,
    showCompatibilityWarnings = true,
  } = options

  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [isFinal, setIsFinal] = useState(false)
  const [showTextInputFallback, setShowTextInputFallback] = useState(false)
  const [compatibilityIssues, setCompatibilityIssues] = useState<string[]>([])

  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<number | null>(null)

  // Get Android device information
  const androidDeviceInfo = detectAndroidEnvironment()

  // Enhanced browser support detection for Android
  const browserSupportsSpeechRecognition = (() => {
    // First check basic support
    const hasBasicSupport = !!(
      window.SpeechRecognition ?? window.webkitSpeechRecognition
    )

    if (!hasBasicSupport) return false

    // Android WebView often has speech recognition but it doesn't work reliably
    if (androidDeviceInfo.isWebView) {
      const issue = 'Speech recognition in Android WebView is unreliable'
      setCompatibilityIssues(prev => [...prev, issue])

      if (showCompatibilityWarnings) {
        console.warn(issue)
        toast.warning('Limited Voice Support', {
          description:
            'Voice commands may not work in this app version. Try using Chrome.',
          duration: 5000,
        })
      }

      if (fallbackToTextInput) {
        setShowTextInputFallback(true)
      }

      return false
    }

    // Check Android version compatibility
    if (
      androidDeviceInfo.version &&
      parseFloat(androidDeviceInfo.version) < 6.0
    ) {
      const issue = 'Android version too old for reliable speech recognition'
      setCompatibilityIssues(prev => [...prev, issue])

      if (showCompatibilityWarnings) {
        toast.warning('Outdated Android Version', {
          description:
            'Voice commands may not work on Android versions below 6.0',
          duration: 5000,
        })
      }

      return false
    }

    // Check if Chrome is available (best Android support)
    if (!androidDeviceInfo.isChrome) {
      const issue =
        'Non-Chrome browser detected - speech recognition may be limited'
      setCompatibilityIssues(prev => [...prev, issue])

      if (showCompatibilityWarnings) {
        toast.info('Browser Recommendation', {
          description:
            'For best voice command support, please use Chrome browser',
          duration: 4000,
        })
      }
    }

    return hasBasicSupport
  })()

  // Initialize speech recognition with Android optimizations
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.warn('Speech recognition not supported on this Android device')
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()

        // Android-optimized settings
        recognition.continuous = false // Better for Android
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.maxAlternatives = 1

        // Android-specific optimizations
        if (androidDeviceInfo.version) {
          const version = parseFloat(androidDeviceInfo.version)

          // Older Android versions need shorter sessions
          if (version < 8.0) {
            recognition.continuous = false
          }

          // Very old versions should use minimal settings
          if (version < 6.0) {
            recognition.interimResults = false
          }
        }

        recognition.onresult = event => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]!
            const transcript = result[0]!.transcript
            const resultConfidence = result[0]!.confidence || 0.8

            if (result.isFinal) {
              // Apply confidence threshold for Android
              if (resultConfidence >= confidenceThreshold) {
                finalTranscript += transcript
                setTranscript(finalTranscript)
                setConfidence(resultConfidence)
                setIsFinal(true)
              } else {
                console.warn(
                  `Low confidence result ignored: ${resultConfidence}`
                )
                if (showCompatibilityWarnings) {
                  toast.warning('Voice Command Unclear', {
                    description: 'Please speak more clearly and try again',
                    duration: 2000,
                  })
                }
              }
            } else {
              interimTranscript += transcript
              setInterimTranscript(interimTranscript)
            }
          }
        }
        ;(recognition as any).onstart = () => {
          console.log('Android speech recognition started')
          setIsProcessing(true)

          // Set timeout for Android (some versions hang)
          timeoutRef.current = window.setTimeout(() => {
            console.warn('Speech recognition timeout on Android')
            recognition.stop()
          }, commandTimeout)
        }
        ;(recognition as any).onend = () => {
          console.log('Android speech recognition ended')
          setIsListening(false)
          setIsProcessing(false)

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        }
        ;(recognition as any).onerror = (event: any) => {
          console.error('Android speech recognition error:', event)
          console.error('Error type:', event.error)
          setIsListening(false)
          setIsProcessing(false)

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }

          // Android-specific error handling
          let errorMessage = 'Voice command failed'
          let description = 'Please try again'

          switch (event.error) {
            case 'not-allowed':
              errorMessage = 'Microphone Access Denied'
              description =
                'Please enable microphone permissions in your browser settings'
              setCompatibilityIssues(prev => [
                ...prev,
                'Microphone permission denied',
              ])
              break

            case 'no-speech':
              errorMessage = 'No Speech Detected'
              description = 'Please speak louder or check microphone'
              break

            case 'network':
              errorMessage = 'Network Error'
              description = 'Speech recognition requires internet connection'
              setCompatibilityIssues(prev => [
                ...prev,
                'Network connectivity required',
              ])
              break

            case 'audio-capture':
              errorMessage = 'Microphone Error'
              description =
                'Unable to access microphone. Try restarting the app.'
              setCompatibilityIssues(prev => [...prev, 'Audio capture failed'])
              break

            case 'service-not-allowed':
              errorMessage = 'Service Blocked'
              description =
                'Speech service is blocked. Try using Chrome browser.'
              setCompatibilityIssues(prev => [
                ...prev,
                'Speech service blocked',
              ])
              break

            default:
              description = `Error: ${event.error}. Try using Chrome browser.`
          }

          if (showCompatibilityWarnings) {
            toast.error(errorMessage, {
              description,
              duration: 4000,
            })
          }

          // Show fallback input on persistent errors
          if (
            fallbackToTextInput &&
            ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(
              event.error
            )
          ) {
            setShowTextInputFallback(true)
          }
        }

        recognitionRef.current = recognition
      } catch (error) {
        console.error('Failed to initialize Android speech recognition:', error)
        setCompatibilityIssues(prev => [
          ...prev,
          'Speech recognition initialization failed',
        ])

        if (fallbackToTextInput) {
          setShowTextInputFallback(true)
        }
      }
    }
  }, [
    browserSupportsSpeechRecognition,
    confidenceThreshold,
    commandTimeout,
    fallbackToTextInput,
    showCompatibilityWarnings,
    androidDeviceInfo.version,
  ])

  const startListening = useCallback(async () => {
    if (!browserSupportsSpeechRecognition) {
      console.warn('Speech recognition not supported on this Android device')

      if (fallbackToTextInput) {
        setShowTextInputFallback(true)
      }
      return
    }

    if (recognitionRef.current) {
      // Request microphone permission explicitly for Android
      if (androidDeviceInfo.isAndroid) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          stream.getTracks().forEach(track => track.stop()) // Stop immediately, just checking permission
        } catch (error) {
          console.error('Microphone permission denied:', error)

          if (showCompatibilityWarnings) {
            toast.error('Microphone Permission Required', {
              description:
                'Please allow microphone access to use voice commands',
              duration: 5000,
            })
          }

          if (fallbackToTextInput) {
            setShowTextInputFallback(true)
          }
          return
        }
      }

      setTranscript('')
      setInterimTranscript('')
      setConfidence(0)
      setIsFinal(false)
      setIsProcessing(true)
      setIsListening(true)

      try {
        recognitionRef.current.start()
      } catch (error: any) {
        console.error('Android speech recognition start error:', error)
        setIsListening(false)
        setIsProcessing(false)

        if (error.name === 'InvalidStateError') {
          console.warn('Speech recognition already running on Android')
          // Try to stop and restart
          try {
            recognitionRef.current.stop()
            setTimeout(() => {
              recognitionRef.current.start()
              setIsListening(true)
              setIsProcessing(true)
            }, 500)
          } catch (retryError) {
            console.error('Failed to restart speech recognition:', retryError)
          }
        } else if (error.name === 'NotAllowedError') {
          if (showCompatibilityWarnings) {
            toast.error('Microphone Access Denied', {
              description: 'Please enable microphone permissions',
              duration: 4000,
            })
          }

          if (fallbackToTextInput) {
            setShowTextInputFallback(true)
          }
        }
      }
    } else {
      console.warn('Android speech recognition not initialized')

      if (fallbackToTextInput) {
        setShowTextInputFallback(true)
      }
    }
  }, [
    browserSupportsSpeechRecognition,
    androidDeviceInfo.isAndroid,
    fallbackToTextInput,
    showCompatibilityWarnings,
  ])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setConfidence(0)
    setIsFinal(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
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
    androidDeviceInfo,
    showTextInputFallback,
    compatibilityIssues,
  }
}
