import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { Button } from '@vibetech/ui'
import { AlertCircle, CheckCircle, Mic, MicOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'

interface Command {
  text: string
  confidence?: number
  isVoice?: boolean
}

const COMMAND_SUGGESTIONS = [
  'add door ',
  'remove door ',
  'export all',
  'show status',
  // ...add more as needed
]

export const AdvancedHybridInputBar = ({
  onSubmit,
}: {
  onSubmit: (cmd: Command) => void
}) => {
  const [input, setInput] = useState('')
  const [voiceActive, setVoiceActive] = useState(false)
  const [history, setHistory] = useState<Command[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const { transcript, isListening, startListening, stopListening, confidence } =
    useSpeechRecognition({ engine: 'browser' })

  // Command suggestions
  const updateSuggestions = useCallback((val: string) => {
    if (!val) {
      setSuggestions([])
      return
    }
    setSuggestions(
      COMMAND_SUGGESTIONS.filter(cmd => cmd.startsWith(val.toLowerCase()))
    )
  }, [])

  // Submit logic
  const submitCommand = useCallback((text: string, conf?: number, isVoice?: boolean) => {
    if (!text.trim()) return
    const cmd: Command = { text: text.trim(), confidence: conf, isVoice }
    onSubmit(cmd)
    setHistory(h => [...h, cmd])
    setInput('')
    setSuggestions([])
    setHistoryIndex(null)
    stopListening()
    setVoiceActive(false)
  }, [onSubmit, stopListening])

  // Handle voice toggle
  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening()
      setVoiceActive(false)
    } else {
      startListening()
      setVoiceActive(true)
    }
  }, [isListening, stopListening, startListening])

  // Update input with transcript when voice is active
  useEffect(() => {
    if (voiceActive && transcript) {
      setInput(transcript)
      updateSuggestions(transcript)
    }
  }, [transcript, voiceActive, updateSuggestions])

  // Stop voice if user types
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (voiceActive) {
      stopListening()
      setVoiceActive(false)
    }
    setInput(e.target.value)
    updateSuggestions(e.target.value)
  }

  // Keyboard shortcuts and history
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        handleMicClick()
      }
      if (e.key === 'Escape' && isListening) {
        stopListening()
        setVoiceActive(false)
      }
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        submitCommand(input, confidence, voiceActive)
      }
      if (e.key === 'ArrowUp') {
        if (history.length > 0) {
          setHistoryIndex(idx => {
            const newIdx =
              idx === null ? history.length - 1 : Math.max(0, idx - 1)
            if (history[newIdx]) setInput(history[newIdx].text)
            return newIdx
          })
        }
      }
      if (e.key === 'ArrowDown') {
        if (history.length > 0 && historyIndex !== null) {
          const newIdx = Math.min(history.length - 1, historyIndex + 1)
          if (history[newIdx]) setInput(history[newIdx].text)
          setHistoryIndex(newIdx)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [input, isListening, voiceActive, history, historyIndex, confidence, handleMicClick, submitCommand, stopListening])

  // Suggestion click
  const handleSuggestionClick = (s: string) => {
    setInput(s)
    setSuggestions([])
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          className="flex-1 border rounded px-3 py-2"
          placeholder={isListening ? 'Listening...' : 'Type or use voice'}
          aria-label="Input"
          autoComplete="off"
        />
        <Button
          type="button"
          onClick={handleMicClick}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          variant={isListening ? 'destructive' : 'outline'}
        >
          {isListening ? <MicOff /> : <Mic />}
        </Button>
        <Button
          type="button"
          onClick={() => submitCommand(input, confidence, voiceActive)}
          disabled={!input.trim()}
        >
          Submit
        </Button>
        {voiceActive && (
          <span className="ml-2 text-xs text-gray-500">
            {isListening ? 'Listening...' : 'Voice ready'}
          </span>
        )}
        {typeof confidence === 'number' && (
          <span
            className={`ml-2 text-xs flex items-center gap-1 ${
              confidence > 0.8 ? 'text-green-600' : 'text-yellow-600'
            }`}
            aria-live="polite"
          >
            {confidence > 0.8 ? (
              <CheckCircle size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            {Math.round(confidence * 100)}% confidence
          </span>
        )}
      </div>
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <ul className="border rounded bg-white shadow p-2 mt-1 max-w-md">
          {suggestions.map(s => (
            <li
              key={s}
              className="cursor-pointer hover:bg-gray-100 px-2 py-1"
              onClick={() => handleSuggestionClick(s)}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSuggestionClick(s)
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      {/* History */}
      {history.length > 0 && (
        <div className="flex gap-2 mt-1 flex-wrap">
          {history
            .slice(-5)
            .reverse()
            .map((cmd, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="ghost"
                onClick={() => setInput(cmd.text)}
                aria-label={`Recall: ${cmd.text}`}
              >
                {cmd.text}
              </Button>
            ))}
        </div>
      )}
    </div>
  )
}
