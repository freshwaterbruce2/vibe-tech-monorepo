import React from 'react';

interface FeatureFlagProviderProps {
    config: unknown;
    children: React.ReactNode;
}

export const FeatureFlagProvider = ({ children }: FeatureFlagProviderProps) => {
    return <>{children}</>;
};

export const useFeatureFlag = (flag: string) => {
    return true; // Default to true for now
};
