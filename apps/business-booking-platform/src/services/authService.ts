import axios from 'axios';

// Use proxy in development, direct URL in production
const isDevelopment = import.meta.env.DEV;
const API_URL = isDevelopment
	? ''
	: import.meta.env.VITE_API_URL || 'http://localhost:4002';

export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role?: string;
}

export interface AuthResponse {
	success: boolean;
	token: string;
	user: User;
}

class AuthService {
	private token: string | null = null;
	private user: User | null = null;

	constructor() {
		// Load token from localStorage
		this.token = localStorage.getItem('authToken');
		const savedUser = localStorage.getItem('user');
		if (savedUser) {
			this.user = JSON.parse(savedUser);
		}

		// Set default axios header if token exists
		if (this.token) {
			axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
		}
	}

	async register(
		email: string,
		password: string,
		firstName?: string,
		lastName?: string,
	): Promise<AuthResponse> {
		try {
			const response = await axios.post(`${API_URL}/api/auth/register`, {
				email,
				password,
				firstName,
				lastName,
				acceptTerms: true,
			});

			if (response.data.success) {
				this.setAuth(response.data.data.accessToken, response.data.data.user);
			}

			return {
				success: response.data.success,
				token: response.data.data.accessToken,
				user: response.data.data.user,
			};
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				throw new Error(error.response?.data?.error || 'Registration failed');
			}
			throw new Error('Registration failed');
		}
	}

	async login(email: string, password: string): Promise<AuthResponse> {
		try {
			const response = await axios.post(`${API_URL}/api/auth/login`, {
				email,
				password,
			});

			if (response.data.success) {
				this.setAuth(response.data.data.accessToken, response.data.data.user);
			}

			return {
				success: response.data.success,
				token: response.data.data.accessToken,
				user: response.data.data.user,
			};
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				throw new Error(error.response?.data?.error || 'Login failed');
			}
			throw new Error('Login failed');
		}
	}

	async getCurrentUser(): Promise<User | null> {
		if (!this.token) {
			return null;
		}

		try {
			const response = await axios.get(`${API_URL}/api/auth/me`);
			if (response.data.success) {
				this.user = response.data.data.user;
				localStorage.setItem('user', JSON.stringify(this.user));
				return this.user;
			}
			return null;
		} catch (_error) {
			this.logout();
			return null;
		}
	}

	private setAuth(token: string, user: User) {
		this.token = token;
		this.user = user;
		localStorage.setItem('authToken', token);
		localStorage.setItem('user', JSON.stringify(user));
		axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
	}

	logout() {
		this.token = null;
		this.user = null;
		localStorage.removeItem('authToken');
		localStorage.removeItem('user');
		delete axios.defaults.headers.common['Authorization'];
	}

	isAuthenticated(): boolean {
		return !!this.token;
	}

	getUser(): User | null {
		return this.user;
	}

	getToken(): string | null {
		return this.token;
	}

	isAdmin(): boolean {
		return this.user?.role === 'admin';
	}
}

export const authService = new AuthService();
