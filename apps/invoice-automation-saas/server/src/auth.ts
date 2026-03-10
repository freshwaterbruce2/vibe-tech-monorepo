import type Database from "better-sqlite3";
import crypto from "crypto";

const TOKEN_COOKIE = "invoiceflow_session";

export interface AuthUser {
	id: string;
	email: string;
	fullName?: string;
	companyName?: string;
}

export const getSessionTtlSeconds = () => {
	const raw = process.env.SESSION_TTL_SECONDS;
	const asNumber = raw ? Number(raw) : NaN;
	if (Number.isFinite(asNumber) && asNumber > 60) return Math.floor(asNumber);
	// default: 7 days
	return 60 * 60 * 24 * 7;
};

const getAuthSecret = () => {
	const secret = process.env.AUTH_SECRET || "";
	if (!secret || secret.length < 32) {
		throw new Error("AUTH_SECRET must be set (>= 32 chars) for local auth.");
	}
	return secret;
};

const base64UrlEncode = (buf: Buffer) =>
	buf
		.toString("base64")
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");

const base64UrlDecode = (value: string) => {
	const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
	return Buffer.from(normalized, "base64");
};

const signJwt = (payload: object, secret: string) => {
	const header = { alg: "HS256", typ: "JWT" };
	const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
	const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
	const toSign = `${encodedHeader}.${encodedPayload}`;
	const sig = crypto.createHmac("sha256", secret).update(toSign).digest();
	return `${toSign}.${base64UrlEncode(sig)}`;
};

const verifyJwt = <T>(token: string, secret: string): T | null => {
	const parts = token.split(".");
	if (parts.length !== 3) return null;
	const [h, p, s] = parts;
	const toSign = `${h}.${p}`;
	const expected = crypto.createHmac("sha256", secret).update(toSign).digest();
	const actual = base64UrlDecode(s);
	if (actual.length !== expected.length) return null;
	if (!crypto.timingSafeEqual(actual, expected)) return null;
	try {
		return JSON.parse(base64UrlDecode(p).toString("utf-8")) as T;
	} catch {
		return null;
	}
};

const scryptAsync = async (password: string, salt: Buffer) =>
	new Promise<Buffer>((resolve, reject) => {
		crypto.scrypt(password, salt, 64, (err, key) => {
			if (err) reject(err);
			else resolve(key as Buffer);
		});
	});

export const hashPassword = async (password: string) => {
	const salt = crypto.randomBytes(16);
	const hash = await scryptAsync(password, salt);
	return { salt, hash };
};

export const verifyPassword = async (
	password: string,
	salt: Buffer,
	hash: Buffer,
) => {
	const derived = await scryptAsync(password, salt);
	if (derived.length !== hash.length) return false;
	return crypto.timingSafeEqual(derived, hash);
};

export const createSessionToken = (user: AuthUser) => {
	const secret = getAuthSecret();
	const now = Math.floor(Date.now() / 1000);
	const exp = now + getSessionTtlSeconds();
	const payload = { sub: user.id, email: user.email, iat: now, exp };
	return signJwt(payload, secret);
};

export const parseSessionToken = (token: string) => {
	const secret = getAuthSecret();
	const parsed = verifyJwt<{
		sub: string;
		email: string;
		iat: number;
		exp: number;
	}>(token, secret);
	if (!parsed) return null;
	const now = Math.floor(Date.now() / 1000);
	if (!Number.isFinite(parsed.exp) || parsed.exp <= now) return null;
	return parsed;
};

export const getSessionCookieName = () => TOKEN_COOKIE;

export const getUserById = (db: Database, id: string): AuthUser | null => {
	const row = db
		.prepare(
			"select id, email, full_name, company_name from users where id = ?",
		)
		.get(id) as any;
	if (!row) return null;
	return {
		id: row.id,
		email: row.email,
		fullName: row.full_name ?? undefined,
		companyName: row.company_name ?? undefined,
	};
};
