import React from "react";
import { Button } from "@vibetech/ui";
import { Mic, MicOff } from "lucide-react";

interface VoiceCommandButtonProps {
  isListening: boolean;
  onToggle: () => void;
  label?: string;
  stopLabel?: string;
  className?: string;
}

export const VoiceCommandButton = ({
  isListening,
  onToggle,
  label = "Voice Command",
  stopLabel = "Stop Voice",
  className = "",
}: VoiceCommandButtonProps) => {
  // Detect if user is on mobile/iPhone for touch-friendly design
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-2 transition-all duration-300 transform border-2 font-semibold shadow-lg hover:shadow-xl active:shadow-md ${
        // Enhanced minimum touch target size for iPhone/mobile (44px minimum)
        isMobile ? "min-h-[48px] min-w-[120px] px-4" : "min-h-[44px] px-3"
      } ${
        isListening
          ? // Brighter, more vibrant colors for active state - better visibility in warehouse
            "border-red-500 bg-gradient-to-r from-red-100 to-red-200 text-red-700 hover:from-red-200 hover:to-red-300 animate-pulse shadow-red-200"
          : // Brighter blue gradient for inactive state - less dull colors
            "border-blue-500 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 hover:from-blue-200 hover:to-cyan-200 hover:border-blue-600 hover:scale-105 focus:scale-95 shadow-blue-200"
      } ${
        // Enhanced touch feedback for mobile devices
        isMobile ? "active:scale-95 touch-manipulation" : ""
      } ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      onTouchEnd={isMobile ? (e) => {
        e.preventDefault();
        onToggle();
      } : undefined}
      aria-label={
        isListening ? "Stop voice recognition" : "Start voice recognition"
      }
      // Enhanced accessibility for warehouse workers
      role="button"
      tabIndex={0}
    >
      {isListening ? (
        <>
          <div className="relative">
            <MicOff className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></span>
          </div>
          <span className="text-value font-bold">{stopLabel}</span>
        </>
      ) : (
        <>
          <Mic className="h-5 w-5" />
          <span className="text-value font-bold">🎤 {label}</span>
        </>
      )}
    </Button>
  );
};
