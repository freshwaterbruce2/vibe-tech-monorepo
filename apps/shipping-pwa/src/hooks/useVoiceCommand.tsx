import { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useUserSettings } from "@/hooks/useUserSettings";
// cspell:ignore sonner hotword
import { toast } from "sonner";

interface VoiceCommandOptions {
  commandPatterns: {
    regex: RegExp;
    commandName: string;
    feedback?: string; // Optional custom feedback per command
  }[];
  onCommandRecognized: (command: string, params?: string[]) => void;
  speakBackText?: string;
}

export function useVoiceCommand({
  commandPatterns,
  onCommandRecognized,
  speakBackText,
}: VoiceCommandOptions) {
  const { settings } = useUserSettings();
  const [recentCommand, setRecentCommand] = useState<string | null>(null);
  const [commandConfidence, setCommandConfidence] = useState<number>(0);
  const [isProcessingCommand, setIsProcessingCommand] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track the last processed transcript to prevent duplicates
  const lastProcessedTranscript = useRef<string>("");
  const processingTimeoutRef = useRef<number | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  const {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    confidence,
    isProcessing,
    isFinal,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition({
    engine: settings.voiceEngine ?? 'browser'
  });

  // Enhanced error handling with recovery attempts
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setErrorMessage("Speech recognition is not supported in this browser");
      toast.error("Speech recognition is not supported", {
        description: "Please try using a supported browser like Chrome",
        duration: 5000,
      });
      return;
    }


    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [browserSupportsSpeechRecognition, settings.voiceActivationMode]);

  // Enhanced command processing with parameter extraction
  useEffect(() => {
    if (!settings.voiceRecognitionEnabled || !transcript || isProcessingCommand || (!isFinal && !settings.voiceAcceptPartialResults)) return;

    if (transcript === lastProcessedTranscript.current) return;

    const command = transcript.toLowerCase().trim();
    let commandRecognized = false;

    // Check against all command patterns with parameter extraction
    for (const pattern of commandPatterns) {
      const match = command.match(pattern.regex);
      if (match) {
        setIsProcessingCommand(true);
        lastProcessedTranscript.current = transcript;

        // Extract parameters (groups from regex match)
        const params = match.slice(1);

        try {
          onCommandRecognized(pattern.commandName, params);
          setRecentCommand(pattern.commandName);
          setCommandConfidence(confidence);

          if (settings.speakBackCommands && (speakBackText || pattern.feedback)) {
            const utterance = new SpeechSynthesisUtterance(pattern.feedback ?? speakBackText);
            utterance.volume = settings.voiceVolume ?? 0.8;
            window.speechSynthesis.speak(utterance);
          }

          toast.success(
            `${pattern.commandName} via voice command! (${Math.round(confidence * 100)}% confidence)`,
            {
              position: "top-center",
              id: "voice-command-success",
              duration: 1500,
            },
          );

          commandRecognized = true;
        } catch (error) {
          console.error("Error executing command:", error);
          toast.error("Error executing voice command", {
            description: "Please try again",
            duration: 3000,
          });
        }
        break;
      }
    }

    // Clear the recent command and reset processing flag after a delay
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = window.setTimeout(
      () => {
        if (commandRecognized) {
          setRecentCommand(null);
        }
        setIsProcessingCommand(false);
        resetTranscript(); // Clear transcript to prevent re-processing
        processingTimeoutRef.current = null;
      },
      commandRecognized ? 2000 : 1000,
    ); // Longer delay for recognized commands
  }, [
    transcript,
    isFinal,
    confidence,
    settings,
    stopListening,
    isListening,
    isProcessingCommand,
    resetTranscript,
    commandPatterns,
    onCommandRecognized,
    speakBackText,
  ]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // When stopping listening, reset state
  useEffect(() => {
    if (!isListening) {
      lastProcessedTranscript.current = "";
      setIsProcessingCommand(false);
      resetTranscript();
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [isListening, resetTranscript]);

  // Show different visual feedback based on confidence level
  const getConfidenceColor = useCallback(() => {
    if (commandConfidence > 0.8) return "text-green-500";
    if (commandConfidence > 0.6) return "text-yellow-500";
    return "text-red-500";
  }, [commandConfidence]);

  return {
    isListening,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    recentCommand,
    commandConfidence,
    isProcessing,
    isFinal,
    isProcessingCommand,
    getConfidenceColor,
    errorMessage,
  };
}
