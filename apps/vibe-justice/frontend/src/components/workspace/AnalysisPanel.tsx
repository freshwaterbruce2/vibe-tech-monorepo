import { useState } from 'react';
import { justiceApi } from '../../services/api';

export function AnalysisPanel({ caseId = "default-case" }: { caseId?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAnalyzeClick = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      // In a real app, you would pass selected document IDs here
      const response = await justiceApi.runAnalysis(caseId, []);
      
      setResult(JSON.stringify(response, null, 2));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Analysis failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Legal AI Analysis</h3>
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Run DeepSeek R1 model on case evidence.</p>
        <button 
          onClick={handleAnalyzeClick}
          disabled={isLoading}
          className={`w-full px-4 py-2 font-semibold text-white rounded transition-colors ${
            isLoading ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isLoading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>
      {result && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Analysis Results:</h4>
          <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-60">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}