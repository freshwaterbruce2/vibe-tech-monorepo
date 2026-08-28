import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService, type LocalUser } from "../services/authService";

interface AuthContextType {
	user: LocalUser | null;
	session: null;
	loading: boolean;
	signUp: (email: string, password: string, fullName?: string) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	updateProfile: (updates: {
		full_name?: string;
		company_name?: string;
	}) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

export const AuthProvider = ({
	children,
}: { children: React.ReactNode }) => {
	const [user, setUser] = useState<LocalUser | null>(null);
	const session = null;
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		authService
			.getCurrentUser()
			.then((u) => setUser(u))
			.catch(() => setUser(null))
			.finally(() => setLoading(false));
	}, []);

	const signUp = async (email: string, password: string) => {
		try {
			const { user } = await authService.signUp(
				email,
				password,
			);
			if (user) {
				setUser(user);
				setLoading(false);
			}
		} catch (err) {
			setLoading(false);
			throw err;
		}
	};

	const signIn = async (email: string, password: string) => {
		try {
			const { user } = await authService.signIn(email, password);
			if (user) {
				setUser(user);
				setLoading(false);
			}
		} catch (err) {
			setLoading(false);
			throw err;
		}
	};

	const signOut = async () => {
		await authService.signOut();
		setUser(null);
	};

	const updateProfile = async (updates: {
		full_name?: string;
		company_name?: string;
	}) => {
		await authService.updateProfile(updates);
		// Refresh user data
		const currentUser = await authService.getCurrentUser();
		setUser(currentUser);
	};

	const value = useMemo(
		() => ({
			user,
			session,
			loading,
			signUp,
			signIn,
			signOut,
			updateProfile,
		}),
		[user, session, loading, signUp, signIn, signOut, updateProfile],
	);

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
};
