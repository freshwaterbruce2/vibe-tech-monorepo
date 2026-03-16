import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { VoiceCommandButton } from "@/components/voice/VoiceCommandButton";
import { VoiceFeedbackTooltip } from "@/components/voice/VoiceFeedbackTooltip";
import { CommandListTooltip } from "@/components/voice/CommandListTooltip";
import VoiceCommandHelp from "@/components/voice/VoiceCommandHelp";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Button } from "@vibetech/ui";
import { MicOff, Info } from "lucide-react";
import { toast } from "sonner";

interface PalletVoiceControlProps {
  onAddDoor: () => void;
}

const PalletVoiceControl = ({ onAddDoor }: PalletVoiceControlProps) => {
  const { settings } = useUserSettings();
  const { browserSupportsSpeechRecognition } = useSpeechRecognition();

  const palletCommandPatterns = [
    {
      regex: /add counter|add pallet|counter|pallet|new pallet|new counter/i,
      commandName: "add pallet",
    },
  ];

  const {
    isListening,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    recentCommand,
    isProcessing,
    isFinal,
    getConfidenceColor,
  } = useVoiceCommand({
    commandPatterns: palletCommandPatterns,
    onCommandRecognized: onAddDoor,
    speakBackText: "Pallet counter added",
  });

  if (!settings.voiceRecognitionEnabled) return null;

  // Show alternative for unsupported browsers
  if (!browserSupportsSpeechRecognition) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast.info("Voice commands not available", {
            description: "Use the 'Add Counter' button instead. Voice commands work best in Chrome on desktop.",
            duration: 4000,
          });
        }}
        className="gap-2 border-gray-300 text-gray-500 hover:bg-gray-50"
      >
        <MicOff className="h-4 w-4" />
        <Info className="h-3 w-3" />
      </Button>
    );
  }

  const validCommands = [
    "Add counter",
    "Add pallet",
    "New counter",
    "Counter",
    "Pallet",
  ];

  return (
    <div className="relative flex items-center gap-1">
      <VoiceCommandButton
        isListening={isListening}
        onToggle={isListening ? stopListening : startListening}
        label="Voice Control"
        stopLabel="Stop Listening"
      />

      <VoiceCommandHelp commandType="pallet" />

      <VoiceFeedbackTooltip
        isListening={isListening}
        isProcessing={isProcessing}
        interimTranscript={interimTranscript}
        transcript={transcript}
        isFinal={isFinal}
        recentCommand={recentCommand}
        getConfidenceColor={getConfidenceColor}
        helpText='Say "Add Pallet" or "Add Counter"'
      />

      <CommandListTooltip
        isListening={isListening}
        commandList={validCommands}
      />
    </div>
  );
};

export default PalletVoiceControl;
