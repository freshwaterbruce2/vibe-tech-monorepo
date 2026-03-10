import type Database from "better-sqlite3";
import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import {
	createSessionToken,
	getSessionCookieName,
	getSessionTtlSeconds,
	getUserById,
	hashPassword,
	verifyPassword,
} from "../auth.js";

const nowIso = () => new Date().toISOString();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const registerAuthRoutes = (app: FastifyInstance, db: Database) => {
	app.get("/api/auth/me", async (req) => {
		const userId = (req as any).authUserId as string | undefined;
		if (!userId) return { user: null };
		return { user: getUserById(db, userId) };
	});

	app.post("/api/auth/signup", async (req, reply) => {
		const body = (req.body ?? {}) as any;
		const email = normalizeEmail(String(body.email ?? ""));
		const password = String(body.password ?? "");
		const fullName = body.fullName ? String(body.fullName) : undefined;

		if (!email.includes("@"))
			return reply.code(400).send({ error: "Invalid email" });
		if (password.length < 8)
			return reply
				.code(400)
				.send({ error: "Password must be at least 8 characters" });

		const existing = db
			.prepare("select id from users where email = ?")
			.get(email) as any;
		if (existing)
			return reply.code(409).send({ error: "Email already exists" });

		const id = crypto.randomUUID();
		const { salt, hash } = await hashPassword(password);

		db.prepare(
			"insert into users (id, email, full_name, company_name, password_salt, password_hash, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
		).run(id, email, fullName ?? null, null, salt, hash, nowIso(), nowIso());

		const user = getUserById(db, id)!;
		const token = createSessionToken({
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			companyName: user.companyName,
		});
		reply.setCookie(getSessionCookieName(), token, {
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			secure: process.env.NODE_ENV === "production",
			domain: process.env.COOKIE_DOMAIN || undefined,
			maxAge: getSessionTtlSeconds(),
		});

		return { user };
	});

	app.post("/api/auth/login", async (req, reply) => {
		const body = (req.body ?? {}) as any;
		const email = normalizeEmail(String(body.email ?? ""));
		const password = String(body.password ?? "");
		const row = db
			.prepare(
				"select id, email, full_name, company_name, password_salt, password_hash from users where email = ?",
			)
			.get(email) as any;

		if (!row) return reply.code(401).send({ error: "Invalid credentials" });
		const ok = await verifyPassword(
			password,
			row.password_salt as Buffer,
			row.password_hash as Buffer,
		);
		if (!ok) return reply.code(401).send({ error: "Invalid credentials" });

		const user = getUserById(db, row.id)!;
		const token = createSessionToken({
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			companyName: user.companyName,
		});
		reply.setCookie(getSessionCookieName(), token, {
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			secure: process.env.NODE_ENV === "production",
			domain: process.env.COOKIE_DOMAIN || undefined,
			maxAge: getSessionTtlSeconds(),
		});

		return { user };
	});

	app.post("/api/auth/logout", async (_req, reply) => {
		reply.clearCookie(getSessionCookieName(), { path: "/" });
		return { ok: true };
	});

	app.patch("/api/auth/profile", async (req, reply) => {
		const userId = (req as any).authUserId as string | undefined;
		if (!userId) return reply.code(401).send({ error: "Unauthorized" });

		const body = (req.body ?? {}) as any;
		const fullName =
			body.fullName !== undefined ? String(body.fullName) : undefined;
		const companyName =
			body.companyName !== undefined ? String(body.companyName) : undefined;

		db.prepare(
			"update users set full_name = coalesce(?, full_name), company_name = coalesce(?, company_name), updated_at = ? where id = ?",
		).run(fullName ?? null, companyName ?? null, nowIso(), userId);

		return { user: getUserById(db, userId) };
	});
};
