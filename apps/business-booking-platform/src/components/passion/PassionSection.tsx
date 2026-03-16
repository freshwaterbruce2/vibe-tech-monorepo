import {
	Briefcase,
	Building2,
	Heart,
	Mountain,
	Sparkles,
	Users2,
	Utensils,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';

interface Passion {
	id: string;
	name: string;
	description: string;
	icon: string;
	keywords: string[];
	color: string;
	image: string;
}

interface PassionSectionProps {
	selectedPassions?: string[];
	onPassionToggle?: (passionId: string) => void;
	onApplyPassions?: (passions: string[]) => void;
	isVisible?: boolean;
	className?: string;
}

const PassionSection: React.FC<PassionSectionProps> = ({
	selectedPassions = [],
	onPassionToggle,
	onApplyPassions,
	isVisible = true,
	className = '',
}) => {
	const [localSelectedPassions, setLocalSelectedPassions] =
		useState<string[]>(selectedPassions);

	const passions: Passion[] = [
		{
			id: 'culinary-excellence',
			name: 'Culinary Excellence',
			description:
				'Michelin-starred dining, wine tastings, and gourmet experiences',
			icon: 'utensils',
			keywords: [
				'michelin',
				'fine-dining',
				'sommelier',
				'gourmet',
				'chef',
				'culinary',
			],
			color: 'from-amber-600 to-amber-800 text-white',
			image:
				'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
		},
		{
			id: 'wellness-sanctuary',
			name: 'Wellness Sanctuary',
			description:
				'World-class spas, meditation retreats, and holistic wellness',
			icon: 'sparkles',
			keywords: [
				'spa',
				'wellness',
				'meditation',
				'yoga',
				'holistic',
				'retreat',
			],
			color: 'from-emerald-600 to-emerald-800 text-white',
			image:
				'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&h=600&fit=crop',
		},
		{
			id: 'cultural-immersion',
			name: 'Cultural Immersion',
			description:
				'Historic landmarks, world-class museums, and artistic heritage',
			icon: 'building2',
			keywords: [
				'museum',
				'culture',
				'heritage',
				'art',
				'history',
				'landmarks',
			],
			color: 'from-purple-600 to-purple-800 text-white',
			image:
				'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&h=600&fit=crop',
		},
		{
			id: 'adventure-escapes',
			name: 'Adventure Escapes',
			description:
				'Exclusive outdoor experiences and luxury adventure activities',
			icon: 'mountain',
			keywords: [
				'adventure',
				'outdoor',
				'exclusive',
				'nature',
				'activities',
				'luxury',
			],
			color: 'from-teal-600 to-teal-800 text-white',
			image:
				'https://images.unsplash.com/photo-1517021897933-0e0319cfbc28?w=800&h=600&fit=crop',
		},
		{
			id: 'business-elite',
			name: 'Business Elite',
			description:
				'Executive lounges, conference facilities, and premium business services',
			icon: 'briefcase',
			keywords: [
				'executive',
				'business',
				'conference',
				'premium',
				'corporate',
				'luxury',
			],
			color: 'from-slate-700 to-slate-900 text-white',
			image:
				'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
		},
		{
			id: 'family-luxury',
			name: 'Family Luxury',
			description:
				'Premium family suites, kids clubs, and sophisticated family experiences',
			icon: 'users2',
			keywords: [
				'family',
				'premium',
				'kids-club',
				'suites',
				'luxury',
				'experiences',
			],
			color: 'from-orange-600 to-orange-800 text-white',
			image:
				'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&h=600&fit=crop',
		},
		{
			id: 'romantic-elegance',
			name: 'Romantic Elegance',
			description:
				'Private villas, couples spa treatments, and intimate luxury settings',
			icon: 'heart',
			keywords: [
				'romantic',
				'couples',
				'private',
				'intimate',
				'luxury',
				'villas',
			],
			color: 'from-rose-600 to-rose-800 text-white',
			image:
				'https://images.unsplash.com/photo-1502301103665-0b95cc738daf?w=800&h=600&fit=crop',
		},
	];

	const handlePassionClick = (passionId: string) => {
		const newSelected = localSelectedPassions.includes(passionId)
			? localSelectedPassions.filter((id) => id !== passionId)
			: [...localSelectedPassions, passionId];

		setLocalSelectedPassions(newSelected);
		onPassionToggle && onPassionToggle(passionId);
	};

	const handleApplyPassions = () => {
		onApplyPassions && onApplyPassions(localSelectedPassions);
	};

	const clearAllPassions = () => {
		setLocalSelectedPassions([]);
	};

	if (!isVisible) {
		return null;
	}

	return (
		<section
			className={[
				'relative bg-gradient-to-br from-slate-50',
				'via-white to-amber-50/30 py-20 overflow-hidden',
				className,
			].join(' ')}
		>
			{/* Elegant Background Pattern */}
			<div className="absolute inset-0 opacity-30">
				<div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-amber-200/20 to-transparent rounded-full blur-3xl" />
				<div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-br from-slate-200/20 to-transparent rounded-full blur-3xl" />
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-amber-100/10 via-transparent to-slate-100/10 rounded-full blur-3xl" />
			</div>

			<div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
						Discover Your Travel Passion
					</h2>
					<p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
						Experience personalized luxury. Select your travel passions and
						we'll curate hotels that match your sophisticated preferences.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 max-w-7xl mx-auto">
					{passions.map((passion) => {
						const isSelected = localSelectedPassions.includes(passion.id);
						const IconComponent =
							{
								utensils: Utensils,
								sparkles: Sparkles,
								building2: Building2,
								mountain: Mountain,
								briefcase: Briefcase,
								users2: Users2,
								heart: Heart,
							}[passion.icon] || Utensils;

						return (
							<div
								key={passion.id}
								onClick={() => handlePassionClick(passion.id)}
								className={`relative cursor-pointer rounded-2xl
									overflow-hidden transition-all duration-500
									hover:scale-105 group h-96 ${
										isSelected
											? 'shadow-luxury-xl transform scale-105 ring-2 ring-amber-300/50'
											: 'shadow-luxury hover:shadow-luxury-lg'
									}
                `}
							>
								{/* Background Image */}
								<div
									className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
									style={{ backgroundImage: `url(${passion.image})` }}
								>
									<img
										src={passion.image}
										alt={passion.name}
										className="w-full h-full object-cover opacity-0"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
									/>
								</div>

								{/* Gradient Overlay */}
								<div
									className={`absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70 ${isSelected ? 'opacity-90' : 'opacity-80'} transition-opacity duration-500 group-hover:opacity-70`}
								/>

								{/* Color Gradient for Selected State */}
								<div
									className={`absolute inset-0 bg-gradient-to-br ${passion.color} ${isSelected ? 'opacity-40' : 'opacity-0'} transition-opacity duration-500`}
								/>

								{/* Content */}
								<div className="relative p-6 h-full flex flex-col">
									{isSelected && (
										<div className="absolute top-4 right-4 z-10">
											<div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
												<svg
													className="w-5 h-5 text-white"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fillRule="evenodd"
														d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
														clipRule="evenodd"
													/>
												</svg>
											</div>
										</div>
									)}

									{/* Spacer for top */}
									<div className="flex-1" />

									{/* Centered Content */}
									<div className="text-center">
										{/* Professional Icon */}
										<div
											className={[
												'w-16 h-16 mx-auto mb-4 rounded-full',
												'flex items-center justify-center',
												'transition-all duration-500 backdrop-blur-md',
												isSelected
													? 'bg-white/30 ring-2 ring-white/50'
													: 'bg-white/20 group-hover:bg-white/30 ring-2 ring-white/30',
											].join(' ')}
										>
											<IconComponent className="w-8 h-8 transition-colors duration-500 text-white drop-shadow-lg" />
										</div>

										<h3 className="text-xl font-bold mb-3 transition-colors duration-500 text-white drop-shadow-lg px-2">
											{passion.name}
										</h3>

										<p className="text-sm leading-relaxed transition-colors duration-500 text-white/95 drop-shadow-md px-2 mb-4">
											{passion.description}
										</p>

										{/* Keywords */}
										<div className="flex flex-wrap gap-2 justify-center">
											{passion.keywords.slice(0, 3).map((keyword, index) => (
												<span
													key={index}
													className={[
														'px-3 py-1.5 rounded-full text-xs',
														'font-medium transition-all duration-500',
														'backdrop-blur-md',
														isSelected
															? 'bg-white/30 text-white border border-white/50'
															: 'bg-white/20 text-white border border-white/30 group-hover:bg-white/30',
													].join(' ')}
												>
													{keyword}
												</span>
											))}
										</div>
									</div>

									{/* Spacer for bottom */}
									<div className="flex-1" />
								</div>
							</div>
						);
					})}
				</div>

				{/* Action Buttons */}
				<div
					className={[
						'bg-gradient-to-r from-white/80 via-white/90 to-white/80',
						'backdrop-blur-sm rounded-3xl p-8',
						'border border-white/50 shadow-luxury-lg',
					].join(' ')}
				>
					<div className="flex flex-col items-center gap-6">
						<div className="text-center">
							<div className="flex items-center justify-center gap-3 mb-4">
								<div
									className={[
										'w-3 h-3 rounded-full',
										'transition-colors duration-300',
										localSelectedPassions.length > 0
											? 'bg-slate-600'
											: 'bg-slate-300',
									].join(' ')}
								/>
								<p className="text-xl font-semibold text-slate-800">
									<span className="text-2xl text-slate-700 font-bold">
										{localSelectedPassions.length}
									</span>{' '}
									passion{localSelectedPassions.length !== 1 ? 's' : ''}{' '}
									selected
								</p>
								<div
									className={[
										'w-3 h-3 rounded-full',
										'transition-colors duration-300',
										localSelectedPassions.length > 0
											? 'bg-slate-600'
											: 'bg-slate-300',
									].join(' ')}
								/>
							</div>
							{localSelectedPassions.length > 0 && (
								<button
									onClick={clearAllPassions}
									className="text-slate-500 hover:text-slate-700 transition-colors font-medium underline underline-offset-2 hover:underline-offset-4"
								>
									Clear all selections
								</button>
							)}
						</div>

						<div className="flex gap-4">
							<button
								onClick={handleApplyPassions}
								disabled={localSelectedPassions.length === 0}
								className="px-10 py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg shadow-luxury-lg hover:shadow-luxury-xl transform hover:scale-105 disabled:transform-none disabled:hover:shadow-luxury-lg min-w-[280px]"
							>
								<span className="flex items-center justify-center gap-2">
									<svg
										className="w-5 h-5"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
											clipRule="evenodd"
										/>
									</svg>
									Discover Luxury Hotels
								</span>
							</button>
						</div>
					</div>
				</div>

				{/* Selected Passions Summary */}
				{localSelectedPassions.length > 0 && (
					<div className="mt-12 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-luxury-lg border border-slate-200/50">
						<h4 className="text-xl font-bold text-slate-900 mb-4 text-center">
							Your Luxury Travel Preferences
						</h4>
						<div className="flex flex-wrap gap-3 justify-center">
							{localSelectedPassions.map((passionId) => {
								const passion = passions.find((p) => p.id === passionId);
								const IconComponent = passion
									? {
											utensils: Utensils,
											sparkles: Sparkles,
											building2: Building2,
											mountain: Mountain,
											briefcase: Briefcase,
											users2: Users2,
											heart: Heart,
										}[passion.icon] || Utensils
									: Utensils;

								return passion ? (
									<span
										key={passionId}
										className={[
											'inline-flex items-center px-4 py-2',
											'rounded-xl text-sm font-semibold',
											`bg-gradient-to-r ${passion.color}`,
											'shadow-luxury-sm hover:shadow-luxury',
											'transition-all duration-300',
										].join(' ')}
									>
										<IconComponent className="w-4 h-4 mr-2" />
										{passion.name}
										<button
											onClick={(e) => {
												e.stopPropagation();
												handlePassionClick(passionId);
											}}
											className="ml-3 hover:bg-white/20 rounded-full p-1 transition-colors duration-200"
										>
											<svg
												className="w-3 h-3"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fillRule="evenodd"
													d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
													clipRule="evenodd"
												/>
											</svg>
										</button>
									</span>
								) : null;
							})}
						</div>
					</div>
				)}
			</div>
		</section>
	);
};

export default PassionSection;
