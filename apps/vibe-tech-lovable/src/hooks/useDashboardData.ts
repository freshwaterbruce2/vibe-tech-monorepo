import { useState } from "react";
import { Lead, DashboardMetrics } from "./dashboard/types";
import { mockLeads, mockMetrics } from "./dashboard/mockData";
import { useLeadActions } from "./dashboard/useLeadActions";
import { useDashboardRefresh } from "./dashboard/useDashboardRefresh";
import { useNotificationEffects } from "./dashboard/useNotificationEffects";

/**
 * Main hook for managing dashboard state and data operations.
 *
 * Combines multiple sub-hooks to provide a unified API for the dashboard:
 * - Lead management (add, delete)
 * - Data refresh and loading states
 * - Metrics tracking
 * - Tab navigation
 *
 * @returns {Object} Dashboard state and actions
 * @property {string} activeTab - Currently selected dashboard tab
 * @property {Function} setActiveTab - Update the active tab
 * @property {boolean} isLoading - Whether data is being loaded
 * @property {string|null} error - Error message if data loading failed
 * @property {Lead[]} leads - Current list of leads
 * @property {DashboardMetrics} metrics - Dashboard statistics
 * @property {Function} loadDashboardData - Refresh dashboard data from API
 * @property {Function} deleteLead - Remove a lead by ID
 * @property {Function} addLead - Add a new lead
 * @property {boolean} isPro - Whether user has Pro tier access
 *
 * @example
 * const { leads, metrics, addLead, deleteLead } = useDashboardData();
 *
 * // Add a new lead
 * addLead({ name: "John", email: "john@example.com", source: "Website", status: "New", date: "2024-01-15" });
 *
 * // Delete a lead
 * deleteLead(123);
 */
export const useDashboardData = () => {
  // State declarations
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [metrics, setMetrics] = useState<DashboardMetrics>(mockMetrics);
  const [isPro] = useState(true);
  
  // Custom hooks for different features
  const { deleteLead, addLead } = useLeadActions(leads, setLeads, setMetrics);
  const { loadDashboardData, isInitialLoadRef, dataLoadedRef } = useDashboardRefresh(
    setLeads,
    setMetrics,
    setError,
    setIsLoading
  );
  
  // Setup notification effects
  useNotificationEffects(isInitialLoadRef, dataLoadedRef, loadDashboardData);

  return {
    activeTab,
    setActiveTab,
    isLoading,
    error,
    leads,
    metrics,
    loadDashboardData,
    deleteLead,
    addLead,
    isPro,
  };
};
