import type Database from "better-sqlite3";
import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import { events } from "../events.js";
import { enqueueJob } from "../jobs/enqueue.js";
import type {
	AuthenticatedRequest,
	ClientRow,
	CreateInvoiceBody,
	IdParams,
	InvoiceIdRow,
	InvoiceItemRow,
	InvoiceRow,
	OwnershipRow,
	PatchInvoiceStatusBody,
} from "./types.js";

const nowIso = () => new Date().toISOString();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toInvoiceApi = (db: Database.Database, invoiceId: string) => {
	const invoice = db
		.prepare("select * from invoices where id = ?")
		.get(invoiceId) as InvoiceRow | undefined;
	if (!invoice) return null;

	const client = db
		.prepare("select * from clients where id = ?")
		.get(invoice.client_id) as ClientRow;
	const items = db
		.prepare(
			"select * from invoice_items where invoice_id = ? order by created_at asc",
		)
		.all(invoiceId) as InvoiceItemRow[];

	return {
		id: invoice.id,
		invoiceNumber: invoice.invoice_number,
		issueDate: invoice.issue_date,
		dueDate: invoice.due_date,
		client: {
			id: client.id,
			name: client.name,
			email: client.email,
			phone: client.phone ?? undefined,
			company: client.company ?? undefined,
			address: client.address ?? undefined,
		},
		items: items.map((it) => ({
			id: it.id,
			description: it.description,
			quantity: it.quantity,
			price: it.price,
			total: it.total,
		})),
		subtotal: invoice.subtotal,
		tax: invoice.tax,
		total: invoice.total,
		status: invoice.status,
		notes: invoice.notes ?? undefined,
		terms: invoice.terms ?? undefined,
		currency: invoice.currency,
		recurring: invoice.recurring_json
			? JSON.parse(invoice.recurring_json)
			: undefined,
		parentInvoiceId: invoice.parent_invoice_id ?? undefined,
		publicToken: invoice.public_token ?? undefined,
		createdAt: invoice.created_at,
		updatedAt: invoice.updated_at,
	};
};

