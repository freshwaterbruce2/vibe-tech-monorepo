import type Database from "better-sqlite3";
import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import { events } from "../events.js";
import { getRate } from "../fx/cache.js";
import { enqueueJob } from "../jobs/enqueue.js";
import { createRecurringSchedule } from "./recurringRoutes.js";
import type { Frequency } from "../recurring/scheduler.js";
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

interface TaxRateRow {
	id: string;
	user_id: string;
	rate_pct: number;
}

interface NormalizedItem {
	description: string;
	quantity: number;
	price: number;
	taxRateId: string | null;
	lineSubtotal: number;
	lineTax: number;
	total: number;
}

interface TaxStrategyResult {
	strategy: "invoice" | "item";
	items: NormalizedItem[];
	subtotal: number;
	tax: number;
	total: number;
}

const applyTaxStrategy = (
	db: Database.Database,
	userId: string,
	rawItems: unknown[],
	rawStrategy: string | undefined,
	rawInvoiceTax: number,
): TaxStrategyResult => {
	const strategy: "invoice" | "item" =
		rawStrategy === "item" ? "item" : "invoice";

	const ratesById = new Map<string, number>();
	const lookupRate = (id: string): number | null => {
		if (ratesById.has(id)) return ratesById.get(id) ?? null;
		const row = db
			.prepare(
				"SELECT id, user_id, rate_pct FROM tax_rates WHERE id = ? AND user_id = ?",
			)
			.get(id, userId) as TaxRateRow | undefined;
		const pct = row ? row.rate_pct : null;
		if (pct !== null) ratesById.set(id, pct);
		return pct;
	};

	const items: NormalizedItem[] = rawItems.map((raw) => {
		const r = (raw ?? {}) as Record<string, unknown>;
		const description = String(r.description ?? "");
		const quantity = Number(r.quantity ?? 0);
		const price = Number(r.price ?? 0);
		const taxRateIdRaw = r.taxRateId ?? r.tax_rate_id;
		const taxRateId =
			typeof taxRateIdRaw === "string" && taxRateIdRaw.length > 0
				? taxRateIdRaw
				: null;
		const lineSubtotal = quantity * price;
		let lineTax = 0;
		if (strategy === "item" && taxRateId) {
			const pct = lookupRate(taxRateId);
			if (pct !== null) {
				lineTax = lineSubtotal * (pct / 100);
			}
		}
		return {
			description,
			quantity,
			price,
			taxRateId,
			lineSubtotal,
			lineTax,
			total: lineSubtotal + lineTax,
		};
	});

	if (strategy === "item") {
		const subtotal = items.reduce((s, it) => s + it.lineSubtotal, 0);
		const tax = items.reduce((s, it) => s + it.lineTax, 0);
		return { strategy, items, subtotal, tax, total: subtotal + tax };
	}

	const subtotal = items.reduce((s, it) => s + it.lineSubtotal, 0);
	const tax = Number.isFinite(rawInvoiceTax) ? rawInvoiceTax : 0;
	return { strategy, items, subtotal, tax, total: subtotal + tax };
};

interface UserCurrencyRow {
	default_currency: string;
}

