import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "../stores/toastStore";

const TOAST_ICONS = {
	success: "✅",
	error: "❌",
	info: "ℹ️",
	warning: "⚠️",
};

const TOAST_COLORS = {
	success: "border-green-primary bg-green-primary/20 text-green-primary",
	error: "border-red-500 bg-red-500/20 text-red-400",
	info: "border-blue-primary bg-blue-primary/20 text-blue-primary",
	warning: "border-yellow-500 bg-yellow-500/20 text-yellow-500",
};

export default function ToastContainer() {
	const { toasts, removeToast } = useToastStore();

	return (
		<div className="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-4">
			<AnimatePresence>
				{toasts.map((toast) => (
					<motion.div
						key={toast.id}
						initial={{ opacity: 0, y: 50, scale: 0.8 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
						className="pointer-events-auto w-full max-w-md"
					>
						<div
							className={`flex items-center gap-3 rounded-lg border-2 p-4 shadow-lg backdrop-blur ${TOAST_COLORS[toast.type]}`}
						>
							<span className="text-2xl">{TOAST_ICONS[toast.type]}</span>
							<p className="flex-1 font-medium">{toast.message}</p>
							<button
								onClick={() => removeToast(toast.id)}
								className="text-xl opacity-60 transition-opacity hover:opacity-100"
							>
								×
							</button>
						</div>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}
