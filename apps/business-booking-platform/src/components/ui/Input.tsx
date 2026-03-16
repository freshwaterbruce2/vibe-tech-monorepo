import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
	variant?: 'default' | 'outline' | 'filled';
	size?: 'sm' | 'md' | 'lg';
	label?: string;
	error?: string;
	hint?: string;
}

function getDescribedBy(
	inputId: string,
	error?: string,
	hint?: string,
) {
	if (error) {
		return `${inputId}-error`;
	}

	if (hint) {
		return `${inputId}-hint`;
	}

	return undefined;
}

export const inputVariants = {
	base: 'flex w-full rounded-md border bg-background text-foreground px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
	variants: {
		default: 'border-input',
		outline: 'border-gray-300 focus:border-primary-500',
		filled:
			'bg-gray-50 border-transparent focus:bg-white focus:border-primary-500',
	},
	sizes: {
		sm: 'h-8 px-2 text-xs',
		md: 'h-10 px-3 text-sm',
		lg: 'h-12 px-4 text-base',
	},
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			className,
			variant = 'default',
			size = 'md',
			type,
			label,
			error,
			hint,
			id,
			name,
			...props
		},
		ref,
	) => {
		// Generate a unique ID if not provided
		const generatedId = useId();
		const inputId = id || generatedId;
		const inputName = name || inputId;
		const describedBy = getDescribedBy(inputId, error, hint);

		if (label) {
			return (
				<div className="space-y-1">
					<label
						htmlFor={inputId}
						className="text-sm font-medium text-foreground"
					>
						{label}
						{props.required && <span className="text-red-500 ml-1">*</span>}
					</label>
					<input
						id={inputId}
						name={inputName}
						type={type}
						className={cn(
							inputVariants.base,
							inputVariants.variants[variant],
							inputVariants.sizes[size],
							error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
							className,
						)}
						ref={ref}
						aria-invalid={!!error}
						aria-describedby={describedBy}
						{...props}
					/>
					{error && (
						<p id={`${inputId}-error`} className="text-sm text-red-500 mt-1">
							{error}
						</p>
					)}
					{hint && !error && (
						<p id={`${inputId}-hint`} className="text-sm text-gray-500 mt-1">
							{hint}
						</p>
					)}
				</div>
			);
		}

		return (
			<>
				<input
					id={inputId}
					name={inputName}
					type={type}
					className={cn(
						inputVariants.base,
						inputVariants.variants[variant],
						inputVariants.sizes[size],
						error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
						className,
					)}
					ref={ref}
					aria-invalid={!!error}
					aria-describedby={describedBy}
					{...props}
				/>
				{error && (
					<p id={`${inputId}-error`} className="text-sm text-red-500 mt-1">
						{error}
					</p>
				)}
				{hint && !error && (
					<p id={`${inputId}-hint`} className="text-sm text-gray-500 mt-1">
						{hint}
					</p>
				)}
			</>
		);
	},
);

Input.displayName = 'Input';
