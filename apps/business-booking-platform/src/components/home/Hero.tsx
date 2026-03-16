import { Award, Clock, MapPin, Play, Shield, Star, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { NaturalLanguageInput } from '@/components/search/NaturalLanguageInput';
import { useHotelSearch } from '@/hooks/useHotelSearch';
import { useSearchStore } from '@/store/searchStore';
import { logger } from '@/utils/logger';
import { Button } from '../ui/Button';

export function Hero() {
	const navigate = useNavigate();
	const { setQuery, setDateRange } = useSearchStore();
	const { searchHotels } = useHotelSearch();
	const [destination, setDestination] = useState('');
	const [checkIn, setCheckIn] = useState('');
	const [checkOut, setCheckOut] = useState('');

	const handleSearch = () => {
		logger.info('Search initiated from hero section', {
			component: 'Hero',
			destination: destination.trim(),
			hasCheckIn: !!checkIn,
			hasCheckOut: !!checkOut,
		});

		if (destination.trim()) {
			setQuery(destination.trim());
			if (checkIn && checkOut) {
				setDateRange(checkIn, checkOut);
			}
			// Navigate first to ensure consistent behavior
			navigate('/search');
			// Then trigger search in the background
			searchHotels(destination.trim()).catch((error) => {
				logger.error('Hero search failed, user will see fallback results', {
					component: 'Hero',
					destination: destination.trim(),
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			});
		} else {
			logger.warn('Search attempted without destination', {
				component: 'Hero',
			});
			toast.error('Please enter a destination to search for hotels.');
		}
	};
	return (
		<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
			{/* Professional Video Background - Luxury Hotel Experience */}
			<div className="absolute inset-0">
				<video
					autoPlay
					muted
					loop
					playsInline
					className="absolute inset-0 w-full h-full object-cover"
					poster="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
				>
					<source
						src="https://player.vimeo.com/external/370467553.sd.mp4?s=c3a9caa58b9a45d2a21ba5c3be35c2a0dccae44a&profile_id=164&oauth2_token_id=57447761"
						type="video/mp4"
					/>
					{/* Premium fallback image */}
					<div
						className="absolute inset-0 bg-cover bg-center bg-no-repeat"
						style={{
							backgroundImage:
								"url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
						}}
					/>
				</video>
				<div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />
			</div>

			{/* Content */}
			<div className="relative z-10 container mx-auto px-4 text-center text-white">
				<div className="max-w-5xl mx-auto space-y-8">
					{/* Trust Badges */}
					<div className="flex justify-center items-center gap-6 text-sm text-white/80 mb-6">
						<div className="flex items-center gap-2">
							<Shield className="w-4 h-4" />
							<span>Secure Booking</span>
						</div>
						<div className="flex items-center gap-2">
							<Award className="w-4 h-4" />
							<span>Best Price Guarantee</span>
						</div>
						<div className="flex items-center gap-2">
							<Clock className="w-4 h-4" />
							<span>Instant Confirmation</span>
						</div>
					</div>

					{/* Warm Welcoming Headlines */}
					<div className="space-y-6 md:space-y-8">
						<h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-normal leading-[1.15] tracking-tight">
							<span
								className="block opacity-0 animate-fadeInUp"
								style={{
									animationDelay: '0.2s',
									animationFillMode: 'forwards',
								}}
							>
								Find Your
							</span>
							<span
								className="block opacity-0 animate-fadeInUp"
								style={{
									animationDelay: '0.4s',
									animationFillMode: 'forwards',
								}}
							>
								Perfect Escape
							</span>
						</h1>
						<div
							className="h-[2px] w-16 bg-[rgba(212,165,116,0.6)] mx-auto opacity-0 animate-fadeIn rounded-full"
							style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}
						></div>
						<p
							className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-normal leading-relaxed px-4 opacity-0 animate-fadeInUp"
							style={{ animationDelay: '0.9s', animationFillMode: 'forwards' }}
						>
							<span className="hidden md:inline">
								Discover welcoming hotels that feel like home · Thoughtfully
								curated for your comfort
							</span>
							<span className="md:hidden">
								Hotels that feel like home · Curated for comfort
							</span>
						</p>
					</div>

					{/* Warm Welcoming Booking Widget */}
					<div
						className="max-w-5xl mx-auto opacity-0 animate-fadeInUp"
						style={{ animationDelay: '1.1s', animationFillMode: 'forwards' }}
					>
						<div className="glass-warm-cream rounded-2xl p-6 md:p-8 shadow-warm-elevated">
							{/* Mobile: Stacked Layout, Desktop: Grid */}
							<div className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4 md:items-end">
								{/* Destination - Full width on mobile */}
								<div className="space-y-2 md:col-span-1">
									<label
										htmlFor="destination"
										className="text-xs font-medium text-[hsl(var(--warm-taupe))] uppercase tracking-wide"
									>
										Destination
									</label>
									<input
										type="text"
										id="destination"
										name="destination"
										placeholder="Where would you like to go?"
										value={destination}
										onChange={(e) => setDestination(e.target.value)}
										autoComplete="address-level2"
										className="w-full px-4 py-3.5 bg-white border border-[hsl(var(--warm-sand))] rounded-xl focus:ring-2 focus:ring-[hsl(var(--terracotta))] focus:border-[hsl(var(--terracotta))] text-[hsl(var(--warm-charcoal))] placeholder:text-[hsl(var(--warm-taupe))] text-base shadow-warm-subtle transition-all duration-300"
									/>
								</div>

								{/* Dates Row - Side by side on mobile */}
								<div className="grid grid-cols-2 gap-4 md:contents">
									{/* Check-in */}
									<div className="space-y-2">
										<label
											htmlFor="checkin"
											className="text-xs font-medium text-[hsl(var(--warm-taupe))] uppercase tracking-wide"
										>
											Check-in
										</label>
										<input
											type="date"
											id="checkin"
											name="checkin"
											value={checkIn}
											onChange={(e) => setCheckIn(e.target.value)}
											autoComplete="checkin"
											className="w-full px-4 py-3.5 bg-white border border-[hsl(var(--warm-sand))] rounded-xl focus:ring-2 focus:ring-[hsl(var(--terracotta))] focus:border-[hsl(var(--terracotta))] text-[hsl(var(--warm-charcoal))] text-base shadow-warm-subtle transition-all duration-300"
										/>
									</div>

									{/* Check-out */}
									<div className="space-y-2">
										<label
											htmlFor="checkout"
											className="text-xs font-medium text-[hsl(var(--warm-taupe))] uppercase tracking-wide"
										>
											Check-out
										</label>
										<input
											type="date"
											id="checkout"
											name="checkout"
											value={checkOut}
											onChange={(e) => setCheckOut(e.target.value)}
											autoComplete="checkout"
											className="w-full px-4 py-3.5 bg-white border border-[hsl(var(--warm-sand))] rounded-xl focus:ring-2 focus:ring-[hsl(var(--terracotta))] focus:border-[hsl(var(--terracotta))] text-[hsl(var(--warm-charcoal))] text-base shadow-warm-subtle transition-all duration-300"
										/>
									</div>
								</div>

								{/* Search Button - Full width on mobile */}
								<div className="md:col-span-1">
									<Button
										size="lg"
										variant="primary"
										onClick={handleSearch}
										className="w-full h-14 md:h-12 text-base font-medium tracking-wide bg-[hsl(var(--terracotta))] hover:bg-[hsl(var(--warm-amber))] text-white shadow-warm-glow hover:shadow-warm-elevated transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
									>
										Search Hotels
									</Button>
								</div>
							</div>

							{/* AI Search Option - More prominent on mobile */}
							<div className="mt-6 pt-4 border-t border-gray-200">
								<div className="text-center mb-3">
									<span className="text-sm font-semibold text-gray-600 bg-primary-50 text-primary-700 px-3 py-1 rounded-full">
										Try AI-Powered Search
									</span>
								</div>
								<NaturalLanguageInput
									placeholder="Try: 'Romantic weekend in Paris with spa'"
									size="md"
									className="text-center"
								/>
							</div>
						</div>
					</div>

					{/* Quick Actions */}
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Button
							size="lg"
							variant="secondary"
							className="text-white bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20"
						>
							<Play className="mr-2 h-5 w-5" />
							Watch Demo
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="border-white/30 text-white hover:bg-white/10"
						>
							Browse Destinations
						</Button>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/20">
						<div className="text-center">
							<div className="flex items-center justify-center mb-2">
								<Star className="h-6 w-6 text-accent mr-2" />
								<span className="text-4xl font-bold">4.9</span>
							</div>
							<p className="text-white/80 font-medium">Customer Rating</p>
							<p className="text-white/60 text-sm">From 50,000+ reviews</p>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center mb-2">
								<Users className="h-6 w-6 text-accent mr-2" />
								<span className="text-4xl font-bold">2M+</span>
							</div>
							<p className="text-white/80 font-medium">Happy Travelers</p>
							<p className="text-white/60 text-sm">Saved $15M+ total</p>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center mb-2">
								<MapPin className="h-6 w-6 text-accent mr-2" />
								<span className="text-4xl font-bold">50K+</span>
							</div>
							<p className="text-white/80 font-medium">Hotels Worldwide</p>
							<p className="text-white/60 text-sm">In 195 countries</p>
						</div>
					</div>
				</div>
			</div>

			{/* Scroll Indicator */}
			<div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60">
				<div className="animate-bounce">
					<div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
						<div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
					</div>
				</div>
			</div>
		</section>
	);
}
