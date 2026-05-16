import bcrypt from "bcryptjs";
import type { Database } from "better-sqlite3";

export function seedUsers(db: Database) {
	const passwordHash = bcrypt.hashSync("vibeblox2026", 10);
	const childPasswordHash = bcrypt.hashSync("letsplay", 10);

	db.prepare(
		`INSERT OR IGNORE INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)`,
	).run("dad", passwordHash, "Dad", "parent");

	db.prepare(
		`INSERT OR IGNORE INTO users (username, password_hash, display_name, role, current_coins, lifetime_coins) VALUES (?, ?, ?, ?, ?, ?)`,
	).run("player1", childPasswordHash, "Player 1", "child", 100, 100);

	console.log("✅ Users created");
}
