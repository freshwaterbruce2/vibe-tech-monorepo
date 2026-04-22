import { useEffect, useState } from 'react';
import { justiceApi, type Case } from '../../services/api';

export function ColdCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedCases();
  }, []);

  const fetchArchivedCases = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all cases including archived, then filter to only archived
      const allCases = await justiceApi.listCases(true);
      const archivedCases = allCases.filter(c => c.is_archived);
      setCases(archivedCases);
    } catch (e) {
      console.error('Failed to fetch cold cases', e);
      setError('Failed to load cold cases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreCase = async (caseId: string) => {
    try {
      await justiceApi.restoreCase(caseId);
      // Remove from local state after successful restore
      setCases(prev => prev.filter(c => c.case_id !== caseId));
    } catch (e) {
      console.error('Failed to restore case', e);
      setError('Failed to restore case. Please try again.');
    }
  };

  const formatDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoDate;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  return (
    <div className="p-6 h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Cold Case Files</h1>
            <p className="text-gray-600 dark:text-gray-400">Archive of inactive investigations requiring AI re-analysis.</p>
          </div>
          <button
            onClick={fetchArchivedCases}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading cold cases...</div>
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">No Cold Cases</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">All cases are currently active.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div key={c.case_id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusStyle(c.status)}`}>
                  {c.status}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {c.archived_at ? formatDate(c.archived_at) : formatDate(c.created_at)}
                </span>
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">
                {c.name || `Case ${c.case_id}`}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">ID: {c.case_id}</p>
              {c.jurisdiction && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Jurisdiction: {c.jurisdiction.replace(/_/g, ' ')}
                </p>
              )}
              {c.research_goals && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {c.research_goals}
                </p>
              )}
              <button
                onClick={() => handleRestoreCase(c.case_id)}
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1"
              >
                Re-open Case <span>→</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}