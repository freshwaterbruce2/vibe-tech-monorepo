import {
	Award,
	Calendar,
	DollarSign,
	Globe,
	Heart,
	Hotel,
	MapPin,
	Menu,
	Phone,
	Search,
	Shield,
	Sparkles,
	Star,
	TrendingUp,
	Users,
	X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserMenu } from './UserMenu';

export function LuxuryHeader() {
	const location = useLocation();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [hoveredNav, setHoveredNav] = useState<string | null>(null);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const navItems = [
		{
			href: '/',
			label: 'Hotels',
			icon: Hotel,
			description: 'Luxury stays worldwide',
		},
		{
			href: '/destinations',
			label: 'Destinations',
			icon: MapPin,
			description: 'Explore the world',
		},
		{
			href: '/deals',
			label: 'Exclusive Deals',
			icon: TrendingUp,
			description: 'Members save 20%',
			highlight: true,
		},
		{
			href: '/experiences',
			label: 'Experiences',
			icon: Sparkles,
			description: 'Curated adventures',
		},
	];

	return (
		<>
			{/* Top Info Bar */}
			<div className="hidden lg:block bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-2 text-sm">
				<div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<Shield className="w-3 h-3 text-emerald-400" />
							<span>Free Cancellation on 90% of bookings</span>
						</div>
						<div className="flex items-center gap-2">
							<Star className="w-3 h-3 text-yellow-400" />
							<span>Best Price Guarantee</span>
						</div>
					</div>
					<div className="flex items-center gap-6">
						<button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
							<Phone className="w-3 h-3" />
							<span>24/7 Support</span>
						</button>
						<button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
							<Globe className="w-3 h-3" />
							<span>English</span>
						</button>
						<button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
							<DollarSign className="w-3 h-3" />
							<span>USD</span>
						</button>
					</div>
				</div>
			</div>

			{/* Main Header */}
			<header
				className={`
        sticky top-0 z-50 transition-all duration-500
        ${
					isScrolled
						? 'bg-white/95 backdrop-blur-xl shadow-luxury-lg border-b border-slate-200/50'
						: 'bg-white/70 backdrop-blur-md'
				}
      `}
			>
				<div className="max-w-7xl mx-auto">
					<div className="flex items-center justify-between px-4 py-4">
						{/* Logo Section */}
						<Link to="/" className="flex items-center gap-3 group">
							<div className="relative">
								<div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-2 rounded-xl">
									<Hotel className="w-8 h-8 text-white" />
								</div>
							</div>
							<div>
								<h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
									Vibe Luxury
								</h1>
								<p className="text-xs text-slate-500">
									Premium Hotel Collection
								</p>
							</div>
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden lg:flex items-center gap-2">
							{navItems.map((item) => {
								const Icon = item.icon;
								return (
									<div
										key={item.href}
										className="relative"
										onMouseEnter={() => setHoveredNav(item.href)}
										onMouseLeave={() => setHoveredNav(null)}
									>
										<Link
											to={item.href}
											className={`
                        flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
                        ${
													location.pathname === item.href
														? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg'
														: item.highlight
															? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 hover:to-orange-100'
															: 'hover:bg-slate-100 text-slate-700'
												}
                      `}
										>
											<Icon className="w-4 h-4" />
											<span className="font-medium">{item.label}</span>
											{item.highlight && (
												<span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
													HOT
												</span>
											)}
										</Link>

										{/* Hover Tooltip */}
										{hoveredNav === item.href && (
											<div className="absolute top-full left-0 mt-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap opacity-0 animate-fadeIn">
												{item.description}
												<div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45" />
											</div>
										)}
									</div>
								);
							})}
						</nav>

						{/* Right Section */}
						<div className="flex items-center gap-3">
							{/* Quick Search */}
							<div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
								<Search className="w-4 h-4 text-slate-400" />
								<input
									type="text"
									placeholder="Where to next?"
									className="bg-transparent outline-none text-sm w-40 placeholder-slate-400"
								/>
							</div>

							{/* Currency & Language (Desktop) */}
							<div className="hidden lg:flex items-center gap-1">
								<button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
									<Globe className="w-4 h-4 text-slate-600" />
								</button>
								<button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
									<DollarSign className="w-4 h-4 text-slate-600" />
								</button>
							</div>

							{/* Favorites */}
							<button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors group">
								<Heart className="w-5 h-5 text-slate-600 group-hover:text-red-500 transition-colors" />
								<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
									3
								</span>
							</button>

							{/* Premium Member Badge */}
							<Link
								to="/rewards"
								className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
							>
								<Award className="w-4 h-4" />
								<span className="font-semibold text-sm">Elite Rewards</span>
							</Link>

							{/* User Menu */}
							<UserMenu />

							{/* Mobile Menu Toggle */}
							<button
								onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
								className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
							>
								{isMobileMenuOpen ? (
									<X className="w-6 h-6 text-slate-700" />
								) : (
									<Menu className="w-6 h-6 text-slate-700" />
								)}
							</button>
						</div>
					</div>

					{/* Quick Booking Bar (Desktop) */}
					<div
						className={`
            hidden lg:block border-t border-slate-200/50 transition-all duration-500
            ${isScrolled ? 'h-0 overflow-hidden opacity-0' : 'h-16 opacity-100'}
          `}
					>
						<div className="px-4 py-3 flex items-center gap-4">
							<div className="flex items-center gap-2 text-sm text-slate-600">
								<MapPin className="w-4 h-4" />
								<span>Where:</span>
								<input
									type="text"
									placeholder="City or Hotel"
									className="px-2 py-1 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 w-40"
								/>
							</div>
							<div className="w-px h-6 bg-slate-300" />
							<div className="flex items-center gap-2 text-sm text-slate-600">
								<Calendar className="w-4 h-4" />
								<span>Check-in:</span>
								<input
									type="date"
									className="px-2 py-1 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
								/>
							</div>
							<div className="w-px h-6 bg-slate-300" />
							<div className="flex items-center gap-2 text-sm text-slate-600">
								<Calendar className="w-4 h-4" />
								<span>Check-out:</span>
								<input
									type="date"
									className="px-2 py-1 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
								/>
							</div>
							<div className="w-px h-6 bg-slate-300" />
							<div className="flex items-center gap-2 text-sm text-slate-600">
								<Users className="w-4 h-4" />
								<select className="px-2 py-1 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400">
									<option>2 Guests, 1 Room</option>
									<option>1 Guest, 1 Room</option>
									<option>3 Guests, 1 Room</option>
									<option>4 Guests, 2 Rooms</option>
								</select>
							</div>
							<button className="ml-auto px-6 py-2 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all duration-300 font-semibold text-sm">
								Search Hotels
							</button>
						</div>
					</div>
				</div>

				{/* Mobile Menu */}
				{isMobileMenuOpen && (
					<div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl shadow-xl border-t border-slate-200">
						<nav className="p-4 space-y-2">
							{navItems.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.href}
										to={item.href}
										onClick={() => setIsMobileMenuOpen(false)}
										className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${
												location.pathname === item.href
													? 'bg-slate-800 text-white'
													: 'hover:bg-slate-100 text-slate-700'
											}
                    `}
									>
										<Icon className="w-5 h-5" />
										<div>
											<div className="font-medium">{item.label}</div>
											<div className="text-xs opacity-70">
												{item.description}
											</div>
										</div>
										{item.highlight && (
											<span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
												HOT
											</span>
										)}
									</Link>
								);
							})}
						</nav>
					</div>
				)}
			</header>

			<style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
		</>
	);
}
