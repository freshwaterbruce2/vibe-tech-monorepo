import { useState, type KeyboardEvent } from 'react'
import {
  Search,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  ExternalLink,
  Building2,
  CheckCircle
} from 'lucide-react'
import axios from 'axios'
import { httpClient } from '../services/httpClient'

interface PolicySearchResult {
  id: string
  title: string
  snippet: string
  url: string
  source: string
  relevanceScore?: number
}

interface PolicySearchProps {
  onDocumentAdded?: (doc: { title: string; url: string }) => void
}

type CompanyFilter = 'all' | 'walmart' | 'sedgwick' | 'lincoln_financial'

export function PolicySearch({ onDocumentAdded }: PolicySearchProps) {
  const [query, setQuery] = useState('')
  const [company, setCompany] = useState<CompanyFilter>('all')
  const [results, setResults] = useState<PolicySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())

  const api = httpClient

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await api.post('/api/policy/search', {
        query: query.trim(),
        company: company === 'all' ? undefined : company,
        limit: 20
      })

      const searchResults: PolicySearchResult[] = response.data.results || []
      setResults(searchResults)

      if (searchResults.length === 0) {
        setError('No policies found matching your search. Try different keywords.')
      }
    } catch (err) {
      console.error('Policy search failed:', err)
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('Policy search endpoint not available. Please ensure the backend is running.')
      } else {
        setError('Failed to search policies. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleDownload = async (result: PolicySearchResult) => {
    if (downloadingIds.has(result.id) || downloadedIds.has(result.id)) return

    setDownloadingIds(prev => new Set(prev).add(result.id))

    try {
      // Call the policy download endpoint which indexes the document into the knowledge base
      await api.post('/api/policy/download', {
        url: result.url,
        domain: result.source, // Map source to domain for the backend
        title: result.title
      })

      setDownloadedIds(prev => new Set(prev).add(result.id))
      onDocumentAdded?.({ title: result.title, url: result.url })
    } catch (err) {
      console.error('Failed to add document to knowledge base:', err)
      setError(`Failed to add "${result.title}" to knowledge base.`)
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(result.id)
        return newSet
      })
    }
  }

  const getCompanyLabel = (value: CompanyFilter): string => {
    switch (value) {
      case 'walmart': return 'Walmart'
      case 'sedgwick': return 'Sedgwick'
      case 'lincoln_financial': return 'Lincoln Financial'
      default: return 'All Companies'
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-neon-mint" />
          <h2 className="text-lg font-bold">Policy Search</h2>
        </div>

        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Company Selector */}
          <div className="sm:w-48">
            <label className="block text-xs text-gray-400 mb-1">Company</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value as CompanyFilter)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-mint/50"
            >
              <option value="all">All Companies</option>
              <option value="walmart">Walmart</option>
              <option value="sedgwick">Sedgwick</option>
              <option value="lincoln_financial">Lincoln Financial</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Search Query</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for company policies, procedures, handbooks..."
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-mint/50"
                disabled={loading}
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-neon-mint text-slate-900 rounded-lg hover:bg-neon-mint/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-neon-mint" />
            <p className="text-gray-400">Searching policies...</p>
            <p className="text-sm text-gray-500">
              Searching {company === 'all' ? 'all companies' : getCompanyLabel(company)}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !error && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Search Company Policies</p>
            <p className="text-sm mt-2 max-w-md mx-auto">
              Search for Walmart, Sedgwick, or Lincoln Financial policies,
              handbooks, and procedures to add to your knowledge base.
            </p>
          </div>
        )}

        {/* Results List */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 mb-4">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>

            {results.map((result) => (
              <div
                key={result.id}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-semibold text-white truncate mb-1">
                      {result.title}
                    </h3>

                    {/* Source Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30">
                        <Building2 className="w-3 h-3" />
                        {result.source}
                      </span>
                      {result.relevanceScore && (
                        <span className="text-xs text-gray-500">
                          {Math.round(result.relevanceScore * 100)}% relevant
                        </span>
                      )}
                    </div>

                    {/* Snippet */}
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {result.snippet}
                    </p>

                    {/* URL */}
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-neon-mint hover:underline mt-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Source
                      </a>
                    )}
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(result)}
                    disabled={downloadingIds.has(result.id) || downloadedIds.has(result.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                      downloadedIds.has(result.id)
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default'
                        : downloadingIds.has(result.id)
                        ? 'bg-slate-700 text-gray-400 cursor-not-allowed'
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                    }`}
                    title={
                      downloadedIds.has(result.id)
                        ? 'Added to knowledge base'
                        : 'Add to knowledge base'
                    }
                  >
                    {downloadedIds.has(result.id) ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Added
                      </>
                    ) : downloadingIds.has(result.id) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Add to KB
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
