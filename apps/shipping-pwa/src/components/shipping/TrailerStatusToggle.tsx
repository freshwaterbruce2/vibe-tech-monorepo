import React from "react";
import { TrailerStatus } from "@/types/shipping";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TrailerStatusToggleProps {
  value: TrailerStatus;
  onChange: (value: TrailerStatus) => void;
}

const TrailerStatusToggle = ({ value, onChange }: TrailerStatusToggleProps) => {
  const statuses: {
    value: TrailerStatus;
    label: string;
    colorClass: string;
  }[] = [
    { value: "empty", label: "Empty", colorClass: "text-status-empty" },
    { value: "25%", label: "25%", colorClass: "text-status-25" },
    { value: "50%", label: "50%", colorClass: "text-status-50" },
    { value: "75%", label: "75%", colorClass: "text-status-75" },
    { value: "partial", label: "Partial", colorClass: "text-status-partial" },
    {
      value: "shipload",
      label: "Shipload",
      colorClass: "text-status-shipload",
    },
  ];

  return (
    <Select
      value={value}
      onValueChange={(newValue: string) => {
        onChange(newValue as TrailerStatus);
      }}
    >
      <SelectTrigger className="w-[180px] bg-white">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem
            key={status.value}
            value={status.value}
            className={status.colorClass}
          >
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TrailerStatusToggle;
