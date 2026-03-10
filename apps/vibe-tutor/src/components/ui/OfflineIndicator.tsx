import React from 'react';

const OfflineIndicator = () => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-center p-2 text-sm font-semibold animate-fade-in-up">
      You are currently offline. Some features may be unavailable.
      <style>{`
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default OfflineIndicator;
