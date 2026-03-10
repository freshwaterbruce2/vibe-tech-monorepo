import React from 'react';
import { DeviceToolbar } from './DeviceToolbar';

export const Preview: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-lg overflow-hidden border border-white/5 shadow-2xl">
      <DeviceToolbar />
      <div className="flex-1 bg-white relative">
        <iframe 
          src="http://localhost:5173" // Assuming dev server port, acts as a placeholder
          title="App Preview"
          className="w-full h-full border-0"
        />
        {/* Overlay for demo if needed, currently just direct iframe */}
      </div>
    </div>
  );
};
