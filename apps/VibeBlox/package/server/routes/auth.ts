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

const auth = new Hono<AuthEnv>();

// Login
auth.post("/login", async (c) => {
	try {
		const body = await c.req.json<LoginRequest>();
		const { username, password } = body;

		if (!username || !password) {
			return c.json({ error: "Username and password required" }, 400);
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

export default auth;
