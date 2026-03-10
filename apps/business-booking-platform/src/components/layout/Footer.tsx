import {
	Facebook,
	Hotel,
	Instagram,
	Mail,
	MapPin,
	Phone,
	Twitter,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
	return (
		<footer className="bg-gray-50 dark:bg-gray-900 border-t">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
					{/* Brand */}
					<div className="space-y-4">
						<Link
							to="/"
							className="flex items-center space-x-2 text-xl font-bold"
						>
							<Hotel className="h-6 w-6 text-primary-600" />
							<span className="gradient-text">Vibe Hotels</span>
						</Link>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Find Your Perfect Vibe. AI-powered hotel matching based on your
							passions. Earn 5% rewards on every booking. Discover hotels that
							match your unique vibe.
						</p>
					</div>

					{/* Quick Links */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
							Quick Links
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									to="/search"
									className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
								>
									Search Hotels
								</Link>
							</li>
							<li>
								<Link
									to="/destinations"
									className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
								>
									Top Destinations
								</Link>
							</li>
							<li>
								<Link
									to="/deals"
									className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
								>
									Special Deals
								</Link>
							</li>
							<li>
								<Link
									to="/business"
									className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
								>
									Business Travel
								</Link>
							</li>
						</ul>
					</div>

					{/* Support */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
							Support
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									to="/help"
									className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
								>
									Help Center
								</Link>
							</li>
							<li>
								<Link
									to="/contact"
									className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
								>
									Contact Us
								</Link>
							</li>
							<li>
								<Link
									to="/booking-help"
									className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
								>
									Booking Support
								</Link>
							</li>
							<li>
								<Link
									to="/cancellation"
									className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
								>
									Cancellation Policy
								</Link>
							</li>
						</ul>
					</div>

					{/* Contact */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
							Contact
						</h3>
						<div className="space-y-3">
							<div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
								<Mail className="h-4 w-4" />
								<span>support@vibehotels.com</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
								<Phone className="h-4 w-4" />
								<span>+1 (555) 123-4567</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
								<MapPin className="h-4 w-4" />
								<span>San Francisco, CA</span>
							</div>
						</div>

						{/* Social Media */}
						<div className="flex items-center space-x-3">
							<a
								href="#"
								className="text-gray-400 hover:text-primary-600 transition-colors"
								aria-label="Twitter"
							>
								<Twitter className="h-5 w-5" />
							</a>
							<a
								href="#"
								className="text-gray-400 hover:text-primary-600 transition-colors"
								aria-label="Facebook"
							>
								<Facebook className="h-5 w-5" />
							</a>
							<a
								href="#"
								className="text-gray-400 hover:text-primary-600 transition-colors"
								aria-label="Instagram"
							>
								<Instagram className="h-5 w-5" />
							</a>
						</div>
					</div>
				</div>

				{/* Bottom section */}
				<div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
					<div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
						<div className="text-sm text-gray-600 dark:text-gray-400">
							© 2025 Vibe Hotels. All rights reserved.
						</div>
						<div className="flex items-center space-x-6 text-sm">
							<Link
								to="/privacy"
								className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
							>
								Privacy Policy
							</Link>
							<Link
								to="/terms"
								className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
							>
								Terms of Service
							</Link>
							<Link
								to="/cookies"
								className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
							>
								Cookie Policy
							</Link>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
