import React from "react";

interface CommandListTooltipProps {
  isListening: boolean;
  commandList: string[];
}

export const CommandListTooltip = ({
  isListening,
  commandList,
}: CommandListTooltipProps) => {
  // Only show when not listening
  if (isListening) return null;

  return (
    <div className="absolute left-0 -bottom-14 bg-white px-3 py-2 rounded-md shadow-md text-xs border border-gray-200 transition-opacity opacity-0 group-hover:opacity-100 min-w-[150px] z-10 hidden md:block">
      <div className="font-medium text-gray-700">Valid commands:</div>
      <ul className="text-gray-600 mt-1">
        {commandList.map((command, index) => (
          <li key={index}>&quot;{command}&quot;</li>
        ))}
      </ul>
    </div>
  );
};
