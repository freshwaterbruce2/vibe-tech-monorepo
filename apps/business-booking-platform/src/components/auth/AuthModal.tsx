import React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
	isOpen: boolean;
	onClose: () => void;
	mode?: 'login' | 'register';
	initialMode?: 'login' | 'register';
	onSuccess?: () => void;
}

function getSubmitLabel(isLoading: boolean, authMode: 'login' | 'register') {
	if (isLoading) {
		return 'Loading...';
	}

	return authMode === 'login' ? 'Sign In' : 'Create Account';
}

export function AuthModal({
	isOpen,
	onClose,
	mode = 'login',
	initialMode,
	onSuccess,
}: AuthModalProps) {
	const [authMode, setAuthMode] = useState(initialMode || mode);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const { login, register } = useAuth();
	const submitLabel = getSubmitLabel(isLoading, authMode);

	if (!isOpen) {
return null;
}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			if (authMode === 'login') {
				await login(email, password);
			} else {
				await register(email, password, firstName, lastName);
			}
			onSuccess?.();
			toast.success(authMode === 'login' ? 'Signed in successfully!' : 'Account created successfully!');
			onClose();
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error('Authentication failed:', error);
			}
			toast.error('Authentication failed', {
				description: error instanceof Error ? error.message : 'Please check your credentials',
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-8 w-full max-w-md">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-2xl font-bold">
						{authMode === 'login' ? 'Sign In' : 'Create Account'}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700"
					>
						×
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					{authMode === 'register' && (
						<>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									First Name
								</label>
								<input
									type="text"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Last Name
								</label>
								<input
									type="text"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									required
								/>
							</div>
						</>
					)}

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Password
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
					>
						{submitLabel}
					</button>
				</form>

				<div className="mt-4 text-center">
					<button
						onClick={() =>
							setAuthMode(authMode === 'login' ? 'register' : 'login')
						}
						className="text-blue-600 hover:text-blue-700"
					>
						{authMode === 'login'
							? 'Need an account? Sign up'
							: 'Already have an account? Sign in'}
					</button>
				</div>
			</div>
		</div>
	);
}
