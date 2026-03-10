import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FreightType } from "@/types/shipping";

interface FreightTypeRadioProps {
  value: FreightType;
  onChange: (value: FreightType) => void;
}

const FreightTypeRadio = ({ value, onChange }: FreightTypeRadioProps) => {
  return (
    <RadioGroup
      value={value}
      onValueChange={(val) => onChange(val as FreightType)}
      className="flex space-x-4"
    >
      {["23/43", "28", "XD", "AIB"].map((type) => (
        <div key={type} className="flex items-center space-x-2">
          <RadioGroupItem value={type} id={`freight-${type}`} />
          <Label htmlFor={`freight-${type}`} className="font-medium">
            {type}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
};

export default FreightTypeRadio;
