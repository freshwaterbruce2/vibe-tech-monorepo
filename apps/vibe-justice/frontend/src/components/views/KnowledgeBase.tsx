import { useState, useMemo, useCallback, type ElementType } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  Search,
  Trash2,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  Database,
  Calendar,
  ChevronRight,
  Scale,
  Building2,
  Briefcase,
  Users,
  Shield,
  Gavel,
  FileStack,
  ExternalLink,
  Plus
} from 'lucide-react'
import axios from 'axios'
import { httpClient } from '../../services/httpClient'
import { PolicySearch } from '../PolicySearch'

// Domain configuration with icons and colors
const DOMAIN_CONFIG: Record<string, { label: string; icon: ElementType; color: string; bgColor: string }> = {
  sc_employment: { label: 'SC Employment Law', icon: Briefcase, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  sc_unemployment: { label: 'SC Unemployment', icon: Users, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  sc_family_law: { label: 'SC Family Law', icon: Users, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  walmart_dc: { label: 'Walmart DC', icon: Building2, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  sedgwick: { label: 'Sedgwick Claims', icon: Shield, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  lincoln_financial: { label: 'Lincoln Financial', icon: Scale, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  federal_employment: { label: 'Federal Employment', icon: Gavel, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  general: { label: 'General Legal', icon: BookOpen, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  internal_protocols: { label: 'Internal Protocols', icon: FileStack, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' }
}

interface KnowledgeDocument {
  id: string
  title: string
  domain: string
  source?: string
  url?: string
  snippet?: string
  addedAt: string
  fileSize?: number
}

interface DomainStatus {
  domain: string
  count: number
  lastUpdated?: string
}

interface KnowledgeStatus {
  totalDocuments: number
  domains: DomainStatus[]
  recentAdditions: KnowledgeDocument[]
}

export function KnowledgeBase() {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [showPolicySearch, setShowPolicySearch] = useState(false)

  const queryClient = useQueryClient()

  // Fetch knowledge base status
  const {
    data: status,
    isLoading: loading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery<KnowledgeStatus, unknown>({
    queryKey: ['knowledge', 'status'],
    queryFn: async () => {
      const response = await httpClient.get('/api/knowledge/status')
      return response.data
    },
  })

  // Fetch documents for a domain
  const { data: documentsData, isLoading: loadingDocuments } = useQuery<
    { documents: KnowledgeDocument[] },
    unknown
  >({
    queryKey: ['knowledge', 'documents', selectedDomain],
    queryFn: async () => {
      const response = await httpClient.get(`/api/knowledge/documents/${selectedDomain}`)
      return { documents: response.data.documents || [] }
    },
    enabled: !!selectedDomain,
  })

  const documents: KnowledgeDocument[] = useMemo(
    () => documentsData?.documents ?? [],
    [documentsData],
  )

  // Delete a document (mutation)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/api/knowledge/documents/${id}`)
      return id
    },
    onSuccess: () => {
      // Refresh status counts and current domain documents
      queryClient.invalidateQueries({ queryKey: ['knowledge', 'status'] })
      if (selectedDomain) {
        queryClient.invalidateQueries({
          queryKey: ['knowledge', 'documents', selectedDomain],
        })
      }
    },
    onError: (err) => {
      console.error('Failed to delete document:', err)
      setLocalError('Failed to delete document. Please try again.')
    },
  })

  const deleteDocument = (id: string) => {
    if (deleteMutation.isPending && deleteMutation.variables === id) return
    deleteMutation.mutate(id)
  }

  // Deletion-in-progress lookup (parity with previous deletingIds Set)
  const deletingIds = useMemo(
    () =>
      deleteMutation.isPending && typeof deleteMutation.variables === 'string'
        ? new Set<string>([deleteMutation.variables])
        : new Set<string>(),
    [deleteMutation.isPending, deleteMutation.variables],
  )

  // Handle document added from PolicySearch
  const handleDocumentAdded = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['knowledge', 'status'] })
    if (selectedDomain) {
      queryClient.invalidateQueries({
        queryKey: ['knowledge', 'documents', selectedDomain],
      })
    }
  }, [queryClient, selectedDomain])

  // Explicit refresh button behavior
  const refreshStatus = () => {
    setLocalError(null)
    refetchStatus()
  }

  // Unified error banner message: prefer explicit local errors, then query errors.
  // Backend unavailability is surfaced as an explicit banner (no mock data fabricated).
  const errorMessage: string | null = useMemo(() => {
    if (localError) return localError
    if (statusError) {
      if (axios.isAxiosError(statusError) && statusError.response?.status === 404) {
        return 'Knowledge base API not available. Backend unavailable — counts below are unknown, not zero.'
      }
      return 'Failed to load knowledge base status. Backend unavailable.'
    }
    return null
  }, [localError, statusError])

  const backendUnavailable = !loading && !status

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents
    const query = searchQuery.toLowerCase()
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(query) ||
      doc.snippet?.toLowerCase().includes(query) ||
      doc.source?.toLowerCase().includes(query)
    )
  }, [documents, searchQuery])

  // Get domain stats map for quick lookup
  const domainStatsMap = useMemo(() => {
    const map = new Map<string, number>()
    status?.domains.forEach(d => map.set(d.domain, d.count))
    return map
  }, [status])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Policy Search Modal
  if (showPolicySearch) {
    return (
      <div className="h-full flex flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setShowPolicySearch(false)}
            className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Knowledge Base
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <PolicySearch onDocumentAdded={handleDocumentAdded} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-neon-mint" />
            <div>
              <h1 className="text-xl font-bold">Knowledge Base</h1>
              <p className="text-sm text-gray-400">
                Legal documents, precedents, and company policies
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPolicySearch(true)}
              className="px-4 py-2 bg-neon-mint text-slate-900 rounded-lg hover:bg-neon-mint/80 font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Documents
            </button>
            <button
              onClick={refreshStatus}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        {status ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Database className="w-4 h-4" />
                Total Documents
              </div>
              <p className="text-2xl font-bold text-neon-mint">{status.totalDocuments}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <FileStack className="w-4 h-4" />
                Active Domains
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {status.domains.filter(d => d.count > 0).length} / {status.domains.length}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                Recent Additions
              </div>
              <p className="text-2xl font-bold text-purple-400">{status.recentAdditions.length}</p>
            </div>
          </div>
        ) : backendUnavailable ? (
          // Backend unavailable: render unambiguous placeholders so the user
          // cannot mistake "unknown" for "zero". No mock/fabricated data.
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 opacity-60">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Database className="w-4 h-4" />
                Total Documents
              </div>
              <p className="text-2xl font-bold text-gray-500" title="Backend unavailable">—</p>
              <p className="text-xs text-gray-500">unavailable</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 opacity-60">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <FileStack className="w-4 h-4" />
                Active Domains
              </div>
              <p className="text-2xl font-bold text-gray-500" title="Backend unavailable">—</p>
              <p className="text-xs text-gray-500">unavailable</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 opacity-60">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                Recent Additions
              </div>
              <p className="text-2xl font-bold text-gray-500" title="Backend unavailable">—</p>
              <p className="text-xs text-gray-500">unavailable</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mx-4 mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{errorMessage}</p>
          <button
            onClick={() => setLocalError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Domain Selector Sidebar */}
        <div className="w-72 border-r border-slate-800 overflow-y-auto">
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Legal Domains
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-neon-mint" />
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(DOMAIN_CONFIG).map(([domain, config]) => {
                  const count = domainStatsMap.get(domain) ?? 0
                  const Icon = config.icon
                  const isSelected = selectedDomain === domain
                  const countLabel = backendUnavailable
                    ? 'count unavailable'
                    : `${count} document${count !== 1 ? 's' : ''}`

                  return (
                    <button
                      key={domain}
                      onClick={() => setSelectedDomain(domain)}
                      className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                        isSelected
                          ? 'bg-neon-mint/20 border border-neon-mint/30'
                          : 'hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isSelected ? 'text-neon-mint' : 'text-white'}`}>
                          {config.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {countLabel}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-500 ${isSelected ? 'text-neon-mint' : ''}`} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Document List / Detail */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedDomain ? (
            <>
              {/* Domain Header with Search */}
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = DOMAIN_CONFIG[selectedDomain]
                      const Icon = config?.icon || BookOpen
                      return (
                        <>
                          <Icon className={`w-5 h-5 ${config?.color || 'text-gray-400'}`} />
                          <h2 className="text-lg font-semibold">
                            {config?.label || selectedDomain}
                          </h2>
                        </>
                      )
                    })()}
                    <span className="text-sm text-gray-500 ml-2">
                      ({documents.length} document{documents.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                {/* Search within domain */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${DOMAIN_CONFIG[selectedDomain]?.label || selectedDomain}...`}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-mint/50"
                  />
                </div>
              </div>

              {/* Documents List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingDocuments ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-neon-mint" />
                    <p className="text-gray-400">Loading documents...</p>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    {searchQuery ? (
                      <>
                        <p className="text-lg">No documents match your search</p>
                        <p className="text-sm mt-2">Try different keywords or clear the search</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">No documents in this domain</p>
                        <p className="text-sm mt-2">Use "Add Documents" to search and add policies</p>
                        <button
                          onClick={() => setShowPolicySearch(true)}
                          className="mt-4 px-4 py-2 bg-neon-mint text-slate-900 rounded-lg hover:bg-neon-mint/80 font-medium"
                        >
                          Add Documents
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white mb-1 line-clamp-1">
                              {doc.title}
                            </h3>

                            {/* Source Badge */}
                            {doc.source && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30">
                                  <Building2 className="w-3 h-3" />
                                  {doc.source}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Added {formatDate(doc.addedAt)}
                                </span>
                              </div>
                            )}

                            {/* Snippet */}
                            {doc.snippet && (
                              <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                                {doc.snippet}
                              </p>
                            )}

                            {/* URL Link */}
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-neon-mint hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Source
                              </a>
                            )}
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            disabled={deletingIds.has(doc.id)}
                            className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove from knowledge base"
                          >
                            {deletingIds.has(doc.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No Domain Selected - Show Recent Additions */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Select a Domain
                  </h2>
                  <p className="text-gray-400">
                    Choose a legal domain from the sidebar to browse documents,
                    or add new documents from external sources.
                  </p>
                </div>

                {/* Recent Additions */}
                {status && status.recentAdditions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                      Recently Added
                    </h3>
                    <div className="space-y-3">
                      {status.recentAdditions.slice(0, 5).map((doc) => {
                        const domainConfig = DOMAIN_CONFIG[doc.domain]
                        const Icon = domainConfig?.icon || FileText

                        return (
                          <button
                            key={doc.id}
                            onClick={() => setSelectedDomain(doc.domain)}
                            className="w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors text-left flex items-center gap-3"
                          >
                            <div className={`p-2 rounded-lg ${domainConfig?.bgColor || 'bg-gray-500/20'}`}>
                              <Icon className={`w-4 h-4 ${domainConfig?.color || 'text-gray-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{doc.title}</p>
                              <p className="text-xs text-gray-500">
                                {domainConfig?.label || doc.domain} - {formatDate(doc.addedAt)}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowPolicySearch(true)}
                      className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-left"
                    >
                      <Search className="w-5 h-5 text-neon-mint mb-2" />
                      <p className="font-medium text-white text-sm">Search Policies</p>
                      <p className="text-xs text-gray-500">Find company policies online</p>
                    </button>
                    <button
                      onClick={() => setSelectedDomain('general')}
                      className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-left"
                    >
                      <BookOpen className="w-5 h-5 text-purple-400 mb-2" />
                      <p className="font-medium text-white text-sm">Browse General</p>
                      <p className="text-xs text-gray-500">View general legal docs</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
