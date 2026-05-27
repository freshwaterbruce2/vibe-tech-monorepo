import React from "react";

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ label, error, hint, id, className, ...props }, ref) => {
		const inputId = id ?? props.name;
		return (
			<div className="ui-field">
				{label ? (
					<label className="ui-label" htmlFor={inputId}>
						{label}
					</label>
				) : null}
				<input
					ref={ref}
					id={inputId}
					className={["ui-input", error ? "ui-input--error" : "", className]
						.filter(Boolean)
						.join(" ")}
					aria-invalid={Boolean(error) || undefined}
					aria-describedby={
						error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
					}
					{...props}
				/>
				{hint && !error ? (
					<div className="ui-hint" id={`${inputId}-hint`}>
						{hint}
					</div>
				) : null}
				{error ? (
					<div className="ui-error" id={`${inputId}-error`}>
						{error}
					</div>
				) : null}
			</div>
		);
	},
);

Input.displayName = "Input";

export default Input;
