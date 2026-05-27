import { Check, Volume } from 'lucide-react'

interface VoiceFeedbackTooltipProps {
  isListening: boolean
  isProcessing: boolean
  interimTranscript: string
  transcript: string
  isFinal: boolean
  recentCommand: string | null
  getConfidenceColor: () => string
  helpText: string
  commandList?: string[]
}

export const VoiceFeedbackTooltip = ({
  isListening,
  isProcessing,
  interimTranscript,
  transcript,
  isFinal,
  recentCommand,
  getConfidenceColor,
  helpText,
  commandList: _commandList,
}: VoiceFeedbackTooltipProps) => {
  // Detect mobile/iPhone for enhanced visibility
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  // Only show when listening
  if (!isListening) return null

  return (
    <div
      className={`absolute left-0 -bottom-16 bg-white px-4 py-3 rounded-lg shadow-xl border-2 border-blue-200 transition-all duration-200 animate-fade-in z-20 ${
        // Enhanced sizing and visibility for mobile/iPhone
        isMobile
          ? 'min-w-[200px] max-w-[280px] text-sm font-medium'
          : 'min-w-[180px] max-w-[250px] text-xs'
      }`}
      role="status"
      aria-live="polite"
      // Enhanced touch-friendly design for warehouse workers with gloves
    >
      {isProcessing && !interimTranscript ? (
        <div className="flex items-center">
          <Volume
            className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-blue-600 mr-2 animate-pulse`}
          />
          <span className="text-blue-700 font-semibold">🎤 Listening...</span>
          <span className="ml-2 inline-block animate-pulse text-blue-500">
            ●●●
          </span>
        </div>
      ) : interimTranscript ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-blue-700">Heard:</span>
            <span
              className={`italic font-medium ${
                isFinal
                  ? 'text-green-700 bg-green-50 px-2 py-1 rounded'
                  : 'text-orange-600 bg-orange-50 px-2 py-1 rounded'
              }`}
            >
              {isFinal ? transcript : interimTranscript}
            </span>
            {isFinal && (
              <Check
                className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-green-600`}
              />
            )}
          </div>
          {recentCommand && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded">
              <span className="font-bold text-blue-700">Command:</span>
              <span className={`font-semibold ${getConfidenceColor()}`}>
                {recentCommand}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col space-y-1">
          <span className="text-blue-700 font-bold">{helpText}</span>
          <span
            className={`text-blue-500 font-medium ${isMobile ? 'text-xs' : 'text-[10px]'}`}
          >
            🎙️ Voice recognition active - Speak clearly
          </span>
          {isIOS && (
            <span className="text-orange-600 font-medium text-xs">
              📱 iPhone detected - Optimized for Safari
            </span>
          )}
        </div>
      )}
    </div>
  )
}
