import {
	Award,
	Check,
	Gift,
	Lock,
	Mail,
	Percent,
	Star,
	User,
	X,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';

interface MemberLoginModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function MemberLoginModal({ isOpen, onClose }: MemberLoginModalProps) {
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');

	if (!isOpen) {
return null;
}

	const memberBenefits = [
		{
			icon: Percent,
			title: 'Exclusive Member Rates',
			desc: 'Save up to 15% on every stay',
		},
		{
			icon: Award,
			title: 'Elite Status Benefits',
			desc: 'Earn points and unlock perks',
		},
		{
			icon: Gift,
			title: 'Birthday Rewards',
			desc: 'Special offers on your special day',
		},
		{
			icon: Star,
			title: 'Priority Check-in',
			desc: 'Skip the line at 5000+ hotels',
		},
	];

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Handle login/signup
		if (import.meta.env.DEV) {
			console.log(isSignUp ? 'Sign up' : 'Sign in', { email, password, name });
		}
		toast.success(
			isSignUp ? 'Account created successfully!' : 'Signed in successfully!',
		);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/60 transition-opacity"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="relative min-h-screen flex items-center justify-center p-4">
				<div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden animate-fadeInUp">
					{/* Close Button */}
					<button
						onClick={onClose}
						className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
					>
						<X className="h-5 w-5 text-gray-500" />
					</button>

					<div className="grid lg:grid-cols-2">
						{/* Left Side - Benefits */}
						<div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 lg:p-12 text-white">
							<div className="mb-8">
								<h2 className="text-3xl font-bold mb-2">Vibe Rewards</h2>
								<p className="text-blue-100">
									Join millions of members enjoying exclusive benefits
								</p>
							</div>

							{/* Stats */}
							<div className="grid grid-cols-2 gap-4 mb-8">
								<div className="bg-white/10 backdrop-blur rounded-lg p-4">
									<div className="text-3xl font-bold">5%</div>
									<div className="text-sm text-blue-100">Instant Rewards</div>
								</div>
								<div className="bg-white/10 backdrop-blur rounded-lg p-4">
									<div className="text-3xl font-bold">50K+</div>
									<div className="text-sm text-blue-100">Hotels Worldwide</div>
								</div>
							</div>

							{/* Benefits List */}
							<div className="space-y-4">
								{memberBenefits.map((benefit) => {
									const Icon = benefit.icon;
									return (
										<div key={benefit.title} className="flex items-start gap-3">
											<div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
												<Icon className="h-5 w-5 text-white" />
											</div>
											<div>
												<h4 className="font-semibold text-white">
													{benefit.title}
												</h4>
												<p className="text-sm text-blue-100 mt-1">
													{benefit.desc}
												</p>
											</div>
										</div>
									);
								})}
							</div>

							{/* Trust Indicators */}
							<div className="mt-8 pt-8 border-t border-white/20">
								<div className="flex items-center gap-2 text-sm text-blue-100">
									<Check className="h-4 w-4" />
									<span>Free to join • No credit card required</span>
								</div>
							</div>
						</div>

						{/* Right Side - Form */}
						<div className="p-8 lg:p-12">
							<div className="mb-8">
								<h3 className="text-2xl font-bold text-gray-900 mb-2">
									{isSignUp ? 'Create Your Account' : 'Welcome Back'}
								</h3>
								<p className="text-gray-600">
									{isSignUp
										? 'Join today and start earning rewards'
										: 'Sign in to access your member benefits'}
								</p>
							</div>

							<form onSubmit={handleSubmit} className="space-y-5">
								{/* Name Field (Sign Up Only) */}
								{isSignUp && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Full Name
										</label>
										<div className="relative">
											<User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
											<input
												type="text"
												value={name}
												onChange={(e) => setName(e.target.value)}
												required={isSignUp}
												className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
												placeholder="John Doe"
											/>
										</div>
									</div>
								)}

								{/* Email Field */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Email Address
									</label>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
										<input
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											required
											className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
											placeholder="you@example.com"
										/>
									</div>
								</div>

								{/* Password Field */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Password
									</label>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
										<input
											type="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											required
											className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
											placeholder="••••••••"
										/>
									</div>
								</div>

								{/* Remember Me & Forgot Password */}
								{!isSignUp && (
									<div className="flex items-center justify-between">
										<label className="flex items-center">
											<input
												type="checkbox"
												className="mr-2 rounded border-gray-300"
											/>
											<span className="text-sm text-gray-600">Remember me</span>
										</label>
										<button
											type="button"
											className="text-sm text-blue-600 hover:underline"
										>
											Forgot password?
										</button>
									</div>
								)}

								{/* Terms (Sign Up Only) */}
								{isSignUp && (
									<div className="flex items-start">
										<input
											type="checkbox"
											required
											className="mt-1 mr-2 rounded border-gray-300"
										/>
										<label className="text-sm text-gray-600">
											I agree to the{' '}
											<a href="#" className="text-blue-600 hover:underline">
												Terms of Service
											</a>{' '}
											and{' '}
											<a href="#" className="text-blue-600 hover:underline">
												Privacy Policy
											</a>
										</label>
									</div>
								)}

								{/* Submit Button */}
								<Button
									type="submit"
									size="lg"
									className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 transition-all transform hover:scale-105"
								>
									{isSignUp ? 'Create Account' : 'Sign In'}
								</Button>

								{/* Social Login */}
								<div className="relative">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-gray-300"></div>
									</div>
									<div className="relative flex justify-center text-sm">
										<span className="px-4 bg-white text-gray-500">
											Or continue with
										</span>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<button
										type="button"
										className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
									>
										<span className="text-lg">G</span>
										<span className="text-sm font-medium">Google</span>
									</button>
									<button
										type="button"
										className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
									>
										<span className="text-lg">f</span>
										<span className="text-sm font-medium">Facebook</span>
									</button>
								</div>

								{/* Toggle Sign In/Up */}
								<div className="text-center text-sm">
									<span className="text-gray-600">
										{isSignUp
											? 'Already have an account?'
											: "Don't have an account?"}
									</span>{' '}
									<button
										type="button"
										onClick={() => setIsSignUp(!isSignUp)}
										className="text-blue-600 hover:underline font-semibold"
									>
										{isSignUp ? 'Sign In' : 'Sign Up'}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
