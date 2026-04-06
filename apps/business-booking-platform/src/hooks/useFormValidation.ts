import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ZodType } from 'zod';

// Common validation schemas
export const commonSchemas = {
	email: z.string().email('Please enter a valid email address'),
	phone: z
		.string()
		.min(10, 'Phone number must be at least 10 digits')
		.regex(/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number'),
	required: (fieldName: string) =>
		z.string().min(1, `${fieldName} is required`),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	date: z.string().refine((date) => {
		const parsedDate = new Date(date);
		return !isNaN(parsedDate.getTime()) && parsedDate > new Date();
	}, 'Please select a valid future date'),
	creditCard: z
		.string()
		.regex(
			/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/,
			'Please enter a valid credit card number',
		),
	cvv: z.string().regex(/^\d{3,4}$/, 'Please enter a valid CVV'),
	expiry: z
		.string()
		.regex(
			/^(0[1-9]|1[0-2])\/\d{2}$/,
			'Please enter expiry date in MM/YY format',
		),
};

// Guest details validation schema
export const guestDetailsSchema = z.object({
	firstName: commonSchemas.required('First name'),
	lastName: commonSchemas.required('Last name'),
	email: commonSchemas.email,
	phone: commonSchemas.phone,
	adults: z
		.number()
		.min(1, 'At least 1 adult is required')
		.max(10, 'Maximum 10 adults allowed'),
	children: z.number().min(0).max(8, 'Maximum 8 children allowed'),
	specialRequests: z.string().optional(),
});

export type GuestDetailsFormData = z.infer<typeof guestDetailsSchema>;

// Payment validation schema
export const paymentSchema = z.object({
	cardholderName: commonSchemas.required('Cardholder name'),
	cardNumber: commonSchemas.creditCard,
	expiryDate: commonSchemas.expiry,
	cvv: commonSchemas.cvv,
	billingAddress: z.object({
		street: commonSchemas.required('Street address'),
		city: commonSchemas.required('City'),
		state: z.string().optional(),
		zipCode: commonSchemas.required('ZIP code'),
		country: commonSchemas.required('Country'),
	}),
	saveCard: z.boolean().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// Search validation schema
export const searchSchema = z
	.object({
		destination: commonSchemas.required('Destination'),
		checkIn: commonSchemas.date,
		checkOut: commonSchemas.date,
		adults: z.number().min(1, 'At least 1 adult is required').max(10),
		children: z.number().min(0).max(8),
		rooms: z.number().min(1, 'At least 1 room is required').max(5),
	})
	.refine(
		(data) => {
			const checkIn = new Date(data.checkIn);
			const checkOut = new Date(data.checkOut);
			return checkOut > checkIn;
		},
		{
			message: 'Check-out date must be after check-in date',
			path: ['checkOut'],
		},
	);

export type SearchFormData = z.infer<typeof searchSchema>;

// Generic form validation hook
export function useFormValidation<T extends FieldValues>(
	schema: ZodType<T, FieldValues>,
	options?: {
		onSubmit?: (data: T) => Promise<void> | void;
		onError?: (errors: unknown) => void;
		showToastOnError?: boolean;
		mode?: 'onChange' | 'onBlur' | 'onSubmit';
	},
) {
	const form = useForm<T>({
		resolver: zodResolver(schema) as any,
		mode: options?.mode || 'onBlur',
	});

	const submitWithValidation = useCallback(
		(onValidSubmit: (data: T) => Promise<void> | void) =>
			form.handleSubmit(
				async (data) => {
					try {
						await onValidSubmit(data as T);
					} catch (error) {
						if (import.meta.env.DEV) {
						console.error('Form submission error:', error);
						}
						if (options?.showToastOnError !== false) {
							toast.error('Submission Failed', {
								description:
									error instanceof Error
										? error.message
										: 'An unexpected error occurred',
							});
						}
						options?.onError?.(error);
					}
				},
				(errors) => {
					if (import.meta.env.DEV) {
						// eslint-disable-next-line no-console
					console.log('Form validation errors:', errors);
					}
					if (options?.showToastOnError !== false) {
						const firstError = Object.values(errors)[0]?.message;
						if (firstError) {
							toast.error('Validation Error', {
								description: firstError as string,
							});
						}
					}
					options?.onError?.(errors);
				},
			),
		[form, options],
	);

	const validateField = useCallback(
		async (fieldName: Path<T>): Promise<boolean> => {
			const result = await form.trigger(fieldName);
			return result;
		},
		[form],
	);

	const getFieldError = useCallback(
		(fieldName: Path<T>): string | undefined => {
			const error = form.formState.errors[fieldName];
			return error?.message as string | undefined;
		},
		[form.formState.errors],
	);

	const hasError = useCallback(
		(fieldName: Path<T>): boolean => {
			return !!form.formState.errors[fieldName];
		},
		[form.formState.errors],
	);

	return {
		...form,
		submitWithValidation,
		validateField,
		getFieldError,
		hasError,
	};
}

// Specialized hooks for different forms

export function useGuestDetailsValidation(options?: {
	onSubmit?: (data: GuestDetailsFormData) => Promise<void> | void;
	onError?: (errors: unknown) => void;
}) {
	return useFormValidation(guestDetailsSchema, {
		...options,
		mode: 'onBlur',
	});
}

export function usePaymentValidation(options?: {
	onSubmit?: (data: PaymentFormData) => Promise<void> | void;
	onError?: (errors: unknown) => void;
}) {
	const form = useFormValidation(paymentSchema, {
		...options,
		mode: 'onBlur',
	});

	// Format card number as user types
	const formatCardNumber = useCallback((value: string) => {
		const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
		const matches = v.match(/\d{4,16}/g);
		const match = (matches && matches[0]) || '';
		const parts = [];
		for (let i = 0, len = match.length; i < len; i += 4) {
			parts.push(match.substring(i, i + 4));
		}
		if (parts.length) {
			return parts.join(' ');
		} else {
			return v;
		}
	}, []);

	// Format expiry date as user types
	const formatExpiry = useCallback((value: string) => {
		return value
			.replace(/\D/g, '')
			.replace(/(\d{2})(\d)/, '$1/$2')
			.substr(0, 5);
	}, []);

	return {
		...form,
		formatCardNumber,
		formatExpiry,
	};
}

export function useSearchValidation(options?: {
	onSubmit?: (data: SearchFormData) => Promise<void> | void;
	onError?: (errors: unknown) => void;
}) {
	return useFormValidation(searchSchema, {
		...options,
		mode: 'onChange',
	});
}

// Hook for real-time validation feedback
export function getValidationFeedback<T extends FieldValues>(
	form: UseFormReturn<T>,
	fieldName: Path<T>,
) {
	const error = form.formState.errors[fieldName];
	const isDirty = (
		form.formState.dirtyFields as Record<string, boolean>
	)[fieldName];
	const isValid = !error && isDirty;

	return {
		error: error?.message as string | undefined,
		isValid,
		isDirty,
		showError: !!error && isDirty,
		showSuccess: isValid,
		'aria-invalid': !!error,
		'aria-describedby': error ? `${String(fieldName)}-error` : undefined,
	};
}

function getFieldClassName(validation: {
	showError?: boolean;
	showSuccess?: boolean;
}): string {
	if (validation.showError) {
		return 'border-red-500 focus:border-red-500 focus:ring-red-500';
	}
	if (validation.showSuccess) {
		return 'border-green-500 focus:border-green-500 focus:ring-green-500';
	}
	return '';
}

// Utility function for form field props
export function getFormFieldProps<T extends FieldValues>(
	form: UseFormReturn<T>,
	fieldName: Path<T>,
	options?: {
		required?: boolean;
		placeholder?: string;
		type?: string;
	},
) {
	const validation = getValidationFeedback(form, fieldName);

	return {
		...form.register(fieldName),
		...validation,
		required: options?.required,
		placeholder: options?.placeholder,
		type: options?.type || 'text',
		className: getFieldClassName(validation),
	};
}

// Backward-compatible alias for older imports.
export const useValidationFeedback = getValidationFeedback;

export default useFormValidation;
