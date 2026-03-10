import { Mountain, Palette, Sparkles, Trees, Waves, Wine } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';

const experiences = [
	{
		id: 1,
		title: 'Wine Tasting in Tuscany',
		category: 'Culinary',
		price: '$299',
		image:
			'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop',
		icon: Wine,
		duration: '4 hours',
		rating: 4.9,
	},
	{
		id: 2,
		title: 'Swiss Alps Adventure',
		category: 'Adventure',
		price: '$599',
		image:
			'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&h=600&fit=crop',
		icon: Mountain,
		duration: '2 days',
		rating: 5.0,
	},
	{
		id: 3,
		title: 'Art Gallery Tour Paris',
		category: 'Culture',
		price: '$149',
		image:
			'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&h=600&fit=crop',
		icon: Palette,
		duration: '3 hours',
		rating: 4.8,
	},
	{
		id: 4,
		title: 'Maldives Diving Experience',
		category: 'Water Sports',
		price: '$799',
		image:
			'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
		icon: Waves,
		duration: '1 day',
		rating: 5.0,
	},
	{
		id: 5,
		title: 'Bali Temple & Spa Retreat',
		category: 'Wellness',
		price: '$399',
		image:
			'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800&h=600&fit=crop',
		icon: Trees,
		duration: '6 hours',
		rating: 4.9,
	},
	{
		id: 6,
		title: 'Safari in Kenya',
		category: 'Wildlife',
		price: '$1299',
		image:
			'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop',
		icon: Sparkles,
		duration: '3 days',
		rating: 5.0,
	},
];

export default function ExperiencesPage() {
	return (
		<Layout>
			<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
				{/* Hero Section */}
				<div className="relative h-96 overflow-hidden">
					<div
						className="absolute inset-0 bg-cover bg-center"
						style={{
							backgroundImage:
								'url(https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&h=800&fit=crop)',
						}}
					>
						<div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/30" />
					</div>
					<div className="relative z-10 h-full flex items-center justify-center text-center">
						<div>
							<h1 className="text-5xl font-bold text-white mb-4">
								Curated Experiences
							</h1>
							<p className="text-xl text-white/90 max-w-2xl mx-auto">
								Transform your stay into an unforgettable journey with our
								handpicked luxury experiences
							</p>
						</div>
					</div>
				</div>

				{/* Experiences Grid */}
				<div className="max-w-7xl mx-auto px-4 py-16">
					<div className="mb-12 text-center">
						<h2 className="text-3xl font-bold text-slate-800 mb-4">
							Popular Experiences
						</h2>
						<p className="text-lg text-slate-600">
							Book exclusive activities and create memories that last a lifetime
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{experiences.map((experience) => {
							const Icon = experience.icon;
							return (
								<div
									key={experience.id}
									className="group cursor-pointer rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 bg-white"
								>
									<div className="relative h-64 overflow-hidden">
										<img
											src={experience.image}
											alt={experience.title}
											className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
										<div className="absolute top-4 left-4">
											<span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-slate-700">
												{experience.category}
											</span>
										</div>
										<div className="absolute bottom-4 left-4 right-4">
											<h3 className="text-xl font-bold text-white mb-2">
												{experience.title}
											</h3>
											<div className="flex items-center gap-4 text-white/90 text-sm">
												<span className="flex items-center gap-1">
													<Icon className="w-4 h-4" />
													{experience.duration}
												</span>
												<span className="flex items-center gap-1">
													⭐ {experience.rating}
												</span>
											</div>
										</div>
									</div>
									<div className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm text-slate-500">Starting from</p>
												<p className="text-2xl font-bold text-slate-800">
													{experience.price}
												</p>
											</div>
											<button className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition-all duration-300 font-semibold">
												Book Now
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</Layout>
	);
}
