export interface LocalUser {
	id: string;
	email: string;
	fullName?: string;
	companyName?: string;
}

const apiFetch = async (path: string, init?: RequestInit) => {
	const res = await fetch(path, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
		credentials: "include",
	});

	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
		const message =
			(typeof body?.error === 'string' ? body.error : undefined) ??
			(typeof body?.message === 'string' ? body.message : undefined) ??
			res.statusText;
		throw new Error(message);
	}

	return (await res.json().catch(() => ({}))) as Record<string, unknown>;
};

class AuthService {
	async signUp(email: string, password: string, fullName?: string) {
		const data = await apiFetch("/api/auth/signup", {
			method: "POST",
			body: JSON.stringify({ email, password, fullName }),
		});
		return { user: data.user as LocalUser, session: null };
	}

	async signIn(email: string, password: string) {
		const data = await apiFetch("/api/auth/login", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});
		return { user: data.user as LocalUser, session: null };
	}

	async signOut() {
		await apiFetch("/api/auth/logout", { method: "POST" });
	}

	async getCurrentUser() {
		const data = await apiFetch("/api/auth/me", { method: "GET" });
		return (data.user as LocalUser | null) ?? null;
	}

	async updateProfile(updates: { full_name?: string; company_name?: string }) {
		const data = await apiFetch("/api/auth/profile", {
			method: "PATCH",
			body: JSON.stringify({
				fullName: updates.full_name,
				companyName: updates.company_name,
			}),
		});
		return data.user as LocalUser;
	}
}

export const authService = new AuthService();
