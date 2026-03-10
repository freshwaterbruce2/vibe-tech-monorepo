import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number;
}

interface ToastStore {
	toasts: Toast[];
	addToast: (toast: Omit<Toast, "id">) => void;
	removeToast: (id: string) => void;
	clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
	toasts: [],

	addToast: (toast) => {
		const id = Math.random().toString(36).substring(2, 9);
		const newToast: Toast = { ...toast, id };

		set((state) => ({
			toasts: [...state.toasts, newToast],
		}));

		// Auto-remove after duration (default 3 seconds)
		const duration = toast.duration ?? 3000;
		if (duration > 0) {
			setTimeout(() => {
				set((state) => ({
					toasts: state.toasts.filter((t) => t.id !== id),
				}));
			}, duration);
		}
	},

	removeToast: (id) =>
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		})),

	clearAll: () => set({ toasts: [] }),
}));

// Helper functions for common toast types
export const toast = {
	success: (message: string, duration?: number) =>
		useToastStore.getState().addToast({ type: "success", message, duration }),

	error: (message: string, duration?: number) =>
		useToastStore.getState().addToast({ type: "error", message, duration }),

	info: (message: string, duration?: number) =>
		useToastStore.getState().addToast({ type: "info", message, duration }),

	warning: (message: string, duration?: number) =>
		useToastStore.getState().addToast({ type: "warning", message, duration }),
};
