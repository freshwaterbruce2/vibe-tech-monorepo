import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
}

const getButtonClassName = (variant: ButtonVariant, size: ButtonSize) => {
	const classes = ["ui-btn", `ui-btn--${variant}`, `ui-btn--${size}`];
	return classes.join(" ");
};

const Button = ({
	variant = "primary",
	size = "md",
	loading = false,
	className,
	disabled,
	children,
	...props
}: ButtonProps) => {
	return (
		<button
			className={[getButtonClassName(variant, size), className]
				.filter(Boolean)
				.join(" ")}
			disabled={disabled === true || loading}
			{...props}
		>
			{loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
			<span className="ui-btn__label">{children}</span>
		</button>
	);
};

export default Button;
