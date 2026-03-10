import {
	Award,
	Crown,
	Gem,
	Gift,
	Shield,
	Star,
	TrendingUp,
	Trophy,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';

const tiers = [
	{
		name: 'Silver Elite',
		icon: Star,
		color: 'from-slate-400 to-slate-600',
		requirements: '10 nights/year',
		benefits: [
			'10% off all bookings',
			'Free room upgrade (when available)',
			'Late checkout until 2 PM',
			'Welcome drink on arrival',
		],
	},
	{
		name: 'Gold Elite',
		icon: Crown,
		color: 'from-amber-400 to-amber-600',
		requirements: '25 nights/year',
		benefits: [
			'15% off all bookings',
			'Guaranteed room upgrade',
			'Late checkout until 4 PM',
			'Free breakfast included',
			'Priority customer service',
			'Exclusive member rates',
		],
	},
	{
		name: 'Platinum Elite',
		icon: Gem,
		color: 'from-purple-500 to-purple-700',
		requirements: '50 nights/year',
		benefits: [
			'20% off all bookings',
			'Suite upgrade when available',
			'Late checkout anytime',
			'Free breakfast & dinner',
			'Airport transfers included',
			'Dedicated concierge service',
			'Access to exclusive lounges',
			'Complimentary spa credits',
		],
		featured: true,
	},
	{
		name: 'Diamond Elite',
		icon: Trophy,
		color: 'from-blue-600 to-indigo-700',
		requirements: '100 nights/year',
		benefits: [
			'25% off all bookings',
			'Guaranteed suite upgrade',
			'Flexible cancellation anytime',
			'All meals included',
			'Unlimited spa access',
			'Personal travel advisor',
			'Exclusive event invitations',
			'Annual luxury gift',
			'Private jet lounge access',
		],
	},
];

export default function RewardsPage() {
	return (
		<Layout>
			<div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
				{/* Hero Section */}
				<div className="relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-600/20" />
					<div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
						<div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-sm text-amber-300 px-4 py-2 rounded-full text-sm font-semibold mb-6">
							<Award className="w-4 h-4" />
							EXCLUSIVE MEMBERSHIP PROGRAM
						</div>
						<h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
							Elite Rewards
						</h1>
						<p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
							Join the world's most rewarding hotel loyalty program. Earn
							points, unlock exclusive perks, and experience luxury like never
							before.
						</p>
						<button className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 font-bold text-lg shadow-2xl hover:shadow-amber-500/25 transform hover:scale-105">
							Join Now - It's Free
						</button>
					</div>
				</div>

				{/* Stats Section */}
				<div className="max-w-7xl mx-auto px-4 py-16">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						{[
							{ number: '10M+', label: 'Active Members', icon: Shield },
							{ number: '5,000+', label: 'Partner Hotels', icon: Award },
							{ number: '$2B+', label: 'Rewards Given', icon: Gift },
							{ number: '150+', label: 'Countries', icon: TrendingUp },
						].map((stat, index) => {
							const Icon = stat.icon;
							return (
								<div key={index} className="text-center">
									<Icon className="w-8 h-8 text-amber-400 mx-auto mb-4" />
									<div className="text-3xl font-bold text-white mb-2">
										{stat.number}
									</div>
									<div className="text-slate-400">{stat.label}</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Membership Tiers */}
				<div className="max-w-7xl mx-auto px-4 py-16">
					<div className="text-center mb-12">
						<h2 className="text-4xl font-bold text-white mb-4">
							Membership Tiers
						</h2>
						<p className="text-xl text-slate-300">
							The more you stay, the more you earn
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
						{tiers.map((tier) => {
							const Icon = tier.icon;
							return (
								<div
									key={tier.name}
									className={`
                    relative rounded-2xl overflow-hidden
                    ${
											tier.featured
												? 'ring-2 ring-amber-400 shadow-2xl shadow-amber-500/20 transform scale-105'
												: 'shadow-xl'
										}
                  `}
								>
									{tier.featured && (
										<div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
											MOST POPULAR
										</div>
									)}

									<div
										className={`bg-gradient-to-br ${tier.color} p-8 text-white`}
									>
										<Icon className="w-12 h-12 mb-4" />
										<h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
										<p className="text-sm opacity-90">{tier.requirements}</p>
									</div>

									<div className="bg-white/10 backdrop-blur-sm p-6">
										<ul className="space-y-3">
											{tier.benefits.map((benefit, index) => (
												<li
													key={index}
													className="flex items-start gap-2 text-white/90 text-sm"
												>
													<Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
													<span>{benefit}</span>
												</li>
											))}
										</ul>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* How It Works */}
				<div className="max-w-7xl mx-auto px-4 py-16">
					<div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-3xl p-12">
						<h2 className="text-3xl font-bold text-white mb-8 text-center">
							How It Works
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{[
								{
									step: '1',
									title: 'Join Free',
									description:
										'Sign up in seconds and start earning points immediately',
								},
								{
									step: '2',
									title: 'Book & Earn',
									description:
										'Earn 10 points for every dollar spent on hotel bookings',
								},
								{
									step: '3',
									title: 'Unlock Rewards',
									description:
										'Redeem points for free nights, upgrades, and exclusive experiences',
								},
							].map((item) => (
								<div key={item.step} className="text-center">
									<div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
										{item.step}
									</div>
									<h3 className="text-xl font-bold text-white mb-2">
										{item.title}
									</h3>
									<p className="text-slate-300">{item.description}</p>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* CTA Section */}
				<div className="max-w-4xl mx-auto px-4 py-20 text-center">
					<h2 className="text-4xl font-bold text-white mb-6">
						Start Your Journey to Elite Status
					</h2>
					<p className="text-xl text-slate-300 mb-8">
						Join millions of travelers who enjoy exclusive benefits and
						unforgettable experiences
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<button className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 font-bold text-lg shadow-2xl hover:shadow-amber-500/25">
							Create Free Account
						</button>
						<button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-300 font-bold text-lg border border-white/30">
							Learn More
						</button>
					</div>
				</div>
			</div>
		</Layout>
	);
}
