import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DestinationDC } from "@/types/shipping";

interface DCSegmentedControlProps {
  value: DestinationDC;
  onValueChange: (value: DestinationDC) => void;
}

const DCSegmentedControl = ({
  value,
  onValueChange,
}: DCSegmentedControlProps) => {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => val && onValueChange(val as DestinationDC)}
      className="flex justify-start w-full border rounded-lg p-1 bg-gray-50"
    >
      {["6024", "6070", "6039", "6040", "7045"].map((dc) => (
        <ToggleGroupItem
          key={dc}
          value={dc}
          aria-label={`DC ${dc}`}
          className="flex-1 data-[state=on]:bg-walmart-blue data-[state=on]:text-white rounded font-semibold"
        >
          {dc}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

export default DCSegmentedControl;
