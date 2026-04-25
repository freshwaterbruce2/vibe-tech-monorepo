import { Store } from "@tauri-apps/plugin-store";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "@/hooks/use-toast";

const NOTIFICATIONS_STORE_PATH = "store.json";
const NOTIFICATIONS_STORAGE_KEY = "notifications";

export interface Notification {
	id: string;
	title: string;
	message: string;
	timestamp: Date;
	read: boolean;
	type: "info" | "success" | "warning" | "error";
}

interface NotificationsContextType {
	notifications: Notification[];
	unreadCount: number;
	addNotification: (
		notification: Omit<Notification, "id" | "timestamp" | "read">,
	) => void;
	markAsRead: (id: string) => void;
	markAllAsRead: () => void;
	removeNotification: (id: string) => void;
	clearAllNotifications: () => void;
}

const NotificationsContext = createContext<
	NotificationsContextType | undefined
>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
	const context = useContext(NotificationsContext);
	if (context === undefined) {
		throw new Error(
			"useNotifications must be used within a NotificationsProvider",
		);
	}
	return context;
};

export const NotificationsProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const hasLoadedNotifications = useRef(false);

	useEffect(() => {
		let isCancelled = false;

		const loadNotifications = async () => {
			try {
				const store = await Store.load(NOTIFICATIONS_STORE_PATH);
				const storedNotifications = await store.get<string>(
					NOTIFICATIONS_STORAGE_KEY,
				);
				if (!storedNotifications || isCancelled) {
					return;
				}

				const parsedNotifications = JSON.parse(storedNotifications) as Array<
					Omit<Notification, "timestamp"> & { timestamp: string }
				>;
				setNotifications(
					parsedNotifications.map((notification) => ({
						...notification,
						timestamp: new Date(notification.timestamp),
					})),
				);
			} catch (error) {
				console.error("Failed to load notifications:", error);
			} finally {
				hasLoadedNotifications.current = true;
			}
		};

		void loadNotifications();

		return () => {
			isCancelled = true;
		};
	}, []);

	// Calculate unread count
	const unreadCount = notifications.filter(
		(notification) => !notification.read,
	).length;

	useEffect(() => {
		if (!hasLoadedNotifications.current) {
			return;
		}

		const saveNotifications = async () => {
			try {
				const store = await Store.load(NOTIFICATIONS_STORE_PATH);
				await store.set(
					NOTIFICATIONS_STORAGE_KEY,
					JSON.stringify(notifications),
				);
				await store.save();
			} catch (error) {
				console.error("Failed to save notifications:", error);
			}
		};

		void saveNotifications();
	}, [notifications]);

	// Add a new notification
	const addNotification = (
		notification: Omit<Notification, "id" | "timestamp" | "read">,
	) => {
		const newNotification: Notification = {
			...notification,
			id: Date.now().toString(),
			timestamp: new Date(),
			read: false,
		};

		setNotifications((prev) => [newNotification, ...prev]);

		// Show a toast for the new notification
		toast({
			title: notification.title,
			description: notification.message,
			variant: notification.type === "error" ? "destructive" : "default",
		});
	};

	// Mark a notification as read
	const markAsRead = (id: string) => {
		setNotifications((prev) =>
			prev.map((notification) =>
				notification.id === id ? { ...notification, read: true } : notification,
			),
		);
	};

	// Mark all notifications as read
	const markAllAsRead = () => {
		setNotifications((prev) =>
			prev.map((notification) => ({ ...notification, read: true })),
		);
	};

	// Remove a notification
	const removeNotification = (id: string) => {
		setNotifications((prev) =>
			prev.filter((notification) => notification.id !== id),
		);
	};

	// Clear all notifications
	const clearAllNotifications = () => {
		setNotifications([]);
	};

	return (
		<NotificationsContext.Provider
			value={{
				notifications,
				unreadCount,
				addNotification,
				markAsRead,
				markAllAsRead,
				removeNotification,
				clearAllNotifications,
			}}
		>
			{children}
		</NotificationsContext.Provider>
	);
};
