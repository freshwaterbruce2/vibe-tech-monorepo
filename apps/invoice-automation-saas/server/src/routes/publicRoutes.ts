import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { events } from "../events.js";

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

	app.post("/api/public/invoices/:id/pay", async (req, reply) => {
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

		db.prepare(
			"update invoices set status = ?, updated_at = ? where id = ?",
		).run("paid", new Date().toISOString(), id);
		events.emitEvent({ type: "invoices:changed", userId: invoice.user_id });
		return { ok: true };
	});
};
