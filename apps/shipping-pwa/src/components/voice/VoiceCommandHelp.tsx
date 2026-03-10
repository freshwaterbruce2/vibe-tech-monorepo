import React, { useState } from "react";
import { Button } from "@vibetech/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { HelpCircle, Mic, X, Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VoiceCommandHelpProps {
  commandType: "pallet" | "door";
}

const VoiceCommandHelp: React.FC<VoiceCommandHelpProps> = ({ commandType }) => {
  const [isOpen, setIsOpen] = useState(false);

  const palletCommands = [
    { command: "Add counter", description: "Adds a new pallet counter" },
    { command: "Add pallet", description: "Same as add counter" },
    { command: "Counter", description: "Quick way to add counter" },
    { command: "Pallet", description: "Quick way to add counter" },
  ];

  const doorCommands = [
    { command: "Door 332 to 6024 XD empty", description: "⚡ FASTEST: Complete door setup in one command" },
    { command: "Door 332 to 6024", description: "🚀 FAST: Door with DC assignment" },
    { command: "Door 332", description: "⚡ Quick door number only" },
    { command: "332", description: "🔥 ULTRA-FAST: Just the number!" },
    { command: "6024", description: "🔥 ULTRA-FAST: Just DC number!" },
    { command: "XD", description: "🔥 ULTRA-FAST: Just freight type!" },
    { command: "Add door", description: "Basic door with defaults" },
  ];

  const commands = commandType === "pallet" ? palletCommands : doorCommands;

  const tips = [
    "Speak clearly and at normal speed",
    "Wait for the microphone icon to turn red before speaking",
    "You'll see a green toast message when command is recognized",
    "Try different variations if one doesn't work",
    "Make sure your microphone permissions are enabled",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Commands Help
          </DialogTitle>
          <DialogDescription>
            {commandType === "pallet"
              ? "Voice commands for pallet counter"
              : "Voice commands for door scheduling"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Available Commands:</h3>
            <div className="space-y-2">
              {commands.map((cmd, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <Badge variant="secondary" className="text-xs">
                    <Volume2 className="h-3 w-3 mr-1" />
                    Say
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">"{cmd.command}"</p>
                    <p className="text-xs text-gray-600">{cmd.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Tips for Success:</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How to use:</strong> Click the microphone button, wait for it to turn red,
              then speak one of the commands above clearly.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCommandHelp;
