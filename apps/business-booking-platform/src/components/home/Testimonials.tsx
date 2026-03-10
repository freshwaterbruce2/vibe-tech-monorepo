import React from 'react';
import { useState } from 'react';
import { OptimizedImage } from '../ui/OptimizedImage';

interface Testimonial {
	id: string;
	name: string;
	location: string;
	avatar: string;
	rating: number;
	review: string;
	hotelStayed: string;
	hotelImage?: string;
	dateStayed: string;
	verified: boolean;
}

interface TestimonialsProps {
	testimonials?: Testimonial[];
	autoSlide?: boolean;
	className?: string;
}

const Testimonials: React.FC<TestimonialsProps> = ({
	testimonials = [
		{
			id: '1',
			name: 'Sarah Johnson',
			location: 'New York, USA',
			avatar:
				'https://images.unsplash.com/photo-1494790108755-2616b612b93c?w=200&h=200&fit=crop&crop=face',
			rating: 5,
			review:
				'Amazing experience! The hotel recommendation was perfect for our honeymoon. The booking process was so smooth and the customer service was exceptional.',
			hotelStayed: 'Grand Palace Resort, Bali',
			hotelImage:
				'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop',
			dateStayed: 'March 2024',
			verified: true,
		},
		{
			id: '2',
			name: 'Michael Chen',
			location: 'Toronto, Canada',
			avatar:
				'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
			rating: 5,
			review:
				'I travel frequently for business and this platform has become my go-to for hotel bookings. Great prices, excellent selection, and reliable service.',
			hotelStayed: 'Business Tower Hotel, Tokyo',
			hotelImage:
				'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop',
			dateStayed: 'February 2024',
			verified: true,
		},
		{
			id: '3',
			name: 'Emma Rodriguez',
			location: 'Madrid, Spain',
			avatar:
				'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
			rating: 4,
			review:
				'The passion-based hotel matching feature is brilliant! It found exactly the type of boutique hotel I was looking for in Paris. Highly recommend!',
			hotelStayed: 'Le Petit Boutique, Paris',
			hotelImage:
				'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop',
			dateStayed: 'January 2024',
			verified: true,
		},
		{
			id: '4',
			name: 'David Kim',
			location: 'Seoul, South Korea',
			avatar:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
			rating: 5,
			review:
				'Fantastic platform with great user experience. The AI-powered search understood exactly what I was looking for. Will definitely use again!',
			hotelStayed: 'Luxury Suites Dubai',
			hotelImage:
				'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
			dateStayed: 'December 2023',
			verified: true,
		},
		{
			id: '5',
			name: 'Lisa Thompson',
			location: 'London, UK',
			avatar:
				'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
			rating: 5,
			review:
				'Best hotel booking experience ever! The personalized recommendations were spot-on, and the whole family loved our vacation resort.',
			hotelStayed: 'Tropical Paradise Resort, Maldives',
			hotelImage:
				'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
			dateStayed: 'November 2023',
			verified: true,
		},
	],
	autoSlide: _autoSlide = false,
	className = '',
}) => {
	const [currentIndex, setCurrentIndex] = useState(0);

	const nextTestimonial = () => {
		setCurrentIndex((prevIndex) =>
			prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1,
		);
	};

	const prevTestimonial = () => {
		setCurrentIndex((prevIndex) =>
			prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1,
		);
	};

	const currentTestimonial = testimonials[currentIndex];

	if (!currentTestimonial) {
return null;
}

	const renderStars = (rating: number) => {
		return [...Array(5)].map((_, i) => (
			<svg
				key={i}
				className={`w-4 h-4 ${
					i < rating ? 'text-yellow-400' : 'text-gray-300'
				}`}
				fill="currentColor"
				viewBox="0 0 20 20"
			>
				<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
			</svg>
		));
	};

	return (
		<section
			className={`py-20 bg-gradient-to-b from-white to-gray-50 ${className}`}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Trust Stats Bar */}
				<div className="bg-white rounded-2xl shadow-lg p-6 mb-16">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
						<div>
							<div className="text-3xl font-bold text-primary mb-1">4.9/5</div>
							<div className="text-sm text-gray-600">Average Rating</div>
							<div className="text-xs text-gray-500">50,000+ reviews</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-accent mb-1">2M+</div>
							<div className="text-sm text-gray-600">Happy Travelers</div>
							<div className="text-xs text-gray-500">Trusted worldwide</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-blue-600 mb-1">99.9%</div>
							<div className="text-sm text-gray-600">Booking Success</div>
							<div className="text-xs text-gray-500">Instant confirmation</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-green-600 mb-1">
								$15M+
							</div>
							<div className="text-sm text-gray-600">Total Savings</div>
							<div className="text-xs text-gray-500">For our customers</div>
						</div>
					</div>
				</div>

				<div className="text-center mb-12">
					<div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
						<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clipRule="evenodd"
							/>
						</svg>
						Featured Customer Stories
					</div>
					<h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
						Real Stories from Real Travelers
					</h2>
					<p className="text-xl text-gray-600 max-w-3xl mx-auto">
						See why millions choose Vibe Booking for their perfect hotel
						experience
					</p>
				</div>

				{/* Desktop View - Enhanced Grid */}
				<div className="hidden lg:grid lg:grid-cols-3 gap-8">
					{testimonials.slice(0, 3).map((testimonial, index) => (
						<div key={testimonial.id} className="group">
							<div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden border-2 border-transparent hover:border-primary-200">
								{/* Hotel Image Header */}
								{testimonial.hotelImage && (
									<div className="relative h-48 -mx-px -mt-px mb-6">
										<OptimizedImage
											src={testimonial.hotelImage}
											alt={testimonial.hotelStayed}
											className="w-full h-full rounded-t-2xl"
											aspectRatio="2/1"
											objectFit="cover"
											sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
											fallbackSrc="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop"
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-t-2xl" />
										<div className="absolute bottom-4 left-6 right-6 text-white">
											<p className="font-bold text-lg drop-shadow-lg">
												{testimonial.hotelStayed}
											</p>
											<p className="text-sm opacity-90">
												{testimonial.dateStayed}
											</p>
										</div>
										{/* Featured Badge for first testimonial */}
										{index === 0 && (
											<div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
												Featured Story
											</div>
										)}
									</div>
								)}

								<div className="px-8 pb-8">
									{/* Rating Stars - Larger and prominent */}
									<div className="flex items-center justify-center mb-6">
										<div className="flex items-center gap-1 bg-yellow-50 px-4 py-2 rounded-full">
											{renderStars(testimonial.rating)}
											<span className="ml-2 text-lg font-bold text-yellow-600">
												{testimonial.rating}.0
											</span>
										</div>
									</div>

									{/* Quote - Larger and more prominent */}
									<blockquote className="text-gray-700 mb-6 text-base leading-relaxed text-center italic">
										"{testimonial.review}"
									</blockquote>

									{/* User Info */}
									<div className="flex items-center">
										<OptimizedImage
											src={testimonial.avatar}
											alt={testimonial.name}
											className="w-14 h-14 rounded-full mr-4 ring-2 ring-primary-100"
											width={56}
											height={56}
											objectFit="cover"
											priority
											fallbackSrc="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face"
										/>
										<div className="flex-1">
											<h4 className="font-bold text-gray-900">
												{testimonial.name}
											</h4>
											<p className="text-sm text-gray-600">
												{testimonial.location}
											</p>
											{testimonial.verified && (
												<div className="mt-1">
													<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
														<svg
															className="w-3 h-3 mr-1"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path
																fillRule="evenodd"
																d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
																clipRule="evenodd"
															/>
														</svg>
														Verified Booking
													</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Hover effect overlay */}
								<div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
							</div>
						</div>
					))}
				</div>

				{/* Mobile/Tablet View - Carousel */}
				<div className="lg:hidden">
					<div className="relative">
						<div className="bg-white rounded-xl shadow-lg overflow-hidden mx-4">
							{/* Hotel Image */}
							{currentTestimonial.hotelImage && (
								<div className="relative h-40">
									<OptimizedImage
										src={currentTestimonial.hotelImage}
										alt={currentTestimonial.hotelStayed}
										className="w-full h-full"
										aspectRatio="2/1"
										objectFit="cover"
										priority
										fallbackSrc="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
									<div className="absolute bottom-3 left-4 right-4 text-white">
										<p className="font-bold text-base drop-shadow-lg">
											{currentTestimonial.hotelStayed}
										</p>
										<p className="text-xs opacity-90">
											{currentTestimonial.dateStayed}
										</p>
									</div>
								</div>
							)}

							<div className="p-6">
								<div className="flex items-center mb-4">
									<OptimizedImage
										src={currentTestimonial.avatar}
										alt={currentTestimonial.name}
										className="w-12 h-12 rounded-full mr-4"
										width={48}
										height={48}
										objectFit="cover"
										priority
										fallbackSrc="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face"
									/>
									<div>
										<h4 className="font-semibold text-gray-900">
											{currentTestimonial.name}
										</h4>
										<p className="text-sm text-gray-600">
											{currentTestimonial.location}
										</p>
									</div>
									{currentTestimonial.verified && (
										<div className="ml-auto">
											<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
												<svg
													className="w-3 h-3 mr-1"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fillRule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
														clipRule="evenodd"
													/>
												</svg>
												Verified
											</span>
										</div>
									)}
								</div>

								<div className="flex items-center mb-3">
									{renderStars(currentTestimonial.rating)}
									<span className="ml-2 text-sm text-gray-600">
										{currentTestimonial.rating}.0
									</span>
								</div>

								<blockquote className="text-gray-700 italic">
									"{currentTestimonial.review}"
								</blockquote>
							</div>
						</div>

						{/* Navigation Buttons */}
						<button
							onClick={prevTestimonial}
							className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50"
						>
							<svg
								className="w-5 h-5 text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 19l-7-7 7-7"
								/>
							</svg>
						</button>
						<button
							onClick={nextTestimonial}
							className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50"
						>
							<svg
								className="w-5 h-5 text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</button>
					</div>

					{/* Dots Indicator */}
					<div className="flex justify-center mt-6 space-x-2">
						{testimonials.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`w-2 h-2 rounded-full transition-colors ${
									index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
								}`}
							/>
						))}
					</div>
				</div>

				{/* Enhanced CTA Section */}
				<div className="mt-16">
					<div className="bg-gradient-to-r from-primary to-primary-600 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
						{/* Background Pattern */}
						<div className="absolute inset-0 bg-white/5 opacity-10">
							<div
								className="absolute inset-0 bg-repeat bg-center"
								style={{
									backgroundImage:
										"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
									backgroundSize: '60px 60px',
								}}
							/>
						</div>

						<div className="relative z-10 max-w-4xl mx-auto">
							<h3 className="text-3xl md:text-4xl font-bold mb-4">
								Ready to Find Your Perfect Hotel?
							</h3>
							<p className="text-xl text-white/90 mb-2">
								Join 2M+ travelers who saved money and found amazing stays
							</p>
							<p className="text-white/80 mb-8">
								• Free cancellation on most bookings • Best price guarantee •
								Instant confirmation
							</p>

							<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
								<button className="bg-white text-primary font-bold py-4 px-8 rounded-xl hover:bg-gray-50 transition-all transform hover:scale-105 shadow-lg text-lg">
									Start Booking Now
								</button>
								<button className="border-2 border-white/30 text-white font-semibold py-4 px-8 rounded-xl hover:bg-white/10 transition-all">
									Browse Deals
								</button>
							</div>

							{/* Trust indicators */}
							<div className="flex flex-wrap justify-center items-center gap-6 mt-8 text-sm text-white/80">
								<div className="flex items-center gap-2">
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
									SSL Secured
								</div>
								<div className="flex items-center gap-2">
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
									24/7 Support
								</div>
								<div className="flex items-center gap-2">
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
									No Hidden Fees
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Testimonials;
