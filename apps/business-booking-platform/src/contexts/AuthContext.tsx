import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from 'react';

interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
}

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
	register: (
		email: string,
		password: string,
		firstName: string,
		lastName: string,
	) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Initialize auth state from localStorage
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			setUser(JSON.parse(storedUser));
		}
		setIsLoading(false);
	}, []);

	const login = async (email: string, _password: string) => {
		setIsLoading(true);
		try {
			// Mock login for now
			const mockUser: User = {
				id: '1',
				email,
				firstName: 'Demo',
				lastName: 'User',
				role: 'user',
			};
			setUser(mockUser);
			localStorage.setItem('user', JSON.stringify(mockUser));
		} catch (error) {
			console.error('Login failed:', error);
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const logout = () => {
		setUser(null);
		localStorage.removeItem('user');
	};

	const register = async (
		email: string,
		_password: string,
		firstName: string,
		lastName: string,
	) => {
		setIsLoading(true);
		try {
			// Mock registration for now
			const mockUser: User = {
				id: '1',
				email,
				firstName,
				lastName,
				role: 'user',
			};
			setUser(mockUser);
			localStorage.setItem('user', JSON.stringify(mockUser));
		} catch (error) {
			console.error('Registration failed:', error);
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const value: AuthContextType = {
		user,
		isAuthenticated: !!user,
		isLoading,
		login,
		logout,
		register,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
