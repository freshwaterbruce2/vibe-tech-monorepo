import { useState, type MouseEvent } from 'react';
import { Button } from "@vibetech/ui";
import { X, Plus, Minus } from 'lucide-react'; // Added Plus/Minus for iconography

interface QuickPalletInputProps {
  currentCount: number;
  onUpdate: (newCount: number) => void;
  onClose: () => void;
}

const QuickPalletInput = ({
  currentCount,
  onUpdate,
  onClose,
}: QuickPalletInputProps) => {
  const [inputValue, setInputValue] = useState<string>('');

  const handleNumberClick = (num: number) => {
    // Limit input length if necessary
    setInputValue((prev) => (prev + num.toString()).slice(0, 4)); // Example limit
  };

  const handleConfirm = () => {
    const newCount = parseInt(inputValue, 10);
    if (!isNaN(newCount) && newCount >= 0) {
      onUpdate(newCount);
      onClose();
    } else if (inputValue === '') {
      // If input is empty, just close without changing the value
      onClose();
    } else {
      // Handle invalid input (optional: show error state)
      console.warn("Invalid pallet count input");
      setInputValue(''); // Clear invalid input
    }
  };

  const handleIncrement = () => {
      onUpdate(currentCount + 1);
      setInputValue('');
  }

  const handleDecrement = () => {
      onUpdate(Math.max(0, currentCount - 1));
      setInputValue('');
  }

  const handleDelete = () => {
    setInputValue((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputValue('');
  };

  // Prevents click event from propagating
  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="absolute z-20 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 bg-white border border-gray-300 rounded-lg shadow-xl p-2 grid grid-cols-3 gap-1"
      onClick={stopPropagation}
      role="dialog" // Semantics for the panel
      aria-modal="true" // It behaves like a modal
      aria-label="Quick pallet input"
    >
      {/* Display Current/Input Value */}
      <div className="col-span-3 text-right p-1 border-b mb-1 text-lg font-semibold h-8 truncate">
          {inputValue || currentCount.toString()}
      </div>

      {/* Number Buttons */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <Button
          key={num}
          variant="outline"
          size="sm"
          className="h-8 text-sm focus:ring-2 focus:ring-blue-400" // Added focus state
          onClick={() => handleNumberClick(num)}
        >
          {num}
        </Button>
      ))}
      {/* Zero and Clear Button */}
      <Button variant="outline" size="sm" className="h-8 text-xs focus:ring-2 focus:ring-blue-400" onClick={handleClear}>CLR</Button>
      <Button variant="outline" size="sm" className="h-8 text-sm focus:ring-2 focus:ring-blue-400" onClick={() => handleNumberClick(0)}>0</Button>
      <Button variant="outline" size="sm" className="h-8 text-xs focus:ring-2 focus:ring-blue-400" onClick={handleDelete}>DEL</Button>


      {/* Row for +/- and Confirm */}
      <div className="col-span-3 grid grid-cols-3 gap-1 mt-1">
         <Button variant="secondary" size="icon" className="h-8 w-full focus:ring-2 focus:ring-blue-400" onClick={handleDecrement} aria-label="Decrement pallet count"><Minus className="h-4 w-4" /></Button>
         <Button variant="secondary" size="icon" className="h-8 w-full focus:ring-2 focus:ring-blue-400" onClick={handleIncrement} aria-label="Increment pallet count"><Plus className="h-4 w-4" /></Button>
         <Button variant="default" size="sm" className="h-8 text-xs focus:ring-2 focus:ring-offset-1 focus:ring-green-500" onClick={handleConfirm}>OK</Button>
      </div>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0 h-6 w-6 text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded-full"
        onClick={onClose}
        aria-label="Close quick input"
      >
          <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default QuickPalletInput; 