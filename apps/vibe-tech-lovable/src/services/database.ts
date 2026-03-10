/**
 * @fileoverview Database service for backend API communication.
 *
 * This service provides a clean abstraction layer for CRUD operations
 * on customers, invoices, and leads. Data is persisted via a backend
 * API server (Railway) that stores data in SQLite on the D: drive.
 *
 * @module services/database
 */

import { getApiBaseUrl } from './apiBase';

/**
 * Customer entity representing a business customer.
 *
 * @interface Customer
 * @property {string} id - Unique identifier (UUID)
 * @property {string} email - Customer email address
 * @property {string} full_name - Customer's full name
 * @property {string|null} [phone] - Optional phone number
 * @property {string|null} [created_at] - ISO timestamp of creation
 */
export interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  created_at?: string | null;
}

/**
 * Invoice entity for billing records.
 *
 * @interface Invoice
 * @property {string} id - Unique identifier (UUID)
 * @property {number} amount_cents - Amount in cents (e.g., 1000 = $10.00)
 * @property {string|null} [issued_at] - ISO timestamp when invoice was issued
 * @property {string|null} [job_id] - Associated job/project ID
 * @property {boolean|null} [paid] - Whether invoice has been paid
 */
export interface Invoice {
  id: string;
  amount_cents: number;
  issued_at?: string | null;
  job_id?: string | null;
  paid?: boolean | null;
}

/**
 * Lead entity for sales pipeline tracking.
 *
 * @interface Lead
 * @property {string} id - Unique identifier (UUID)
 * @property {string} company_name - Company or organization name
 * @property {string} contact_email - Primary contact email
 * @property {string} contact_name - Primary contact person name
 * @property {string|null} [created_at] - ISO timestamp of creation
 * @property {string|null} [notes] - Additional notes about the lead
 * @property {string|null} [phone] - Contact phone number
 * @property {string|null} [status] - Current status (e.g., "New", "Contacted")
 */
export interface Lead {
  id: string;
  company_name: string;
  contact_email: string;
  contact_name: string;
  created_at?: string | null;
  notes?: string | null;
  phone?: string | null;
  status?: string | null;
}

const API_BASE_URL = getApiBaseUrl();

/**
 * Database service class providing CRUD operations for all entities.
 *
 * Handles communication with the backend REST API and provides
 * consistent error handling across all operations.
 *
 * @class DatabaseService
 *
 * @example
 * // Get all customers
 * const customers = await db.getCustomers();
 *
 * // Create a new lead
 * const lead = await db.createLead({
 *   company_name: "Acme Corp",
 *   contact_email: "john@acme.com",
 *   contact_name: "John Smith"
 * });
 *
 * // Update a lead
 * await db.updateLead(lead.id, { status: "Contacted" });
 *
 * // Delete a lead
 * await db.deleteLead(lead.id);
 */
class DatabaseService {
  // ============================================
  // Customer Operations
  // ============================================

  /**
   * Fetches all customers from the database.
   * @returns {Promise<Customer[]>} Array of customers, empty array on error
   */
  async getCustomers(): Promise<Customer[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    if (!response.ok) throw new Error('Failed to create customer');
    return response.json();
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update customer');
    return response.json();
  }

  async deleteCustomer(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete customer');
  }

  // ============================================
  // Invoice Operations
  // ============================================

  /**
   * Fetches all invoices from the database.
   * @returns {Promise<Invoice[]>} Array of invoices, empty array on error
   */
  async getInvoices(): Promise<Invoice[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoices`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async createInvoice(invoice: Omit<Invoice, 'id'>): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    if (!response.ok) throw new Error('Failed to create invoice');
    return response.json();
  }

  // ============================================
  // Lead Operations
  // ============================================

  /**
   * Fetches all leads from the database.
   * @returns {Promise<Lead[]>} Array of leads, empty array on error
   */
  async getLeads(): Promise<Lead[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leads`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    } catch (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
  }

  async createLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
    const response = await fetch(`${API_BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (!response.ok) throw new Error('Failed to create lead');
    return response.json();
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update lead');
    return response.json();
  }

  async deleteLead(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete lead');
  }
}

export const db = new DatabaseService();
