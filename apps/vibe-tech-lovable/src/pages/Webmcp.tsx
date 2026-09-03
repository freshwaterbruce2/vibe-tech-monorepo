import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';

interface ScanResult {
  url: string;
  timestamp: string;
  checks: {
    robotsTxt: { status: 'pass' | 'fail' | 'unknown'; details?: string };
    sitemapXml: { status: 'pass' | 'fail' | 'unknown'; details?: string };
    llmsTxt: { status: 'pass' | 'fail' | 'unknown'; details?: string };
    jsonLd: { status: 'pass' | 'fail' | 'unknown'; details?: string };
    mcpWellKnown: { status: 'pass' | 'fail' | 'unknown'; details?: string };
    mcpJson: { status: 'pass' | 'fail' | 'unknown'; details?: string };
    mcpPath: { status: 'pass' | 'fail' | 'unknown'; details?: string };
    homepageAccess: { status: 'pass' | 'fail' | 'unknown'; details?: string };
  };
  score: number;
}

const Webmcp = () => {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setScanResult(null);
    setScanning(true);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email }),
      });

      if (!response.ok) {
        throw new Error('Scan failed');
      }

      const data = await response.json();
      setScanResult(data);
    } catch (err) {
      setError('Scan failed. Check the URL and try again.');
    } finally {
      setScanning(false);
    }
  };

  const getStatusColor = (status: 'pass' | 'fail' | 'unknown') => {
    switch (status) {
      case 'pass':
        return 'text-green-400';
      case 'fail':
        return 'text-red-400';
      case 'unknown':
        return 'text-yellow-400';
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'unknown') => {
    switch (status) {
      case 'pass':
        return '✓';
      case 'fail':
        return '✗';
      case 'unknown':
        return '?';
    }
  };

  return (
    <PageLayout
      title="WebMCP Agency"
      description="Agent-ready site audits. $750 one-time audit with scorecard, ranked fix list, and 30-minute walkthrough."
      keywords="mcp, agent ready, site audit, llms.txt, robots.txt, schema.org, ai agents"
    >
      <section className="relative pb-12 pt-24 sm:pb-16 sm:pt-28">
        <div className="relative z-10 mx-auto max-w-4xl px-6">
          {/* Header */}
          <div
            className="mb-12 p-8 text-center"
            style={{
              background: 'var(--vibe-glass-rgba)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--vibe-glass-border)',
              boxShadow: '0 0 30px rgba(0, 242, 255, 0.3)',
              borderRadius: '8px',
            }}
          >
            <h1
              className="mb-4 font-heading text-4xl font-light text-white sm:text-5xl"
              style={{
                letterSpacing: 'var(--vibe-letter-spacing-wide)',
                textShadow: '0 0 20px rgba(0, 242, 255, 0.5)',
              }}
            >
              WebMCP <span style={{ color: 'var(--vibe-neon-cyan)' }}>Agency</span>
            </h1>
            <p className="font-body text-lg text-gray-300">
              Agent-ready site audits
            </p>
          </div>

          {/* Problem Statement */}
          <div
            className="mb-8 p-6"
            style={{
              background: 'var(--vibe-glass-rgba)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--vibe-glass-border)',
              boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)',
              borderRadius: '8px',
            }}
          >
            <h2
              className="mb-3 font-heading text-2xl font-light text-white"
              style={{ color: 'var(--vibe-neon-cyan)' }}
            >
              The Problem
            </h2>
            <p className="font-body text-base text-gray-300">
              Your site was built for humans. Agents bounce. No MCP endpoint. No llms.txt. Crawlers
              blocked. Schema missing.
            </p>
          </div>

          {/* Offer */}
          <div
            className="mb-8 p-6"
            style={{
              background: 'var(--vibe-glass-rgba)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--vibe-glass-border)',
              boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)',
              borderRadius: '8px',
            }}
          >
            <h2
              className="mb-3 font-heading text-2xl font-light text-white"
              style={{ color: 'var(--vibe-neon-cyan)' }}
            >
              $750 Agent-Ready Audit
            </h2>
            <ul className="space-y-2 font-body text-base text-gray-300">
              <li>• Scorecard with pass/fail/fix status</li>
              <li>• Ranked fix list: must / should / later</li>
              <li>• 30-minute walkthrough</li>
              <li>• One-time payment via Square</li>
            </ul>
            <p className="mt-4 font-body text-sm text-gray-400">
              Available at{' '}
              <span className="text-white">https://www.vibe-tech.org/webmcp</span>
            </p>
          </div>

          {/* Free Scanner */}
          <div
            className="mb-8 p-6"
            style={{
              background: 'var(--vibe-glass-rgba)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--vibe-glass-border)',
              boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)',
              borderRadius: '8px',
            }}
          >
            <h2
              className="mb-4 font-heading text-2xl font-light text-white"
              style={{ color: 'var(--vibe-neon-cyan)' }}
            >
              Run Free Scan
            </h2>
            <form onSubmit={handleScan} className="space-y-4">
              <div>
                <label className="mb-2 block font-body text-sm text-gray-300">Site URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full rounded border border-gray-600 bg-gray-900 px-4 py-2 font-body text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block font-body text-sm text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded border border-gray-600 bg-gray-900 px-4 py-2 font-body text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={scanning}
                className="w-full rounded px-6 py-3 font-body font-medium transition-all disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(135deg, var(--vibe-neon-cyan), var(--vibe-neon-purple))',
                  color: 'white',
                  boxShadow: '0 0 15px rgba(0, 242, 255, 0.4)',
                }}
              >
                {scanning ? 'Scanning...' : 'Run Free Scan'}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded border border-red-500 bg-red-900/20 p-3 font-body text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Scan Results */}
          {result && (
            <div
              className="mb-8 p-6"
              style={{
                background: 'var(--vibe-glass-rgba)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--vibe-glass-border)',
                boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)',
                borderRadius: '8px',
              }}
            >
              <h2
                className="mb-4 font-heading text-2xl font-light text-white"
                style={{ color: 'var(--vibe-neon-cyan)' }}
              >
                Scan Results
              </h2>
              <div className="mb-4">
                <p className="font-body text-sm text-gray-400">URL: {result.url}</p>
                <p className="font-body text-sm text-gray-400">Score: {result.score}/8</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-start justify-between border-b border-gray-700 pb-2">
                  <span className="font-body text-sm text-gray-300">robots.txt</span>
                  <span className={`font-body text-sm ${getStatusColor(result.checks.robotsTxt.status)}`}>
                    {getStatusIcon(result.checks.robotsTxt.status)}{' '}
                    {result.checks.robotsTxt.status}
                  </span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-700 pb-2">
                  <span className="font-body text-sm text-gray-300">sitemap.xml</span>
                  <span className={`font-body text-sm ${getStatusColor(result.checks.sitemapXml.status)}`}>
                    {getStatusIcon(result.checks.sitemapXml.status)}{' '}
                    {result.checks.sitemapXml.status}
                  </span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-700 pb-2">
                  <span className="font-body text-sm text-gray-300">/llms.txt</span>
                  <span className={`font-body text-sm ${getStatusColor(result.checks.llmsTxt.status)}`}>
                    {getStatusIcon(result.checks.llmsTxt.status)} {result.checks.llmsTxt.status}
                  </span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-700 pb-2">
                  <span className="font-body text-sm text-gray-300">JSON-LD / Schema.org</span>
                  <span className={`font-body text-sm ${getStatusColor(result.checks.jsonLd.status)}`}>
                    {getStatusIcon(result.checks.jsonLd.status)} {result.checks.jsonLd.status}
                  </span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-700 pb-2">
                  <span className="font-body text-sm text-gray-300">
                    /.well-known/mcp.json
                  </span>
                  <span className={`font-body text-sm ${getStatusColor(result.checks.mcpWellKnown.status)}`}>
                    {getStatusIcon(result.checks.mcpWellKnown.status)}{' '}
                    {result.checks.mcpWellKnown.status}
                  </span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-700 pb-2">
                  <span className="font-body text-sm text-gray-300">/mcp.json</span>
                  <span className={`font-body text-sm ${getStatusColor(result.checks.mcpJson.status)}`}>
                    {getStatusIcon(result.checks.mcpJson.status)} {result.checks.mcpJson.status}
                  </span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-700 pb-2">
                  <span className="font-body text-sm text-gray-300">/mcp</span>
                  <span className={`font-body text-sm ${getStatusColor(result.checks.mcpPath.status)}`}>
                    {getStatusIcon(result.checks.mcpPath.status)} {result.checks.mcpPath.status}
                  </span>
                </div>
                <div className="flex items-start justify-between border-b border-gray-700 pb-2">
                  <span className="font-body text-sm text-gray-300">Homepage access</span>
                  <span
                    className={`font-body text-sm ${getStatusColor(result.checks.homepageAccess.status)}`}
                  >
                    {getStatusIcon(result.checks.homepageAccess.status)}{' '}
                    {result.checks.homepageAccess.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Book Audit */}
          <div
            className="mb-8 p-6 text-center"
            style={{
              background: 'var(--vibe-glass-rgba)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--vibe-glass-border)',
              boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)',
              borderRadius: '8px',
            }}
          >
            <h2
              className="mb-3 font-heading text-2xl font-light text-white"
              style={{ color: 'var(--vibe-neon-cyan)' }}
            >
              Book Full Audit
            </h2>
            <p className="mb-4 font-body text-base text-gray-300">
              $750 one-time payment via Square
            </p>
            <a
              href="mailto:Bfreshwater@vibe-tech.org?subject=WebMCP%20Audit%20Request"
              className="inline-block rounded px-6 py-3 font-body font-medium transition-all"
              style={{
                background:
                  'linear-gradient(135deg, var(--vibe-neon-cyan), var(--vibe-neon-purple))',
                color: 'white',
                boxShadow: '0 0 15px rgba(0, 242, 255, 0.4)',
              }}
            >
              Email to Book
            </a>
            <p className="mt-2 font-body text-xs text-gray-400">
              This does not charge you. We will send a Square invoice after you confirm.
            </p>
          </div>

          {/* Footer */}
          <div className="text-center font-body text-sm text-gray-400">
            <p>A Vibe Tech LLC product</p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Webmcp;
