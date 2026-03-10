import type Database from "better-sqlite3";
import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import { events } from "../events.js";

const nowIso = () => new Date().toISOString();
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toInvoiceApi = (db: Database, invoiceId: string) => {
	const invoice = db
		.prepare("select * from invoices where id = ?")
		.get(invoiceId) as any;
	if (!invoice) return null;

	const client = db
		.prepare("select * from clients where id = ?")
		.get(invoice.client_id) as any;
	const items = db
		.prepare(
			"select * from invoice_items where invoice_id = ? order by created_at asc",
		)
		.all(invoiceId) as any[];

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

export const registerInvoiceRoutes = (app: FastifyInstance, db: Database) => {
	app.get("/api/invoices", async (req, reply) => {
		const userId = (req as any).authUserId as string | undefined;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const invoiceIds = db
			.prepare(
				"select id from invoices where user_id = ? order by updated_at desc",
			)
			.all(userId) as any[];

		return {
			invoices: invoiceIds
				.map((row) => toInvoiceApi(db, row.id))
				.filter(Boolean),
		};
	});

	app.get("/api/invoices/:id", async (req, reply) => {
		const userId = (req as any).authUserId as string | undefined;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const id = (req.params as any).id as string;
		const row = db
			.prepare("select user_id from invoices where id = ?")
			.get(id) as any;
		if (!row) return reply.code(404).send({ error: "Not found" });
		if (row.user_id !== userId)
			return reply.code(403).send({ error: "Forbidden" });

		return { invoice: toInvoiceApi(db, id) };
	});

	app.post("/api/invoices", async (req, reply) => {
		const userId = (req as any).authUserId as string | undefined;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const body = (req.body ?? {}) as any;
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
				.get(userId, clientEmail) as any) ?? null;

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
				String(item.description ?? ""),
				Number(item.quantity ?? 0),
				Number(item.price ?? 0),
				Number(item.total ?? 0),
				nowIso(),
			);
		}

		events.emitEvent({ type: "invoices:changed", userId });
		return { invoice: toInvoiceApi(db, invoiceId) };
	});

	app.patch("/api/invoices/:id/status", async (req, reply) => {
		const userId = (req as any).authUserId as string | undefined;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const id = (req.params as any).id as string;
		const body = (req.body ?? {}) as any;
		const status = String(body.status ?? "");
		if (!["draft", "sent", "paid", "overdue"].includes(status)) {
			return reply.code(400).send({ error: "Invalid status" });
		}

		const row = db
			.prepare("select user_id from invoices where id = ?")
			.get(id) as any;
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
