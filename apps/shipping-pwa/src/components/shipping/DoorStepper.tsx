import { Button } from "@vibetech/ui";
import { Plus, Minus } from "lucide-react";

interface DoorStepperProps {
  value: number;
  onChange: (value: number) => void;
}

const DoorStepper = ({ value, onChange }: DoorStepperProps) => {
  const increment = () => {
    if (value < 454) onChange(value + 1);
  };

  const decrement = () => {
    if (value > 332) onChange(value - 1);
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={decrement}
        disabled={value <= 332}
        className="h-11 w-11 border-gray-200"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div className="min-w-[80px] text-center">
        <span className="text-[22px] font-bold bg-walmart-blue text-white px-4 py-2 rounded-full">
          {value}
        </span>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={increment}
        disabled={value >= 454}
        className="h-11 w-11 border-gray-200"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DoorStepper;
