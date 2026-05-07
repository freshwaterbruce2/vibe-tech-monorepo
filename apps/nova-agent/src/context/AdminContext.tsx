import { Store } from "@tauri-apps/plugin-store";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

interface AdminContextType {
	isAdmin: boolean;
	login: (password: string) => Promise<boolean>;
	logout: () => Promise<void>;
	checkAdminStatus: () => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_PASSWORD = "vibe2026admin"; // In production, this would be handled more securely

export const AdminProvider = ({ children }: { children: ReactNode }) => {
	const [isAdmin, setIsAdmin] = useState<boolean>(false);
	const [store, setStore] = useState<Store | null>(null);

	useEffect(() => {
		const initStore = async () => {
			try {
				const newStore = await Store.load("store.json");
				setStore(newStore);

				const adminSession = await newStore.get<string>(
					"vibetech_admin_session",
				);
				if (adminSession === "authenticated") {
					setIsAdmin(true);
				}
			} catch (error) {
				console.error("Failed to initialize store:", error);
			}
		};

		void initStore();
	}, []);

	const login = useCallback(
		async (password: string): Promise<boolean> => {
			if (password === ADMIN_PASSWORD) {
				setIsAdmin(true);
				if (store) {
					try {
						await store.set("vibetech_admin_session", "authenticated");
						await store.save();
					} catch (error) {
						console.error("Failed to save session:", error);
					}
				}
				return true;
			}
			return false;
		},
		[store],
	);

	const logout = useCallback(async () => {
		setIsAdmin(false);
		if (store) {
			try {
				await store.delete("vibetech_admin_session");
				await store.save();
			} catch (error) {
				console.error("Failed to clear session:", error);
			}
		}
	}, [store]);

	const checkAdminStatus = useCallback((): boolean => {
		return isAdmin;
	}, [isAdmin]);

	const value = useMemo(
		() => ({ isAdmin, login, logout, checkAdminStatus }),
		[isAdmin, login, logout, checkAdminStatus],
	);

	return (
		<AdminContext.Provider value={value}>
			{children}
		</AdminContext.Provider>
	);
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = (): AdminContextType => {
	const context = useContext(AdminContext);
	if (!context) {
		throw new Error("useAdmin must be used within an AdminProvider");
	}
	return context;
};
