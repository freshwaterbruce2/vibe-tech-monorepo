import { AlertTriangle } from "lucide-react";
import type { KeyboardEvent } from "react";

interface ConfirmationDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
	danger?: boolean;
}

export function ConfirmationDialog({
	isOpen,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
	danger = false,
}: ConfirmationDialogProps) {
	if (!isOpen) return null;

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape") {
			e.preventDefault();
			onCancel();
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			onKeyDown={handleKeyDown}
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				onClick={onCancel}
				aria-hidden="true"
			/>

			{/* Modal */}
			<div
				className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialog-title"
				aria-describedby="dialog-description"
			>
				{/* Icon */}
				{danger && (
					<div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 mb-4">
						<AlertTriangle size={24} className="text-red-400" />
					</div>
				)}

				{/* Title */}
				<h3 id="dialog-title" className="text-xl font-bold mb-2">
					{title}
				</h3>

				{/* Message */}
				<p id="dialog-description" className="text-slate-300 text-sm mb-6">
					{message}
				</p>

				{/* Actions */}
				<div className="flex gap-3">
					<button
						onClick={onCancel}
						onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
							if (e.key === "Escape") {
								e.preventDefault();
								onCancel();
							}
						}}
						className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all font-medium"
						type="button"
						aria-label={cancelText}
					>
						{cancelText}
					</button>
					<button
						onClick={onConfirm}
						onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onConfirm();
							}
						}}
						className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
							danger
								? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
								: "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/30"
						}`}
						type="button"
						aria-label={confirmText}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}
