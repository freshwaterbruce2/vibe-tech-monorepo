import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastIcon,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from "./toast";
import { useToast } from "../hooks/use-toast";

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider>
			{toasts.map(function ({ id, title, description, action, variant, ...props }) {
				return (
					<Toast key={id} {...props} variant={variant ?? undefined}>
						<div className="grid gap-1">
							<div className="flex items-center gap-2">
								<ToastIcon variant={variant ?? undefined} />
								{title && <ToastTitle>{title}</ToastTitle>}
							</div>
							{description && (
								<ToastDescription>{description}</ToastDescription>
							)}
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}
