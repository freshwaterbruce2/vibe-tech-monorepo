import { useState, useCallback } from 'react';
import { LogicPattern, type BrainScanResult } from '@/types/logic';

export const useBrainScan = () => {
  const [results, setResults] = useState<(LogicPattern & { relevance: number })[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performScan = useCallback(async (codeSnippet: string) => {
    setIsScanning(true);
    setError(null);

    try {
      // ✅ Correct: Uses the exposed Electron Bridge
      const result: BrainScanResult = await window.vibeTech.searchLogic(codeSnippet);
      
      // Handle potential response format differences gracefully
      let patterns: LogicPattern[] = [];
      let scores: { score: number }[] = [];

      if (result && 'matches' in result && result.matches !== undefined) {
         // Fallback if backend returns legacy structure
         console.warn("Backend returned legacy 'matches' format. Please update backend.");
         // Map legacy matches if possible, or throw
         // For now, let's assume result structure is correct or cast it
         throw new Error("Backend response format mismatch.");
      } else {
        patterns = result.patterns ?? [];
        scores = result.scores ?? [];
      }

      // Merge relational metadata with vector scores
      const enrichedResults = patterns.map((p: LogicPattern, i: number) => ({
        ...p,
        relevance: scores[i]?.score || 0,
      }));

      setResults(enrichedResults);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'BrainScan failed to connect to D: drive';
      setError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { performScan, results, isScanning, error };
};