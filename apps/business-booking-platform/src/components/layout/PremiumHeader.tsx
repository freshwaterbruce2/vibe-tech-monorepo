import { ChevronDown, Globe, Menu, Phone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PersistentSearchBar } from '../search/PersistentSearchBar';

export function PremiumHeader() {
	const location = useLocation();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Clean, industry-standard navigation items (max 7 as per best practices)
	const navItems = [
		{ href: '/destinations', label: 'DESTINATIONS' },
		{ href: '/deals', label: 'OFFERS' },
		{ href: '/experiences', label: 'EXPERIENCES' },
		{ href: '/rewards', label: 'REWARDS' },
	];

	return (
		<>
			{/* Utility Bar - Following Marriott/Hilton Pattern */}
			<div className="hidden lg:block bg-gray-900 text-white text-xs">
				<div className="max-w-screen-2xl mx-auto px-6">
					<div className="flex items-center justify-between h-9">
						{/* Left: Contact */}
						<div className="flex items-center gap-6">
							<a
								href="tel:1-800-LUXURY"
								className="flex items-center gap-1.5 hover:text-gray-300 transition-colors"
							>
								<Phone className="w-3 h-3" />
								<span>1-800-LUXURY</span>
							</a>
							<span className="text-gray-500">|</span>
							<a href="#" className="hover:text-gray-300 transition-colors">
								Customer Support
							</a>
						</div>

						{/* Right: Language & Currency */}
						<div className="flex items-center gap-4">
							<button className="flex items-center gap-1.5 hover:text-gray-300 transition-colors">
								<Globe className="w-3 h-3" />
								<span>English</span>
								<ChevronDown className="w-3 h-3" />
							</button>
							<span className="text-gray-500">|</span>
							<button className="hover:text-gray-300 transition-colors">
								USD
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Main Header - Clean, Minimal Following Four Seasons/Mandarin Oriental Style */}
			<header
				className={`
          sticky top-0 z-50 bg-white transition-all duration-300
          ${isScrolled ? 'shadow-md' : 'border-b border-gray-200'}
        `}
			>
				<div className="max-w-screen-2xl mx-auto px-6">
					<div className="flex items-center justify-between h-20">
						{/* Logo - VIBE HOTELS with Neon Luxury Branding */}
						<Link to="/" className="flex items-center group vh-logo-container">
							{/* VH Monogram - Luxury Hotel Version */}
							<div className="relative mr-4 sm:mr-5">
								{/* 3D Shadow Layer */}
								<div className="vh-3d-shadow vh-neon-logo text-4xl sm:text-5xl">
									VH
								</div>
								{/* Main Logo */}
								<div className="vh-neon-logo text-4xl sm:text-5xl relative z-10">
									VH
								</div>
								{/* Animated Neon Glow */}
								<div className="vh-neon-glow vh-neon-logo text-4xl sm:text-5xl">
									VH
								</div>
							</div>

							{/* VIBE HOTELS Brand Identity */}
							<div className="flex flex-col">
								{/* Main Brand Name */}
								<div className="vh-luxury-border">
									<span className="vh-brand-gradient text-2xl sm:text-3xl font-black tracking-tight">
										VIBE HOTELS
									</span>
								</div>
								{/* Luxury Tagline */}
								<div className="vh-luxury-text text-xs sm:text-sm mt-1">
									Experience Elevated
								</div>
							</div>
						</Link>

						{/* Center Navigation - Desktop */}
						<nav className="hidden lg:flex items-center gap-10">
							{navItems.map((item) => (
								<Link
									key={item.href}
									to={item.href}
									className={`
                    text-xs font-medium tracking-wider transition-colors duration-200
                    ${
											location.pathname === item.href
												? 'text-gray-900 border-b-2 border-gray-900 pb-1'
												: 'text-gray-700 hover:text-gray-900'
										}
                  `}
								>
									{item.label}
								</Link>
							))}
						</nav>

						{/* Right Actions */}
						<div className="flex items-center gap-5">
							{/* Sign In / Join - Industry Standard */}
							<div className="hidden lg:flex items-center gap-4">
								<Link
									to="/signin"
									className="text-xs font-medium tracking-wider text-gray-700 hover:text-gray-900 transition-colors"
								>
									SIGN IN
								</Link>
								<span className="text-gray-300">|</span>
								<Link
									to="/join"
									className="text-xs font-medium tracking-wider text-gray-700 hover:text-gray-900 transition-colors"
								>
									JOIN
								</Link>
							</div>

							{/* Book Now CTA - Premium Style */}
							<Link
								to="/search"
								className="hidden lg:block px-6 py-3 bg-gray-900 text-white text-xs font-medium tracking-wider hover:bg-gray-800 transition-colors"
							>
								BOOK NOW
							</Link>

							{/* Mobile Menu Toggle */}
							<button
								onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
								className="lg:hidden p-2"
								aria-label="Menu"
							>
								{isMobileMenuOpen ? (
									<X className="w-6 h-6 text-gray-700" />
								) : (
									<Menu className="w-6 h-6 text-gray-700" />
								)}
							</button>
						</div>
					</div>
				</div>

				{/* Persistent Search Bar - Always Visible for Accessibility */}
				<div className="border-t border-gray-200">
					<div className="max-w-screen-2xl mx-auto px-6 py-4">
						<PersistentSearchBar className="w-full" />
					</div>
				</div>

				{/* Mobile Menu - Clean Slide Panel */}
				{isMobileMenuOpen && (
					<div
						className="lg:hidden fixed inset-0 z-50 bg-black/50"
						onClick={() => setIsMobileMenuOpen(false)}
					>
						<div
							className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Mobile Menu Header */}
							<div className="flex items-center justify-between p-6 border-b border-gray-200">
								<span className="text-lg font-light tracking-wider">MENU</span>
								<button
									onClick={() => setIsMobileMenuOpen(false)}
									className="p-2"
								>
									<X className="w-5 h-5 text-gray-700" />
								</button>
							</div>

							{/* Mobile Navigation */}
							<nav className="p-6">
								<div className="space-y-6">
									{navItems.map((item) => (
										<Link
											key={item.href}
											to={item.href}
											onClick={() => setIsMobileMenuOpen(false)}
											className={`
                        block text-sm font-medium tracking-wider transition-colors
                        ${
													location.pathname === item.href
														? 'text-gray-900'
														: 'text-gray-700'
												}
                      `}
										>
											{item.label}
										</Link>
									))}
								</div>

								{/* Mobile Actions */}
								<div className="mt-8 pt-8 border-t border-gray-200 space-y-4">
									<Link
										to="/signin"
										onClick={() => setIsMobileMenuOpen(false)}
										className="block text-sm font-medium tracking-wider text-gray-700"
									>
										SIGN IN
									</Link>
									<Link
										to="/join"
										onClick={() => setIsMobileMenuOpen(false)}
										className="block text-sm font-medium tracking-wider text-gray-700"
									>
										JOIN REWARDS
									</Link>
									<Link
										to="/search"
										onClick={() => setIsMobileMenuOpen(false)}
										className="block w-full px-6 py-3 bg-gray-900 text-white text-sm font-medium tracking-wider text-center"
									>
										BOOK NOW
									</Link>
								</div>

								{/* Mobile Contact */}
								<div className="mt-8 pt-8 border-t border-gray-200">
									<a
										href="tel:1-800-LUXURY"
										className="flex items-center gap-2 text-sm text-gray-700"
									>
										<Phone className="w-4 h-4" />
										<span>1-800-LUXURY</span>
									</a>
								</div>
							</nav>
						</div>
					</div>
				)}
			</header>
		</>
	);
}
