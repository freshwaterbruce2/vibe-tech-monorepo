import bcrypt from "bcryptjs";
import { Hono } from "hono";
import type {
	LoginRequest,
	LoginResponse,
	User,
} from "../../src/types/index.js";
import { db } from "../db/index.js";
import {
	type AuthEnv,
	authMiddleware,
	generateToken,
	type JWTPayload,
} from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

const auth = new Hono<AuthEnv>();

// Apply auth rate limiter to all POST routes (login + register)
// Limits: 5 requests per IP per minute — prevents brute-force attacks
auth.use("/login", authRateLimiter);
auth.use("/register", authRateLimiter);

// Login
auth.post("/login", async (c) => {
	try {
		const body = await c.req.json<LoginRequest>();
		const { username, password } = body;

		if (!username || !password) {
			return c.json({ error: "Username and password required" }, 400);
		}

		// Prevent bcrypt DoS from extremely long inputs (bcryptjs silently truncates at 72 bytes)
		if (password.length > 1000) {
			return c.json({ error: "Invalid credentials" }, 401);
		}

		// Find user
		const user = db
			.prepare("SELECT * FROM users WHERE username = ?")
			.get(username) as User | undefined;

		if (!user) {
			return c.json({ error: "Invalid credentials" }, 401);
		}

		// Verify password
		const validPassword = await bcrypt.compare(
			password,
			(user as any).password_hash,
		);

		if (!validPassword) {
			return c.json({ error: "Invalid credentials" }, 401);
		}

		// Remove password_hash from response
		const { password_hash, ...userWithoutPassword } = user as any;

		// Generate JWT
		const token = generateToken({
			userId: user.id,
			username: user.username,
			role: user.role,
		});

		const response: LoginResponse = {
			user: userWithoutPassword as User,
			token,
		};

		return c.json(response);
	} catch (error) {
		console.error("Login error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

// Get current user
auth.use("/me", authMiddleware);

auth.get("/me", async (c) => {
	try {
		const user = c.get("user") as JWTPayload | undefined;

		if (!user) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		const dbUser = db
			.prepare("SELECT * FROM users WHERE id = ?")
			.get(user.userId) as User | undefined;

		if (!dbUser) {
			return c.json({ error: "User not found" }, 404);
		}

		const { password_hash, ...userWithoutPassword } = dbUser as any;

		return c.json({ user: userWithoutPassword });
	} catch (error) {
		console.error("Get user error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

// Register a new user
// Rate limiting is applied via auth.use("/register", authRateLimiter) above
auth.post("/register", async (c) => {
	try {
		const body = await c.req.json<{
			username: string;
			password: string;
			display_name: string;
			role: "child" | "parent";
		}>();
		const { username, password, display_name, role } = body;

		if (!username || !password || !display_name || !role) {
			return c.json(
				{ error: "username, password, display_name, and role are required" },
				400,
			);
		}

		if (role !== "child" && role !== "parent") {
			return c.json({ error: "role must be 'child' or 'parent'" }, 400);
		}

		// Username: 3-30 chars, letters/numbers/underscore only
		if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
			return c.json(
				{ error: "Username must be 3-30 characters (letters, numbers, underscore only)" },
				400,
			);
		}

		// Display name: 1-50 chars
		if (display_name.length < 1 || display_name.length > 50) {
			return c.json({ error: "Display name must be 1-50 characters" }, 400);
		}

		// Password: 8-72 chars (bcryptjs silently truncates at 72 bytes — enforce explicitly)
		if (password.length < 8 || password.length > 72) {
			return c.json({ error: "Password must be 8-72 characters" }, 400);
		}

		// Check for existing username
		const existing = db
			.prepare("SELECT id FROM users WHERE username = ?")
			.get(username);

		if (existing) {
			return c.json({ error: "Username already taken" }, 409);
		}

		const password_hash = await bcrypt.hash(password, 12);

		const result = db
			.prepare(
				`INSERT INTO users (username, password_hash, display_name, role)
         VALUES (?, ?, ?, ?)`,
			)
			.run(username, password_hash, display_name, role);

		const newUser = db
			.prepare("SELECT * FROM users WHERE id = ?")
			.get(result.lastInsertRowid) as User;

		const { password_hash: _ph, ...userWithoutPassword } = newUser as User & {
			password_hash: string;
		};

		const token = generateToken({
			userId: newUser.id,
			username: newUser.username,
			role: newUser.role,
		});

		return c.json({ user: userWithoutPassword, token }, 201);
	} catch (error) {
		console.error("Register error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default auth;
