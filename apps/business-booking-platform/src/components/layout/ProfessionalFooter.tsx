import {
	Award,
	ChevronRight,
	Globe,
	Lock,
	Mail,
	Phone,
	Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function ProfessionalFooter() {
	// Payment method icons (base64 encoded for professional look)
	const paymentMethods = [
		{ name: 'Visa', icon: '💳' },
		{ name: 'Mastercard', icon: '💳' },
		{ name: 'Amex', icon: '💳' },
		{ name: 'PayPal', icon: '💰' },
		{ name: 'Apple Pay', icon: '🍎' },
		{ name: 'Google Pay', icon: 'G' },
	];

	const trustBadges = [
		{
			icon: Shield,
			label: 'Secure Booking',
			description: '256-bit SSL Encryption',
		},
		{ icon: Lock, label: 'Data Protection', description: 'GDPR Compliant' },
		{ icon: Award, label: 'Best Price', description: 'Guaranteed' },
		{ icon: Phone, label: '24/7 Support', description: 'Always Here to Help' },
	];

	return (
		<footer className="bg-gradient-to-b from-gray-50 to-white border-t">
			{/* Trust Badges Section - Like Marriott/Hilton */}
			<div className="bg-white border-b">
				<div className="container mx-auto px-4 py-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						{trustBadges.map((badge) => {
							const Icon = badge.icon;
							return (
								<div key={badge.label} className="flex items-start gap-3">
									<div className="bg-blue-50 p-2 rounded-lg">
										<Icon className="h-5 w-5 text-blue-600" />
									</div>
									<div>
										<h4 className="text-sm font-semibold text-gray-900">
											{badge.label}
										</h4>
										<p className="text-xs text-gray-500 mt-1">
											{badge.description}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Main Footer Content */}
			<div className="container mx-auto px-4 py-12">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
					{/* Brand Column - Premium Feel */}
					<div className="lg:col-span-2 space-y-6">
						<div>
							<h2 className="text-2xl font-bold text-gray-900 mb-2">
								Vibe Hotels
							</h2>
							<p className="text-sm text-gray-600 leading-relaxed">
								Experience luxury redefined. Book from our curated collection of
								premium hotels worldwide with exclusive member benefits and
								guaranteed best rates.
							</p>
						</div>

						{/* Newsletter Signup - Professional Style */}
						<div className="bg-gray-50 rounded-lg p-4">
							<h3 className="text-sm font-semibold text-gray-900 mb-2">
								Join Our Newsletter
							</h3>
							<p className="text-xs text-gray-600 mb-3">
								Get exclusive deals and travel inspiration
							</p>
							<div className="flex gap-2">
								<input
									type="email"
									placeholder="Your email address"
									className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
								<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>

						{/* App Download Buttons */}
						<div className="flex gap-3">
							<button className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors">
								<span className="text-lg">🍎</span>
								<div className="text-left">
									<div className="text-xs opacity-80">Download on the</div>
									<div className="text-sm font-semibold">App Store</div>
								</div>
							</button>
							<button className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors">
								<span className="text-lg">▶</span>
								<div className="text-left">
									<div className="text-xs opacity-80">Get it on</div>
									<div className="text-sm font-semibold">Google Play</div>
								</div>
							</button>
						</div>
					</div>

					{/* Explore Column */}
					<div>
						<h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
							Explore
						</h3>
						<ul className="space-y-3">
							{[
								'Destinations',
								'Deals & Offers',
								'Weekend Getaways',
								'Business Travel',
								'Luxury Collection',
								'Boutique Hotels',
							].map((item) => (
								<li key={item}>
									<Link
										to="#"
										className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
									>
										{item}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Services Column */}
					<div>
						<h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
							Services
						</h3>
						<ul className="space-y-3">
							{[
								'Rewards Program',
								'Gift Cards',
								'Group Bookings',
								'Meeting Rooms',
								'Wedding Venues',
								'Travel Insurance',
							].map((item) => (
								<li key={item}>
									<Link
										to="#"
										className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
									>
										{item}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Support Column */}
					<div>
						<h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
							Support
						</h3>
						<ul className="space-y-3">
							{[
								'Help Center',
								'Contact Us',
								'Cancel Booking',
								'Modify Booking',
								'FAQs',
								'Feedback',
							].map((item) => (
								<li key={item}>
									<Link
										to="#"
										className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
									>
										{item}
									</Link>
								</li>
							))}
						</ul>

						{/* Contact Info */}
						<div className="mt-6 space-y-2">
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<Phone className="h-4 w-4" />
								<span>1-888-HOTELS</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<Mail className="h-4 w-4" />
								<span>support@vibehotels.com</span>
							</div>
						</div>
					</div>
				</div>

				{/* Payment Methods & Legal */}
				<div className="mt-12 pt-8 border-t border-gray-200">
					<div className="flex flex-col md:flex-row justify-between items-center gap-6">
						{/* Payment Methods */}
						<div className="flex items-center gap-4">
							<span className="text-xs text-gray-500 uppercase tracking-wider">
								We Accept
							</span>
							<div className="flex items-center gap-3">
								{paymentMethods.map((method) => (
									<div
										key={method.name}
										className="bg-white border border-gray-200 rounded px-3 py-1 flex items-center justify-center"
										title={method.name}
									>
										<span className="text-lg">{method.icon}</span>
									</div>
								))}
							</div>
						</div>

						{/* Language & Currency */}
						<div className="flex items-center gap-4">
							<button className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
								<Globe className="h-4 w-4" />
								<span>English (US)</span>
							</button>
							<button className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
								$ USD
							</button>
						</div>
					</div>

					{/* Copyright & Legal Links */}
					<div className="mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
						<div className="text-xs text-gray-500">
							© 2025 Vibe Hotels International. All rights reserved. Vibe
							Hotels® is a registered trademark.
						</div>
						<div className="flex items-center gap-6 text-xs">
							{[
								'Privacy Policy',
								'Terms of Use',
								'Cookie Preferences',
								'Sitemap',
								'Accessibility',
							].map((link) => (
								<Link
									key={link}
									to="#"
									className="text-gray-500 hover:text-blue-600 transition-colors"
								>
									{link}
								</Link>
							))}
						</div>
					</div>

					{/* Partner Logos */}
					<div className="mt-6 flex items-center justify-center gap-8 opacity-50 grayscale">
						<span className="text-xs text-gray-400">Our Partners:</span>
						<span className="text-sm font-semibold text-gray-400">
							TripAdvisor
						</span>
						<span className="text-sm font-semibold text-gray-400">Kayak</span>
						<span className="text-sm font-semibold text-gray-400">Expedia</span>
						<span className="text-sm font-semibold text-gray-400">
							Hotels.com
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
