import React, { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Keyboard } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KeyboardShortcutsProps {
  onAddDoor: () => void;
  onQuickAddDoor: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onAddDoor,
  onQuickAddDoor,
}) => {
  const { toast } = useToast();
  const { settings } = useUserSettings();

  // Only enable keyboard shortcuts if the setting allows it
  const enableActionButton = settings.enableActionButton !== false;

  useEffect(() => {
    if (!enableActionButton) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in form fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Handle keyboard shortcuts
      if (e.altKey && e.key === "a") {
        e.preventDefault();
        onAddDoor();
        toast({
          title: "Keyboard Shortcut Used",
          description: "Door added with Alt+A",
        });
      } else if (e.altKey && e.key === "q") {
        e.preventDefault();
        onQuickAddDoor();
        toast({
          title: "Keyboard Shortcut Used",
          description: "Door quick-added with Alt+Q",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onAddDoor, onQuickAddDoor, toast, enableActionButton]);

  if (!enableActionButton) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center ml-2 text-gray-500">
            <Keyboard className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Keyboard Shortcuts</p>
          <div className="text-sm mt-1">
            <p>
              <kbd className="px-2 py-1 bg-gray-100 rounded">Alt+A</kbd> Add
              door
            </p>
            <p>
              <kbd className="px-2 py-1 bg-gray-100 rounded">Alt+Q</kbd> Quick
              add door
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default KeyboardShortcuts;
