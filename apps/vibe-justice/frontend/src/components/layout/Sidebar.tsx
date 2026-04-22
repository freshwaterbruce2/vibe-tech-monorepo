import {
  Archive,
  ArchiveX,
  BookOpen,
  FolderOpen,
  Menu,
  PlusCircle,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { cn } from '../../lib/utils'
import { justiceApi, type Case } from '../../services/api'
import { SettingsModal } from '../settings/SettingsModal'

interface SidebarProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const [isSecure, setIsSecure] = useState(true)
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(false)

  // Listen for global shortcut
  useEffect(() => {
    const handleToggle = () => setIsSettingsOpen((prev) => !prev)
    window.addEventListener('vibe-toggle-settings', handleToggle)
    return () => window.removeEventListener('vibe-toggle-settings', handleToggle)
  }, [])

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const data = await justiceApi.listCases(showArchived)
      setCases(data)
    } catch (e) {
      console.error('Failed to fetch cases', e)
      // Keep existing cases on error, don't clear them
    } finally {
      setLoading(false)
    }
  }, [showArchived])

  // Fetch cases on mount and when showArchived changes
  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const toggleCaseArchive = async (caseId: string, currentStatus: boolean, e: MouseEvent) => {
    e.stopPropagation()

    // Optimistic Update
    setCases((prev) =>
      prev.map((c) => (c.case_id === caseId ? { ...c, is_archived: !currentStatus } : c))
    )

    try {
      if (currentStatus) {
        await justiceApi.restoreCase(caseId)
      } else {
        await justiceApi.archiveCase(caseId)
      }
    } catch (e) {
      console.error('Failed to update status', e)
      // Revert on error
      setCases((prev) =>
        prev.map((c) => (c.case_id === caseId ? { ...c, is_archived: currentStatus } : c))
      )
    }
  }

  const filteredCases = cases.filter((c) => (showArchived ? true : !c.is_archived))

  const navItems = [
    {
      icon: PlusCircle,
      label: 'New Investigation',
      id: 'investigation',
      onClick: () => setActiveTab?.('investigation'),
    },
    {
      icon: Archive,
      label: 'Cold Case Files',
      id: 'cold-cases',
      onClick: () => setActiveTab?.('cold-cases'),
    },
    {
      icon: BookOpen,
      label: 'Knowledge Base',
      id: 'knowledge-base',
      onClick: () => setActiveTab?.('knowledge-base'),
    },
    { icon: Settings, label: 'Settings', id: 'settings', onClick: () => setIsSettingsOpen(true) },
  ]

  return (
    <div
      className={cn(
        'h-screen bg-vibe-void border-r border-white/5 flex flex-col items-center py-4 transition-all duration-300 z-50',
        isExpanded ? 'w-64' : 'w-16'
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="mb-8 p-2">
        <Menu className="w-6 h-6 text-neon-mint" />
      </div>

      <nav className="flex-1 w-full space-y-2 px-2">
        {navItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={cn(
              'flex items-center p-2 rounded-lg transition-colors group w-full',
              activeTab === item.id && item.id !== 'settings'
                ? 'bg-neon-mint/10 text-neon-mint'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <item.icon className="w-6 h-6 shrink-0" />
            <span
              className={cn(
                'ml-3 whitespace-nowrap overflow-hidden transition-opacity duration-200',
                isExpanded ? 'opacity-100' : 'opacity-0 w-0'
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Case Section */}
      <div
        className={cn(
          'flex-1 w-full px-2 overflow-y-auto min-h-[120px] mb-2 transition-opacity duration-200',
          isExpanded ? 'opacity-100' : 'opacity-0 invisible'
        )}
      >
        <div className="flex items-center justify-between px-2 mb-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
          <span>{showArchived ? 'All Files' : 'Active Cases'}</span>
          <button onClick={fetchCases} className="hover:text-neon-mint transition-colors">
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="space-y-1">
          {filteredCases.map((c) => (
            <div
              key={c.case_id}
              className={cn(
                'flex items-center justify-between p-2 rounded group cursor-pointer transition-colors border border-transparent',
                c.is_archived
                  ? 'opacity-60 bg-white/5 border-dashed border-white/10'
                  : 'hover:bg-white/5 hover:border-white/10'
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FolderOpen
                  className={cn(
                    'w-4 h-4 shrink-0',
                    c.is_archived ? 'text-gray-500' : 'text-neon-blue'
                  )}
                />
                <span className="text-xs text-gray-300 truncate font-mono">{c.case_id}</span>
              </div>

              <button
                onClick={async (e) => toggleCaseArchive(c.case_id, c.is_archived, e)}
                className={cn(
                  'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10',
                  c.is_archived ? 'text-neon-mint' : 'text-gray-400 hover:text-alert-pink'
                )}
                title={c.is_archived ? 'Restore Case' : 'Archive Case'}
              >
                {c.is_archived ? <ArchiveX className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
              </button>
            </div>
          ))}

          {filteredCases.length === 0 && !loading && (
            <div className="px-2 py-4 text-center">
              <span className="text-[10px] text-gray-600 italic">No cases found</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Vibe Check (Security Indicator) */}
      <div className="mt-auto mb-4 w-full px-4">
        <button
          onClick={() => setIsSecure(!isSecure)}
          className={cn(
            'flex items-center justify-center p-2 rounded bg-white/5 border border-white/5 w-full hover:bg-white/10 transition-colors',
            isExpanded ? 'justify-start' : 'justify-center'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full mr-2 shrink-0 transition-all duration-500',
              isSecure
                ? 'bg-neon-mint shadow-[0_0_10px_rgba(0,255,159,0.8)]'
                : 'bg-neon-blue shadow-[0_0_10px_rgba(0,184,255,0.8)]'
            )}
          />
          {isExpanded && (
            <div className="flex flex-col items-start overflow-hidden">
              <span
                className={cn(
                  'text-xs font-bold font-mono transition-colors',
                  isSecure ? 'text-neon-mint' : 'text-neon-blue'
                )}
              >
                {isSecure ? 'SYSTEM: SECURE' : 'SYSTEM: ONLINE'}
              </span>
              <span className="text-[10px] text-gray-500 font-mono truncate w-full">
                {isSecure ? 'Local // Air-Gapped' : 'Cloud // Connected'}
              </span>
            </div>
          )}
        </button>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        showArchived={showArchived}
        onToggleArchived={setShowArchived}
      />
    </div>
  )
}
