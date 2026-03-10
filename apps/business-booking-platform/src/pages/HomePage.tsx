import FeaturedDestinations from '@/components/home/FeaturedDestinations';
import { Hero } from '@/components/home/Hero';
import Testimonials from '@/components/home/Testimonials';
import PassionSection from '@/components/passion/PassionSection';

export function HomePage() {
	return (
		<div className="space-y-0">
			<Hero />
			<PassionSection />
			<FeaturedDestinations />
			<Testimonials />
		</div>
	);
}
