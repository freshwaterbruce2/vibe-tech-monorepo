/**
 * Nova Agent Button — extends @vibetech/ui Button with app-specific variants.
 *
 * This file re-exports the shared Button and adds Nova-themed variants
 * (gradients, glow effects) that are specific to the futuristic dark UI.
 * All base functionality (isLoading, icon, asChild) comes from the shared lib.
 */
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white shadow-lg hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:translate-y-[-1px]",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border border-white/10 bg-transparent hover:bg-white/5 hover:border-white/20 text-foreground",
				secondary:
					"bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]",
				ghost: "hover:bg-white/5 text-gray-400 hover:text-white",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-md px-3",
				lg: "h-11 rounded-md px-8",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	isLoading?: boolean;
	icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			isLoading,
			icon,
			children,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				disabled={props.disabled === true || isLoading}
				{...props}
			>
				{isLoading && <Loader2 className="animate-spin" />}
				{!isLoading && icon && (
					<span className="flex items-center">{icon}</span>
				)}
				{children}
			</Comp>
		);
	},
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
