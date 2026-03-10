import {
	Award,
	Clock,
	Heart,
	LogIn,
	LogOut,
	Settings,
	User,
	UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { Button } from '../ui/Button';

export function UserMenu() {
	const { user, isAuthenticated, logout } = useAuth();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
	const [showDropdown, setShowDropdown] = useState(false);

	const handleSignIn = () => {
		setAuthMode('login');
		setShowAuthModal(true);
	};

	const handleSignUp = () => {
		setAuthMode('register');
		setShowAuthModal(true);
	};

	const handleAuthSuccess = () => {
		setShowAuthModal(false);
	};

	const handleLogout = () => {
		logout();
		setShowDropdown(false);
	};

	if (!isAuthenticated) {
		return (
			<>
				<div className="flex items-center space-x-2">
					{/* Member Rewards Button - Marriott/Hilton style */}
					<Button
						variant="ghost"
						size="sm"
						onClick={handleSignUp}
						className="hidden md:flex items-center gap-2 text-amber-600 hover:text-amber-700"
					>
						<Award className="h-4 w-4" />
						<span className="font-semibold">Join Rewards</span>
					</Button>

					<Button variant="ghost" size="sm" onClick={handleSignUp}>
						<UserPlus className="h-4 w-4 mr-2" />
						Sign Up
					</Button>
					<Button variant="outline" size="sm" onClick={handleSignIn}>
						<LogIn className="h-4 w-4 mr-2" />
						Sign In
					</Button>
				</div>

				{/* Auth Modal */}
				<AuthModal
					isOpen={showAuthModal}
					onClose={() => setShowAuthModal(false)}
					initialMode={authMode}
					onSuccess={handleAuthSuccess}
				/>
			</>
		);
	}

	// Authenticated user menu
	return (
		<div className="relative">
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setShowDropdown(!showDropdown)}
				className="relative"
			>
				<User className="h-4 w-4" />
				{/* Online indicator */}
				<div className="absolute top-0 right-0 h-2 w-2 bg-green-500 rounded-full ring-1 ring-white"></div>
			</Button>

			{/* Dropdown Menu */}
			{showDropdown && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-10"
						onClick={() => setShowDropdown(false)}
					/>

					{/* Menu */}
					<div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-luxury-lg border border-gray-200 z-20">
						{/* User Info */}
						<div className="px-4 py-3 border-b border-gray-200">
							<div className="flex items-center space-x-3">
								<div className="h-10 w-10 bg-gradient-to-r from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-white font-semibold">
									{user?.firstName?.[0]}
									{user?.lastName?.[0]}
								</div>
								<div>
									<p className="text-sm font-medium text-gray-900">
										{user?.firstName} {user?.lastName}
									</p>
									<p className="text-xs text-gray-500">{user?.email}</p>
								</div>
							</div>
						</div>

						{/* Menu Items */}
						<div className="py-2">
							<Link
								to="/profile"
								className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
								onClick={() => setShowDropdown(false)}
							>
								<User className="h-4 w-4 mr-3 text-gray-400" />
								My Profile
							</Link>

							<Link
								to="/my-bookings"
								className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
								onClick={() => setShowDropdown(false)}
							>
								<Clock className="h-4 w-4 mr-3 text-gray-400" />
								My Bookings
							</Link>

							<button
								className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
								onClick={() => console.log('Favorites clicked')}
							>
								<Heart className="h-4 w-4 mr-3 text-gray-400" />
								Favorites
							</button>

							<button
								className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
								onClick={() => console.log('Rewards clicked')}
							>
								<Award className="h-4 w-4 mr-3 text-gray-400" />
								Rewards Program
							</button>

							<button
								className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
								onClick={() => console.log('Settings clicked')}
							>
								<Settings className="h-4 w-4 mr-3 text-gray-400" />
								Settings
							</button>

							{/* Divider */}
							<div className="border-t border-gray-200 my-2"></div>

							<button
								className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
								onClick={handleLogout}
							>
								<LogOut className="h-4 w-4 mr-3 text-red-400" />
								Sign Out
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
