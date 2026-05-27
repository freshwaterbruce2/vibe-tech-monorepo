import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Custom hook for debouncing values
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for debouncing function calls
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  ) as T

  return debouncedCallback
}

/**
 * Custom hook for throttling function calls
 * @param callback - The function to throttle
 * @param delay - The delay in milliseconds
 * @returns The throttled function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback)
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallRef.current

      if (timeSinceLastCall >= delay) {
        // Execute immediately if enough time has passed
        lastCallRef.current = now
        callbackRef.current(...args)
      } else {
        // Schedule execution for the remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          callbackRef.current(...args)
        }, delay - timeSinceLastCall)
      }
    },
    [delay]
  ) as T

  return throttledCallback
}

/**
 * Custom hook for debouncing voice commands specifically
 * Includes special handling for voice recognition patterns
 */
export function useVoiceCommandDebounce(
  callback: (transcript: string) => void,
  delay = 500
) {
  const [pendingTranscript, setPendingTranscript] = useState<string>('')
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastProcessedRef = useRef<string>('')

  const debouncedCallback = useCallback(
    (transcript: string) => {
      // Don't process empty or duplicate transcripts
      if (!transcript || transcript === lastProcessedRef.current) {
        return
      }

      setPendingTranscript(transcript)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        lastProcessedRef.current = transcript
        callback(transcript)
        setPendingTranscript('')
      }, delay)
    },
    [callback, delay]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Cancel pending operations
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setPendingTranscript('')
  }, [])

  // Force immediate execution
  const flush = useCallback(() => {
    if (timeoutRef.current && pendingTranscript) {
      clearTimeout(timeoutRef.current)
      lastProcessedRef.current = pendingTranscript
      callback(pendingTranscript)
      setPendingTranscript('')
    }
  }, [callback, pendingTranscript])

  return {
    debouncedCallback,
    cancel,
    flush,
    isPending: !!pendingTranscript,
    pendingTranscript,
  }
}

/**
 * Custom hook for managing memory-efficient state updates
 * Prevents unnecessary re-renders by comparing values
 */
export function useStableState<T>(
  initialValue: T,
  compareFn?: (a: T, b: T) => boolean
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue)
  const stateRef = useRef<T>(initialValue)

  const setStableState = useCallback(
    (value: T | ((prev: T) => T)) => {
      const newValue =
        typeof value === 'function'
          ? (value as (prev: T) => T)(stateRef.current)
          : value

      const areEqual = compareFn
        ? compareFn(stateRef.current, newValue)
        : Object.is(stateRef.current, newValue)

      if (!areEqual) {
        stateRef.current = newValue
        setState(newValue)
      }
    },
    [compareFn]
  )

  return [state, setStableState]
}

export default useDebounce