const stampCurrency = async (
	db: Database.Database,
	invoiceId: string,
	userId: string,
	invoiceCurrency: string,
	issueDate: string,
): Promise<void> => {
	const userRow = db
		.prepare("SELECT default_currency FROM users WHERE id = ?")
		.get(userId) as UserCurrencyRow | undefined;
	if (!userRow) return;
	const userCurrency = userRow.default_currency;
	let rate = 1;
	if (invoiceCurrency.toUpperCase() !== userCurrency.toUpperCase()) {
		try {
			rate = await getRate(db, invoiceCurrency, userCurrency, issueDate);
		} catch {
			// If FX lookup fails (no network in tests, frankfurter down),
			// stamp the user currency only and leave rate null. Better than
			// blocking invoice creation.
			db.prepare(
				`UPDATE invoices
				    SET user_currency_at_issue = ?
				  WHERE id = ?`,
			).run(userCurrency, invoiceId);
			return;
		}
	}
	db.prepare(
		`UPDATE invoices
		    SET exchange_rate_to_user_currency = ?,
		        user_currency_at_issue = ?
		  WHERE id = ?`,
	).run(rate, userCurrency, invoiceId);
};

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

	const invAny = invoice as InvoiceRow & {
		tax_strategy?: string | null;
		exchange_rate_to_user_currency?: number | null;
		user_currency_at_issue?: string | null;
		template_id?: string | null;
	};
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
		items: items.map((it) => {
			const itAny = it as InvoiceItemRow & { tax_rate_id?: string | null };
			return {
				id: it.id,
				description: it.description,
				quantity: it.quantity,
				price: it.price,
				total: it.total,
				taxRateId: itAny.tax_rate_id ?? undefined,
			};
		}),
		subtotal: invoice.subtotal,
		tax: invoice.tax,
		total: invoice.total,
		status: invoice.status,
		notes: invoice.notes ?? undefined,
		terms: invoice.terms ?? undefined,
		currency: invoice.currency,
		taxStrategy: (invAny.tax_strategy ?? "invoice") as "invoice" | "item",
		exchangeRateToUserCurrency:
			invAny.exchange_rate_to_user_currency ?? undefined,
		userCurrencyAtIssue: invAny.user_currency_at_issue ?? undefined,
		templateId: invAny.template_id ?? undefined,
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

		const rawItems = Array.isArray(body.items) ? body.items : [];
		const taxStrategyRaw = (body as { taxStrategy?: string }).taxStrategy;
		const computed = applyTaxStrategy(
			db,
			userId,
			rawItems,
			taxStrategyRaw,
			Number(body.tax ?? 0),
		);

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
			`insert into invoices
			   (id, user_id, invoice_number, client_id, issue_date, due_date,
			    subtotal, tax, total, status, notes, terms, currency, recurring_json,
			    parent_invoice_id, public_token, tax_strategy, created_at, updated_at)
			 values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			invoiceId,
			userId,
			invoiceNumber,
			clientId,
			issueDate,
			dueDate,
			computed.subtotal,
			computed.tax,
			computed.total,
			status,
			notes,
			terms,
			currency,
			recurring,
			body.parentInvoiceId ?? null,
			publicToken,
			computed.strategy,
			nowIso(),
			nowIso(),
		);

		for (const item of computed.items) {
			db.prepare(
				`insert into invoice_items
				   (id, invoice_id, description, quantity, price, total, tax_rate_id, created_at)
				 values (?, ?, ?, ?, ?, ?, ?, ?)`,
			).run(
				crypto.randomUUID(),
				invoiceId,
				item.description,
				item.quantity,
				item.price,
				item.total,
				item.taxRateId,
				nowIso(),
			);
		}

		await stampCurrency(db, invoiceId, userId, currency, issueDate);

		if (status === "sent") {
			enqueueJob(db, {
				type: "email.invoice",
				payload: { invoiceId },
			});
		}

		if (
			body.recurring &&
			typeof body.recurring === "object" &&
			(body.recurring as { enabled?: boolean }).enabled === true
		) {
			const r = body.recurring as {
				frequency?: string;
				interval?: number;
				endDate?: string;
				occurrences?: number;
			};
			const validFrequencies: Frequency[] = [
				"weekly",
				"monthly",
				"quarterly",
				"yearly",
			];
			const freq = (validFrequencies as string[]).includes(r.frequency ?? "")
				? (r.frequency as Frequency)
				: "monthly";
			createRecurringSchedule(db, {
				userId,
				templateInvoiceId: invoiceId,
				frequency: freq,
				intervalCount: r.interval ?? 1,
				endType: r.endDate
					? "date"
					: r.occurrences
					? "occurrences"
					: "never",
				endDate: r.endDate ?? null,
				occurrencesRemaining: r.occurrences ?? null,
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

		const rawItems = Array.isArray(body.items) ? body.items : [];
		const taxStrategyRaw = (body as { taxStrategy?: string }).taxStrategy;
		const computed = applyTaxStrategy(
			db,
			userId,
			rawItems,
			taxStrategyRaw,
			Number(body.tax ?? 0),
		);

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
					currency = ?, recurring_json = ?, tax_strategy = ?, updated_at = ?
				 where id = ?`,
			).run(
				invoiceNumber,
				clientId,
				issueDate,
				dueDate,
				computed.subtotal,
				computed.tax,
				computed.total,
				status,
				notes,
				terms,
				currency,
				recurring,
				computed.strategy,
				nowIso(),
				id,
			);
			db.prepare("delete from invoice_items where invoice_id = ?").run(id);
			for (const item of computed.items) {
				db.prepare(
					`insert into invoice_items
					   (id, invoice_id, description, quantity, price, total, tax_rate_id, created_at)
					 values (?, ?, ?, ?, ?, ?, ?, ?)`,
				).run(
					crypto.randomUUID(),
					id,
					item.description,
					item.quantity,
					item.price,
					item.total,
					item.taxRateId,
					nowIso(),
				);
			}
		});
		tx();

		await stampCurrency(db, id, userId, currency, issueDate);

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
