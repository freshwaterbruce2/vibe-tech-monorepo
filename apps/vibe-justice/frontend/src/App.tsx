import {
  AlertCircle,
  Archive,
  BookOpen,
  Brain,
  Download,
  FileText,
  FolderOpen,
  Scale,
  Send,
} from 'lucide-react'
import { useState } from 'react'
import { DiagnosticsPanel } from './components/DiagnosticsPanel'
import { DocumentManager } from './components/DocumentManager'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { ColdCases } from './components/views/ColdCases'
import { KnowledgeBase } from './components/views/KnowledgeBase'
import { VibeDashboard } from './containers/VibeDashboard'
import { httpClient } from './services/httpClient'

interface Message {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
}

// Legal Assistant View - Chat, Analyze, Draft tabs
function LegalAssistantView() {
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [domain, setDomain] = useState('general')
  const [analysisText, setAnalysisText] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [templateType, setTemplateType] = useState('appeal')
  const [caseDetails, setCaseDetails] = useState('')
  const [draftPath, setDraftPath] = useState('')
  const [draftError, setDraftError] = useState('')

  const api = httpClient

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMessage = { role: 'user' as const, content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    try {
      const response = await api.post('/api/chat/simple', { message: userMessage.content, domain })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.content,
          reasoning: response.data.reasoning,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error: Unable to process your request. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const analyzeDocument = async () => {
    if (!analysisText.trim()) return
    setLoading(true)
    try {
      const response = await api.post('/api/analysis/run', { document_text: analysisText, domain })
      setAnalysisResult(response.data.analysis || response.data.result)
    } catch {
      setAnalysisResult('Error analyzing document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateDraft = async () => {
    if (!caseDetails.trim()) return
    setLoading(true)
    setDraftError('')
    try {
      const response = await api.post('/api/drafting/generate', {
        template_type: templateType,
        case_details: caseDetails,
        domain,
      })
      setDraftPath(response.data.file_path || response.data.filepath)
    } catch {
      setDraftError('Error generating draft. Please try again.')
      setDraftPath('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-vibe-void">
      {/* Header */}
      <header className="relative text-white px-6 py-5 border-b border-white/10 bg-gradient-to-r from-slate-900/80 via-blue-950/40 to-slate-900/80 backdrop-blur-sm">
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-neon-mint/30 to-transparent" />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-neon-mint/10 border border-neon-mint/20 shadow-[0_0_20px_rgba(0,255,159,0.15)]">
              <Scale className="w-5 h-5 text-neon-mint" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Legal Assistant</h1>
              <p className="text-xs text-gray-400 font-mono">AI-powered legal research</p>
            </div>
          </div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="bg-slate-900/80 text-white px-3 py-2 rounded-lg border border-white/10 text-sm hover:border-neon-mint/40 focus:border-neon-mint/60 focus:outline-none focus:ring-2 focus:ring-neon-mint/20 transition-colors cursor-pointer"
          >
            <optgroup label="South Carolina Law">
              <option value="sc_employment">SC Employment Law</option>
              <option value="sc_unemployment">SC Unemployment Claims</option>
              <option value="sc_family_law">SC Family Law</option>
            </optgroup>
            <optgroup label="Company Disputes">
              <option value="walmart_dc">Walmart DC Employment</option>
              <option value="sedgwick">Sedgwick Claims</option>
              <option value="lincoln_financial">Lincoln Financial LTD</option>
            </optgroup>
            <optgroup label="Other">
              <option value="federal_employment">Federal Employment Law</option>
              <option value="general">General Legal</option>
            </optgroup>
          </select>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 pt-5">
        <div className="flex space-x-1 bg-slate-900/60 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
          {[
            { id: 'chat', icon: Send, label: 'Chat' },
            { id: 'analyze', icon: FileText, label: 'Analyze' },
            { id: 'draft', icon: Download, label: 'Draft' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-gradient-to-b from-slate-700/90 to-slate-800/90 text-white shadow-lg shadow-black/30 border border-neon-mint/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-neon-mint' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'chat' && (
          <div className="bg-slate-900/40 rounded-xl p-5 h-full flex flex-col border border-white/5 shadow-xl shadow-black/20 backdrop-blur-sm">
            <div className="flex-1 overflow-y-auto mb-4 p-5 bg-gradient-to-b from-slate-950/60 to-vibe-void/60 rounded-lg border border-white/5">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="relative mb-5">
                    <div className="absolute inset-0 bg-neon-mint/20 blur-2xl rounded-full" />
                    <div className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-neon-mint/20 shadow-[0_0_40px_rgba(0,255,159,0.15)]">
                      <Scale className="w-12 h-12 text-neon-mint" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-200">Ask me anything about your legal situation</p>
                  <p className="text-sm mt-2 text-gray-500 max-w-md">
                    I specialize in SC unemployment claims, Walmart/Sedgwick issues, and general legal questions.
                  </p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block max-w-3xl p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-900/50 text-blue-100'
                        : 'bg-slate-800 text-gray-200'
                    }`}
                  >
                    {msg.reasoning && (
                      <div className="text-xs text-gray-400 mb-2 italic">
                        Reasoning: {msg.reasoning.substring(0, 100)}...
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neon-mint"></div>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Type your legal question..."
                className="flex-1 px-4 py-3 bg-slate-900/80 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-mint/40 focus:ring-2 focus:ring-neon-mint/20 transition-colors"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="px-6 py-3 bg-neon-mint text-slate-950 rounded-lg hover:bg-neon-mint/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg shadow-neon-mint/20 hover:shadow-neon-mint/40 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analyze' && (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-white">Document Analysis</h2>
            <textarea
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
              placeholder="Paste your legal document here for analysis..."
              className="w-full h-48 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-mint/50"
              disabled={loading}
            />
            <button
              onClick={analyzeDocument}
              disabled={loading || !analysisText.trim()}
              className="mt-4 px-6 py-2 bg-neon-mint text-slate-900 rounded-lg hover:bg-neon-mint/80 disabled:opacity-50 flex items-center space-x-2 font-medium"
            >
              <FileText className="w-4 h-4" />
              <span>Analyze Document</span>
            </button>
            {analysisResult && (
              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="font-semibold mb-2 text-neon-mint">Analysis Results:</h3>
                <div className="whitespace-pre-wrap text-sm text-gray-300">{analysisResult}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'draft' && (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-white">Document Drafting</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-300">Document Type</label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-mint/50"
              >
                <option value="appeal">Appeal Letter</option>
                <option value="complaint">Formal Complaint</option>
                <option value="response">Legal Response</option>
                <option value="demand">Demand Letter</option>
              </select>
            </div>
            <textarea
              value={caseDetails}
              onChange={(e) => setCaseDetails(e.target.value)}
              placeholder="Describe your case details, facts, and what you want to achieve..."
              className="w-full h-48 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-mint/50"
              disabled={loading}
            />
            <button
              onClick={generateDraft}
              disabled={loading || !caseDetails.trim()}
              className="mt-4 px-6 py-2 bg-neon-mint text-slate-900 rounded-lg hover:bg-neon-mint/80 disabled:opacity-50 flex items-center space-x-2 font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Generate Draft</span>
            </button>
            {draftPath && (
              <div className="mt-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                <div className="flex items-center space-x-2 text-green-400">
                  <AlertCircle className="w-5 h-5" />
                  <p>
                    Draft saved to:{' '}
                    <code className="bg-green-900/30 px-2 py-1 rounded">{draftPath}</code>
                  </p>
                </div>
              </div>
            )}
            {draftError && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <p>{draftError}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('investigation')

  const renderContent = () => {
    switch (activeTab) {
      case 'investigation':
        return <LegalAssistantView />
      case 'documents':
        return <DocumentManager />
      case 'brainscan':
        return <VibeDashboard />
      case 'cold-cases':
        return <ColdCases />
      case 'knowledge-base':
        return <KnowledgeBase />
      case 'diagnostics':
        return <DiagnosticsPanel />
      default:
        return <LegalAssistantView />
    }
  }

  return (
    <ErrorBoundary>
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="h-full flex flex-col">
          {/* Quick access tabs bar */}
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-sm border-b border-white/5 px-4 py-2.5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('investigation')}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'investigation'
                    ? 'bg-neon-mint/20 text-neon-mint border border-neon-mint/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Scale className="w-4 h-4" />
                Legal Assistant
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'documents'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Documents
              </button>
              <button
                onClick={() => setActiveTab('brainscan')}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'brainscan'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Brain className="w-4 h-4" />
                BrainScan
              </button>
              <button
                onClick={() => setActiveTab('cold-cases')}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'cold-cases'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Archive className="w-4 h-4" />
                Cold Cases
              </button>
              <button
                onClick={() => setActiveTab('knowledge-base')}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'knowledge-base'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Knowledge Base
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'diagnostics'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                System Diagnostics
              </button>
            </div>
          </div>
          {/* Main content */}
          <div className="flex-1 overflow-hidden">{renderContent()}</div>
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  )
}

export default App
