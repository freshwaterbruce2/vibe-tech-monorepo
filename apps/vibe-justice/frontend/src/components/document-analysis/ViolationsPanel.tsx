/**
 * ViolationsPanel Component
 *
 * Displays detected legal violations with severity badges
 * Features: filtering by severity, expandable details, color-coding
 *
 * Pattern: Based on KnowledgeBase.tsx document list
 */

import { useState, useMemo } from 'react';
import type { ElementType } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { Violation, ViolationSeverity } from '../../types/documentAnalysis';
import { SEVERITY_COLORS } from '../../types/documentAnalysis';

interface ViolationsPanelProps {
  violations: Violation[];
  isLoading?: boolean;
}

const SEVERITY_ICONS: Record<ViolationSeverity, ElementType> = {
  CRITICAL: AlertCircle,
  HIGH: AlertTriangle,
  MEDIUM: Info,
  LOW: CheckCircle,
};

export default function ViolationsPanel({ violations, isLoading }: ViolationsPanelProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<ViolationSeverity | 'ALL'>('ALL');
  const [expandedViolations, setExpandedViolations] = useState<Set<number>>(new Set());

  /**
   * Filter violations by selected severity
   */
  const filteredViolations = useMemo(() => {
    if (selectedSeverity === 'ALL') return violations;
    return violations.filter(v => v.severity === selectedSeverity);
  }, [violations, selectedSeverity]);

  /**
   * Count violations by severity
   */
  const severityCounts = useMemo(() => {
    const counts: Record<ViolationSeverity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    violations.forEach(v => {
      counts[v.severity]++;
    });

    return counts;
  }, [violations]);

  /**
   * Toggle violation expansion
   */
  const toggleExpanded = (index: number) => {
    setExpandedViolations(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-neon-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing for violations...</p>
        </div>
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-50" />
        <p className="text-gray-400">No violations detected</p>
        <p className="text-gray-500 text-sm mt-2">This is a strong indicator for your case</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with severity filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          Violations Detected ({filteredViolations.length})
        </h2>

        {/* Severity filter buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedSeverity('ALL')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selectedSeverity === 'ALL'
                ? 'bg-neon-mint text-slate-900'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            All ({violations.length})
          </button>

          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ViolationSeverity[]).map(severity => {
            const Icon = SEVERITY_ICONS[severity];
            const count = severityCounts[severity];
            const { color, bgColor, borderColor } = SEVERITY_COLORS[severity];

            if (count === 0) return null;

            return (
              <button
                key={severity}
                onClick={() => setSelectedSeverity(severity)}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                  selectedSeverity === severity
                    ? `${bgColor} ${color} border ${borderColor}`
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {severity} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Violations list */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredViolations.map((violation, index) => {
          const Icon = SEVERITY_ICONS[violation.severity];
          const { color, bgColor, borderColor } = SEVERITY_COLORS[violation.severity];
          const isExpanded = expandedViolations.has(index);

          return (
            <div
              key={index}
              className={`bg-slate-800/50 rounded-lg border ${borderColor} overflow-hidden transition-all hover:border-opacity-60`}
            >
              {/* Violation header - always visible */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{violation.type}</h3>
                      <p className="text-gray-400 text-sm mt-1">{violation.statute}</p>
                    </div>
                  </div>

                  {/* Severity badge */}
                  <span className={`px-2.5 py-1 rounded text-xs font-medium ${bgColor} ${color} border ${borderColor} flex-shrink-0`}>
                    {violation.severity}
                  </span>
                </div>

                {/* Evidence preview */}
                <div className="mt-3">
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {violation.evidence}
                  </p>
                </div>

                {/* Page number if available */}
                {violation.pageNumber !== null && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                    <FileText className="w-3.5 h-3.5" />
                    Page {violation.pageNumber}
                  </div>
                )}

                {/* Expand/collapse button */}
                <button
                  onClick={() => toggleExpanded(index)}
                  className="mt-3 flex items-center gap-1.5 text-sm text-neon-mint hover:underline"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show details
                    </>
                  )}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-700 space-y-3">
                  {/* Full evidence */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Evidence</h4>
                    <p className="text-gray-300 text-sm">{violation.evidence}</p>
                  </div>

                  {/* Recommended action */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">
                      Recommended Action
                    </h4>
                    <p className="text-gray-300 text-sm">{violation.recommendedAction}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      {filteredViolations.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-400 border-t border-slate-700 pt-4">
          <AlertCircle className="w-4 h-4" />
          Showing {filteredViolations.length} of {violations.length} violations
          {selectedSeverity !== 'ALL' && ` (filtered by ${selectedSeverity})`}
        </div>
      )}
    </div>
  );
}