export const registerInvoiceRoutes = (
	app: FastifyInstance,
	db: Database.Database,
) => {
	app.get("/api/invoices", async (req, reply) => {
		const userId = (req as AuthenticatedRequest).authUserId;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const invoiceIds = db
			.prepare(
				"select id from invoices where user_id = ? order by updated_at desc",
			)
			.all(userId) as InvoiceIdRow[];

		return {
			invoices: invoiceIds
				.map((row) => toInvoiceApi(db, row.id))
				.filter(Boolean),
		};
	});

	app.get("/api/invoices/:id", async (req, reply) => {
		const userId = (req as AuthenticatedRequest).authUserId;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const id = (req.params as IdParams).id;
		const row = db
			.prepare("select user_id from invoices where id = ?")
			.get(id) as OwnershipRow | undefined;
		if (!row) return reply.code(404).send({ error: "Not found" });
		if (row.user_id !== userId)
			return reply.code(403).send({ error: "Forbidden" });

		return { invoice: toInvoiceApi(db, id) };
	});

	app.post("/api/invoices", async (req, reply) => {
		const userId = (req as AuthenticatedRequest).authUserId;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const body = (req.body ?? {}) as CreateInvoiceBody;
		const invoiceNumber = String(body.invoiceNumber ?? "");
		const issueDate = String(body.issueDate ?? "");
		const dueDate = String(body.dueDate ?? "");
		const currency = String(body.currency ?? "USD");
		const status = String(body.status ?? "sent");
		const client = body.client ?? {};
		const clientEmail = normalizeEmail(String(client.email ?? ""));
		const clientName = String(client.name ?? "");
		const notes = body.notes ? String(body.notes) : null;
		const terms = body.terms ? String(body.terms) : null;
		const recurring = body.recurring ? JSON.stringify(body.recurring) : null;

		if (!invoiceNumber)
			return reply.code(400).send({ error: "invoiceNumber is required" });
		if (!issueDate)
			return reply.code(400).send({ error: "issueDate is required" });
		if (!dueDate) return reply.code(400).send({ error: "dueDate is required" });
		if (!clientName)
			return reply.code(400).send({ error: "client.name is required" });
		if (!clientEmail.includes("@"))
			return reply.code(400).send({ error: "client.email is invalid" });

		const subtotal = Number(body.subtotal ?? 0);
		const tax = Number(body.tax ?? 0);
		const total = Number(body.total ?? 0);
		const items = Array.isArray(body.items) ? body.items : [];

		const clientRow =
			(db
				.prepare("select * from clients where user_id = ? and email = ?")
				.get(userId, clientEmail) as ClientRow | null) ?? null;

		const clientId = clientRow?.id ?? crypto.randomUUID();
		if (!clientRow) {
			db.prepare(
				"insert into clients (id, user_id, name, email, phone, company, address, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			).run(
				clientId,
				userId,
				clientName,
				clientEmail,
				client.phone ?? null,
				client.company ?? null,
				client.address ?? null,
				nowIso(),
				nowIso(),
			);
		} else {
			db.prepare(
				"update clients set name = ?, phone = ?, company = ?, address = ?, updated_at = ? where id = ?",
			).run(
				clientName,
				client.phone ?? null,
				client.company ?? null,
				client.address ?? null,
				nowIso(),
				clientId,
			);
		}

		const invoiceId = crypto.randomUUID();
		const publicToken = crypto.randomBytes(16).toString("hex");

		db.prepare(
			"insert into invoices (id, user_id, invoice_number, client_id, issue_date, due_date, subtotal, tax, total, status, notes, terms, currency, recurring_json, parent_invoice_id, public_token, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		).run(
			invoiceId,
			userId,
			invoiceNumber,
			clientId,
			issueDate,
			dueDate,
			subtotal,
			tax,
			total,
			status,
			notes,
			terms,
			currency,
			recurring,
			body.parentInvoiceId ?? null,
			publicToken,
			nowIso(),
			nowIso(),
		);

		for (const item of items) {
			db.prepare(
				"insert into invoice_items (id, invoice_id, description, quantity, price, total, created_at) values (?, ?, ?, ?, ?, ?, ?)",
			).run(
				crypto.randomUUID(),
				invoiceId,
				String((item as Record<string, unknown>).description ?? ""),
				Number((item as Record<string, unknown>).quantity ?? 0),
				Number((item as Record<string, unknown>).price ?? 0),
				Number((item as Record<string, unknown>).total ?? 0),
				nowIso(),
			);
		}

		if (status === "sent") {
			enqueueJob(db, {
				type: "email.invoice",
				payload: { invoiceId },
			});
		}

		events.emitEvent({ type: "invoices:changed", userId });
		return { invoice: toInvoiceApi(db, invoiceId) };
	});

	app.post("/api/invoices/:id/resend", async (req, reply) => {
		const userId = (req as AuthenticatedRequest).authUserId;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const id = (req.params as IdParams).id;
		const row = db
			.prepare("select user_id, status from invoices where id = ?")
			.get(id) as (OwnershipRow & { status: string }) | undefined;
		if (!row) return reply.code(404).send({ error: "Not found" });
		if (row.user_id !== userId)
			return reply.code(403).send({ error: "Forbidden" });
		if (row.status === "draft")
			return reply
				.code(409)
				.send({ error: "Cannot resend a draft invoice" });

		const job = enqueueJob(db, {
			type: "email.invoice",
			payload: { invoiceId: id },
		});
		return { jobId: job.id };
	});

	app.put("/api/invoices/:id", async (req, reply) => {
		const userId = (req as AuthenticatedRequest).authUserId;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const id = (req.params as IdParams).id;
		const existing = db
			.prepare("select user_id, status from invoices where id = ?")
			.get(id) as { user_id: string; status: string } | undefined;
		if (!existing) return reply.code(404).send({ error: "Not found" });
		if (existing.user_id !== userId)
			return reply.code(403).send({ error: "Forbidden" });
		if (existing.status !== "draft")
			return reply.code(409).send({
				error: "Only draft invoices can be edited",
				status: existing.status,
			});

		const body = (req.body ?? {}) as CreateInvoiceBody;
		const invoiceNumber = String(body.invoiceNumber ?? "");
		const issueDate = String(body.issueDate ?? "");
		const dueDate = String(body.dueDate ?? "");
		const currency = String(body.currency ?? "USD");
		const status = String(body.status ?? "draft");
		const client = body.client ?? {};
		const clientEmail = normalizeEmail(String(client.email ?? ""));
		const clientName = String(client.name ?? "");
		const notes = body.notes ? String(body.notes) : null;
		const terms = body.terms ? String(body.terms) : null;
		const recurring = body.recurring ? JSON.stringify(body.recurring) : null;

		if (!invoiceNumber)
			return reply.code(400).send({ error: "invoiceNumber is required" });
		if (!issueDate)
			return reply.code(400).send({ error: "issueDate is required" });
		if (!dueDate)
			return reply.code(400).send({ error: "dueDate is required" });
		if (!clientName)
			return reply.code(400).send({ error: "client.name is required" });
		if (!clientEmail.includes("@"))
			return reply.code(400).send({ error: "client.email is invalid" });

		const subtotal = Number(body.subtotal ?? 0);
		const tax = Number(body.tax ?? 0);
		const total = Number(body.total ?? 0);
		const items = Array.isArray(body.items) ? body.items : [];

		const clientRow =
			(db
				.prepare("select * from clients where user_id = ? and email = ?")
				.get(userId, clientEmail) as ClientRow | null) ?? null;
		const clientId = clientRow?.id ?? crypto.randomUUID();
		if (!clientRow) {
			db.prepare(
				"insert into clients (id, user_id, name, email, phone, company, address, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			).run(
				clientId,
				userId,
				clientName,
				clientEmail,
				client.phone ?? null,
				client.company ?? null,
				client.address ?? null,
				nowIso(),
				nowIso(),
			);
		} else {
			db.prepare(
				"update clients set name = ?, phone = ?, company = ?, address = ?, updated_at = ? where id = ?",
			).run(
				clientName,
				client.phone ?? null,
				client.company ?? null,
				client.address ?? null,
				nowIso(),
				clientId,
			);
		}

		const tx = db.transaction(() => {
			db.prepare(
				`update invoices set
					invoice_number = ?, client_id = ?, issue_date = ?, due_date = ?,
					subtotal = ?, tax = ?, total = ?, status = ?, notes = ?, terms = ?,
					currency = ?, recurring_json = ?, updated_at = ?
				 where id = ?`,
			).run(
				invoiceNumber,
				clientId,
				issueDate,
				dueDate,
				subtotal,
				tax,
				total,
				status,
				notes,
				terms,
				currency,
				recurring,
				nowIso(),
				id,
			);
			db.prepare("delete from invoice_items where invoice_id = ?").run(id);
			for (const item of items) {
				db.prepare(
					"insert into invoice_items (id, invoice_id, description, quantity, price, total, created_at) values (?, ?, ?, ?, ?, ?, ?)",
				).run(
					crypto.randomUUID(),
					id,
					String((item as Record<string, unknown>).description ?? ""),
					Number((item as Record<string, unknown>).quantity ?? 0),
					Number((item as Record<string, unknown>).price ?? 0),
					Number((item as Record<string, unknown>).total ?? 0),
					nowIso(),
				);
			}
		});
		tx();

		events.emitEvent({ type: "invoices:changed", userId });
		return { invoice: toInvoiceApi(db, id) };
	});

	app.delete("/api/invoices/:id", async (req, reply) => {
		const userId = (req as AuthenticatedRequest).authUserId;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const id = (req.params as IdParams).id;
		const existing = db
			.prepare("select user_id, status from invoices where id = ?")
			.get(id) as { user_id: string; status: string } | undefined;
		if (!existing) return reply.code(404).send({ error: "Not found" });
		if (existing.user_id !== userId)
			return reply.code(403).send({ error: "Forbidden" });
		if (existing.status !== "draft")
			return reply.code(409).send({
				error: "Only draft invoices can be deleted",
				status: existing.status,
			});

		const tx = db.transaction(() => {
			db.prepare("delete from invoice_items where invoice_id = ?").run(id);
			db.prepare("delete from invoices where id = ?").run(id);
		});
		tx();

		events.emitEvent({ type: "invoices:changed", userId });
		return reply.code(204).send();
	});

	app.patch("/api/invoices/:id/status", async (req, reply) => {
		const userId = (req as AuthenticatedRequest).authUserId;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const id = (req.params as IdParams).id;
		const body = (req.body ?? {}) as PatchInvoiceStatusBody;
		const status = String(body.status ?? "");
		if (!["draft", "sent", "paid", "overdue"].includes(status)) {
			return reply.code(400).send({ error: "Invalid status" });
		}

		const row = db
			.prepare("select user_id from invoices where id = ?")
			.get(id) as OwnershipRow | undefined;
		if (!row) return reply.code(404).send({ error: "Not found" });
		if (row.user_id !== userId)
			return reply.code(403).send({ error: "Forbidden" });

		db.prepare(
			"update invoices set status = ?, updated_at = ? where id = ?",
		).run(status, nowIso(), id);
		events.emitEvent({ type: "invoices:changed", userId });

		return { invoice: toInvoiceApi(db, id) };
	});
};
