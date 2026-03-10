import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-slate-700 border-t-[var(--primary-accent)] rounded-full animate-spin"></div>
    </div>
  );
};

export default LoadingSpinner;
