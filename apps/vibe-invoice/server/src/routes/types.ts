/**
 * Shared request/response and DB-row types for the invoice-automation-saas routes.
 *
 * DB row interfaces mirror the SQLite schema in schema.sql exactly so that
 * better-sqlite3 query results can be cast to them instead of `as any`.
 *
 * Request body / params interfaces capture the shape of incoming JSON that
 * each route expects from the client.
 *
 * The AuthenticatedRequest augment gives type-safe access to the `authUserId`
 * property that the preHandler hook attaches to every Fastify request object.
 */

import type { FastifyRequest } from 'fastify'

// ---------------------------------------------------------------------------
// Fastify request augmentation
// ---------------------------------------------------------------------------

/** A Fastify request after the preHandler auth hook has run. */
export interface AuthenticatedRequest extends FastifyRequest {
  authUserId?: string
}

// ---------------------------------------------------------------------------
// DB row types  (column names exactly match the SQLite schema)
// ---------------------------------------------------------------------------

export interface ClientRow {
  id: string
  user_id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceRow {
  id: string
  user_id: string
  invoice_number: string
  client_id: string
  issue_date: string
  due_date: string
  subtotal: number
  tax: number
  total: number
  status: string
  notes: string | null
  terms: string | null
  currency: string
  recurring_json: string | null
  parent_invoice_id: string | null
  public_token: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItemRow {
  id: string
  invoice_id: string
  description: string
  quantity: number
  price: number
  total: number
  created_at: string
}

/** Minimal row returned by ownership-check queries (`select user_id from …`). */
export interface OwnershipRow {
  user_id: string
}

/** Row returned by `select id from invoices` list queries. */
export interface InvoiceIdRow {
  id: string
}

/** Row returned by `select count(*) as cnt from invoices where client_id = ?`. */
export interface InvoiceCountRow {
  cnt: number
}

/** Row returned by `select id from clients` / `select id from users` existence checks. */
export interface IdRow {
  id: string
}

// ---------------------------------------------------------------------------
// Request body types
// ---------------------------------------------------------------------------

export interface InvoiceClientBody {
  name?: unknown
  email?: unknown
  phone?: unknown
  company?: unknown
  address?: unknown
}

export interface CreateInvoiceBody {
  invoiceNumber?: unknown
  issueDate?: unknown
  dueDate?: unknown
  currency?: unknown
  status?: unknown
  client?: InvoiceClientBody
  notes?: unknown
  terms?: unknown
  recurring?: unknown
  subtotal?: unknown
  tax?: unknown
  total?: unknown
  items?: unknown[]
  parentInvoiceId?: unknown
}

export interface PatchInvoiceStatusBody {
  status?: unknown
}

export interface CreateClientBody {
  name?: unknown
  email?: unknown
  phone?: unknown
  company?: unknown
  address?: unknown
}

export interface PatchClientBody {
  name?: unknown
  email?: unknown
  phone?: unknown
  company?: unknown
  address?: unknown
}

// ---------------------------------------------------------------------------
// Route params types
// ---------------------------------------------------------------------------

export interface IdParams {
  id: string
}
