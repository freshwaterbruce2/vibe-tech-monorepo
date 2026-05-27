import { useState } from "react";
import { Button } from "@vibetech/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { X, Delete, Check, Gauge } from "lucide-react";
// cspell:ignore sonner
import { toast } from "sonner";

interface SpeedKeypadProps {
  onSelectDoor: (doorNumber: number) => void;
  currentDoors: number[];
}

const SpeedKeypad = ({ onSelectDoor, currentDoors = [] }: SpeedKeypadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [doorInput, setDoorInput] = useState("");

  const MIN_DOOR = 332;
  const MAX_DOOR = 454;

  const addDigit = (digit: string) => {
    if (doorInput.length < 3) {
      setDoorInput((prev) => prev + digit);
    }
  };

  const removeDigit = () => {
    setDoorInput((prev) => prev.slice(0, -1));
  };

  const clearInput = () => {
    setDoorInput("");
  };

  const handleSubmit = () => {
    const doorNumber = parseInt(doorInput, 10);

    if (isNaN(doorNumber)) {
      toast.error("Please enter a valid door number");
      return;
    }

    if (doorNumber < MIN_DOOR || doorNumber > MAX_DOOR) {
      toast.error(`Door number must be between ${MIN_DOOR} and ${MAX_DOOR}`);
      return;
    }

    if (currentDoors.includes(doorNumber)) {
      toast.error(`Door ${doorNumber} is already in use`);
      return;
    }

    onSelectDoor(doorNumber);
    setIsOpen(false);
    clearInput();
  };

  const renderNumberPad = () => {
    const digits = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["C", "0", "⌫"],
    ];

    return (
      <div className="grid grid-cols-3 gap-2 mt-4">
        {digits.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`}>
            {row.map((digit) => {
              if (digit === "C") {
                return (
                  <Button
                    key={`digit-${digit}`}
                    variant="outline"
                    onClick={clearInput}
                    className="h-14 text-lg"
                  >
                    <X size={18} />
                  </Button>
                );
              }
              if (digit === "⌫") {
                return (
                  <Button
                    key={`digit-${digit}`}
                    variant="outline"
                    onClick={removeDigit}
                    className="h-14 text-lg"
                  >
                    <Delete size={18} />
                  </Button>
                );
              }
              return (
                <Button
                  key={`digit-${digit}`}
                  variant="outline"
                  onClick={() => addDigit(digit)}
                  className="h-14 text-lg"
                >
                  {digit}
                </Button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Fast Add Door"
          className="gap-1 border-2 border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-300 transform hover:scale-105 focus:scale-95 min-h-[44px] font-medium"
        >
          <Gauge className="h-4 w-4" data-testid="mock-speed-icon" />
          <span>Speed Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="fast-add-door-form">
        <DialogHeader>
          <DialogTitle>Fast Add Door</DialogTitle>
          <DialogDescription>
            Quickly add a door with default values. Adjust details later if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          <div className="text-center py-4 px-3 bg-gray-50 rounded-md border text-3xl font-mono min-h-[70px] flex items-center justify-center mb-4">
            {doorInput || "Enter Door #"}
          </div>

          {renderNumberPad()}

          <Button
            onClick={handleSubmit}
            className="mt-4 h-14"
            disabled={!doorInput || doorInput.length < 3}
          >
            <Check className="mr-2 h-5 w-5" />
            Add Door
          </Button>

          <div className="mt-3 text-xs text-gray-500 text-center">
            Valid door numbers: {MIN_DOOR} - {MAX_DOOR}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpeedKeypad;
