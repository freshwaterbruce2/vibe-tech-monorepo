/**
 * @fileoverview Type definitions for the dashboard data components.
 * These types are shared across dashboard hooks and components.
 */

/**
 * Represents a sales lead in the dashboard system.
 *
 * @interface Lead
 * @property {number} id - Unique identifier for the lead
 * @property {string} name - Contact name of the lead
 * @property {string} email - Email address of the lead
 * @property {string} source - Where the lead originated (e.g., "Website", "Referral")
 * @property {string} status - Current status in the sales pipeline
 * @property {string} date - Date the lead was created (ISO format)
 */
export interface Lead {
  id: number;
  name: string;
  email: string;
  source: string;
  status: string;
  date: string;
}

/**
 * Dashboard metrics summary for the overview panel.
 *
 * @interface DashboardMetrics
 * @property {number} totalLeads - Total number of leads in the system
 * @property {number} newLeadsToday - Number of leads added today
 * @property {string} conversionRate - Conversion rate as a formatted percentage
 * @property {string} avgResponseTime - Average response time (e.g., "2.5 hours")
 */
export interface DashboardMetrics {
  totalLeads: number;
  newLeadsToday: number;
  conversionRate: string;
  avgResponseTime: string;
}

/**
 * Possible status values for a lead in the sales pipeline.
 * @typedef {("New"|"Contacted"|"Qualified"|"Proposal"|"Closed")} LeadStatus
 */
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal" | "Closed";
