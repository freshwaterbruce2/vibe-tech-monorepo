import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { recordAudit } from "../audit.js";
import { events } from "../events.js";

const VALID_MANUAL_METHODS = new Set(["cash", "check", "other"]);
const METHOD_TO_PAYMENT_METHOD: Record<string, string> = {
	cash: "manual_cash",
	check: "manual_check",
	other: "manual_other",
};

export const registerPublicRoutes = (
	app: FastifyInstance,
	db: Database.Database,
) => {
	app.get("/api/public/invoices/:id", async (req, reply) => {
		const id = (req.params as any).id as string;
		const token = String((req.query as any)?.token ?? "");
		if (!token) return reply.code(400).send({ error: "token is required" });

		const invoice = db
			.prepare(
				"select id, user_id, status, public_token from invoices where id = ?",
			)
			.get(id) as any;
		if (!invoice) return reply.code(404).send({ error: "Not found" });
		if (invoice.status === "draft")
			return reply.code(403).send({ error: "Not available" });
		if (invoice.public_token !== token)
			return reply.code(403).send({ error: "Invalid token" });

		// Reuse the private route encoder by querying everything here
		const client = db
			.prepare(
				"select * from clients where id = (select client_id from invoices where id = ?)",
			)
			.get(id) as any;
		const inv = db
			.prepare("select * from invoices where id = ?")
			.get(id) as any;
		const items = db
			.prepare(
				"select * from invoice_items where invoice_id = ? order by created_at asc",
			)
			.all(id) as any[];

		return {
			invoice: {
				id: inv.id,
				invoiceNumber: inv.invoice_number,
				issueDate: inv.issue_date,
				dueDate: inv.due_date,
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
				subtotal: inv.subtotal,
				tax: inv.tax,
				total: inv.total,
				status: inv.status,
				notes: inv.notes ?? undefined,
				terms: inv.terms ?? undefined,
				currency: inv.currency,
				recurring: inv.recurring_json
					? JSON.parse(inv.recurring_json)
					: undefined,
				parentInvoiceId: inv.parent_invoice_id ?? undefined,
				publicToken: inv.public_token ?? undefined,
				createdAt: inv.created_at,
				updatedAt: inv.updated_at,
			},
		};
	});

	app.post(
		"/api/public/invoices/:id/record-manual-payment",
		async (req, reply) => {
			const id = (req.params as { id: string }).id;
			const token = String((req.query as { token?: string })?.token ?? "");
			const body = (req.body ?? {}) as {
				method?: string;
				notes?: string;
			};

			if (!token) {
				return reply.code(400).send({ error: "token is required" });
			}
			if (!body.method || !VALID_MANUAL_METHODS.has(body.method)) {
				return reply.code(400).send({
					error: `method must be one of: ${[...VALID_MANUAL_METHODS].join(", ")}`,
				});
			}
			if (!body.notes || body.notes.trim().length === 0) {
				return reply
					.code(400)
					.send({ error: "notes is required for manual payments" });
			}

			const invoice = db
				.prepare(
					"select id, user_id, status, total, currency, public_token from invoices where id = ?",
				)
				.get(id) as
				| {
						id: string;
						user_id: string;
						status: string;
						total: number;
						currency: string;
						public_token: string | null;
				  }
				| undefined;
			if (!invoice) return reply.code(404).send({ error: "Not found" });
			if (invoice.status === "draft")
				return reply.code(403).send({ error: "Not available" });
			if (invoice.status === "paid")
				return reply
					.code(409)
					.send({ error: "Invoice is already paid" });
			if (invoice.public_token !== token)
				return reply.code(403).send({ error: "Invalid token" });

			const paymentMethod =
				METHOD_TO_PAYMENT_METHOD[body.method] ?? "manual_other";
			const now = new Date().toISOString();
			const tx = db.transaction(() => {
				db.prepare(
					`INSERT INTO payments
              (id, invoice_id, amount, currency, method, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
				).run(
					crypto.randomUUID(),
					id,
					invoice.total,
					invoice.currency,
					paymentMethod,
					body.notes,
					now,
				);
				db.prepare(
					"update invoices set status = 'paid', updated_at = ? where id = ?",
				).run(now, id);
				recordAudit(db, {
					action: "invoice.paid",
					entityType: "invoice",
					entityId: id,
					actorUserId: null,
					metadata: {
						source: "manual",
						method: body.method,
						notes: body.notes,
					},
				});
			});
			tx();

			events.emitEvent({
				type: "invoices:changed",
				userId: invoice.user_id,
			});
			return { ok: true };
		},
	);
};
