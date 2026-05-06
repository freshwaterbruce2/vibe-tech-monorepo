import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LoginRequest, User } from "../../types";

interface LoginProps {
	setUser: (user: User) => void;
}

export default function Login({ setUser }: LoginProps) {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const response = await fetch("http://localhost:3003/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password } as LoginRequest),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Login failed");
			}

			const data = await response.json();
			localStorage.setItem("token", data.token);
			setUser(data.user);
			navigate("/");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-bg-dark px-4">
			<div className="w-full max-w-md space-y-8">
				{/* Logo */}
				<div className="text-center">
					<div className="mb-4 text-6xl">🎮</div>
					<h1 className="font-heading text-4xl font-bold text-blue-primary">
						VibeBlox
					</h1>
					<p className="mt-2 text-text-secondary">Level Up Your Life!</p>
				</div>

				{/* Login Form */}
				<form
					onSubmit={handleSubmit}
					className="space-y-6 rounded-lg border border-border-subtle bg-bg-card p-8"
				>
					<div>
						<label
							htmlFor="username"
							className="block text-sm font-medium text-text-primary"
						>
							Username
						</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
							className="mt-1 block w-full rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-text-primary placeholder-text-muted focus:border-blue-primary focus:outline-none focus:ring-2 focus:ring-blue-primary"
							placeholder="dad or player1"
						/>
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-text-primary"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="mt-1 block w-full rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-text-primary placeholder-text-muted focus:border-blue-primary focus:outline-none focus:ring-2 focus:ring-blue-primary"
							placeholder="••••••••"
						/>
					</div>

					{error && (
						<div className="rounded-lg bg-red-primary/20 border border-red-primary px-4 py-3 text-sm text-red-light">
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className="btn-primary w-full"
					>
						{loading ? "Logging in..." : "Start Grinding! 🚀"}
					</button>
				</form>

				{/* Default Accounts Info */}
				<div className="text-center text-xs text-text-muted">
					<p>Default Accounts:</p>
					<p>Parent: dad / vibeblox2026</p>
					<p>Child: player1 / letsplay</p>
				</div>
			</div>
		</div>
	);
}
