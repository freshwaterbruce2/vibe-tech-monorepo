import { type ReactNode, useMemo } from 'react';

interface FeatureFlagProviderProps {
    config: unknown;
    children: ReactNode;
}

/**
 * Parse VITE_FEATURE_FLAGS once at module load time.
 * Expected format: JSON object mapping flag name → boolean, e.g.
 *   VITE_FEATURE_FLAGS='{"nova.advanced_reasoning":true,"nova.debug_panel":false}'
 * If the env var is absent or malformed, all flags default to false (fail-closed).
 */
function parseEnvFlags(): Record<string, boolean> {
    const raw = import.meta.env.VITE_FEATURE_FLAGS;
    if (!raw) return {};
    try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed as Record<string, boolean>;
        }
        return {};
    } catch {
        return {};
    }
}

const envFlags = parseEnvFlags();

export const FeatureFlagProvider = ({ children }: FeatureFlagProviderProps) => {
    return <>{children}</>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFeatureFlag = (flagName: string): boolean => {
    return useMemo(() => envFlags[flagName] === true, [flagName]);
};
