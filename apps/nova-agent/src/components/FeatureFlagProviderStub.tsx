import React from 'react';

interface FeatureFlagProviderProps {
    config: unknown;
    children: React.ReactNode;
}

export const FeatureFlagProvider = ({ children }: FeatureFlagProviderProps) => {
    return <>{children}</>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFeatureFlag = (_flag: string) => {
    return true; // Default to true for now
};
