/**
 * SEO and Structured Data Utilities
 * Advanced meta tags, Open Graph, and JSON-LD structured data
 */

import { logger } from './logger';

export interface SEOData {
	title: string;
	description: string;
	keywords?: string[];
	canonical?: string;
	robots?: string;
	openGraph?: OpenGraphData;
	twitter?: TwitterCardData;
	structuredData?: StructuredDataItem[];
}

export interface OpenGraphData {
	title: string;
	description: string;
	type: 'website' | 'article' | 'product' | 'hotel' | 'travel';
	url: string;
	image: string;
	imageAlt?: string;
	siteName: string;
	locale?: string;
}

export interface TwitterCardData {
	card: 'summary' | 'summary_large_image' | 'app' | 'player';
	title: string;
	description: string;
	image?: string;
	imageAlt?: string;
	site?: string;
	creator?: string;
}

export interface StructuredDataItem {
	'@context': string;
	'@type': string;
	[key: string]: unknown;
}

export interface HotelStructuredData {
	name: string;
	description: string;
	address: {
		streetAddress: string;
		addressLocality: string;
		addressRegion: string;
		postalCode: string;
		addressCountry: string;
	};
	telephone: string;
	url: string;
	image: string[];
	priceRange: string;
	starRating?: {
		ratingValue: number;
		bestRating: number;
	};
	amenities: string[];
	checkinTime: string;
	checkoutTime: string;
}

class SEOManager {
	private static instance: SEOManager;
	private currentData: SEOData | null = null;
	private originalTitle: string;

	constructor() {
		this.originalTitle = document.title;
	}

	static getInstance(): SEOManager {
		if (!SEOManager.instance) {
			SEOManager.instance = new SEOManager();
		}
		return SEOManager.instance;
	}

	/**
	 * Get current SEO data
	 */
	getCurrentData(): SEOData | null {
		return this.currentData;
	}

	/**
	 * Set comprehensive SEO data
	 */
	setSEO(data: SEOData): void {
		this.currentData = data;
		this.updateMetaTags(data);
		this.updateStructuredData(data.structuredData || []);

		logger.debug('SEO data updated', {
			component: 'SEOManager',
			title: data.title,
			hasOpenGraph: !!data.openGraph,
			hasTwitterCard: !!data.twitter,
			structuredDataCount: data.structuredData?.length || 0,
		});
	}

	/**
	 * Create hotel-specific SEO data
	 */
	createHotelSEO(hotelData: HotelStructuredData): SEOData {
		const title = `${hotelData.name} - Book Direct | Best Rates Guaranteed`;
		const locality = hotelData.address.addressLocality;
		const desc = hotelData.description.slice(0, 120);
		const description = `Book ${hotelData.name} in ${locality}. ${desc}...`;

		return {
			title,
			description,
			keywords: [
				hotelData.name,
				hotelData.address.addressLocality,
				hotelData.address.addressRegion,
				'hotel booking',
				'best rates',
				'direct booking',
				...hotelData.amenities.slice(0, 5),
			],
			canonical: hotelData.url,
			robots: 'index, follow',
			openGraph: {
				title,
				description,
				type: 'hotel',
				url: hotelData.url,
				image: hotelData.image[0] || '',
				imageAlt: `${hotelData.name} exterior`,
				siteName: 'VibeBooking',
				locale: 'en_US',
			},
			twitter: {
				card: 'summary_large_image',
				title,
				description,
				image: hotelData.image[0],
				imageAlt: `${hotelData.name} exterior`,
				site: '@VibeBooking',
			},
			structuredData: [
				this.createHotelStructuredData(hotelData),
				this.createBreadcrumbStructuredData([
					{ name: 'Home', url: '/' },
					{ name: 'Hotels', url: '/hotels' },
					{
						name: hotelData.address.addressLocality,
						url: `/hotels/${hotelData.address.addressLocality.toLowerCase()}`,
					},
					{ name: hotelData.name, url: hotelData.url },
				]),
			],
		};
	}

	/**
	 * Create search results SEO data
	 */
	createSearchSEO(
		destination: string,
		checkIn?: string,
		checkOut?: string,
	): SEOData {
		const title = `Hotels in ${destination} - Find & Book ${checkIn ? `for ${checkIn}` : 'Today'}`;
		const description = `Discover the best hotels in ${destination}. Compare prices, read reviews, and book directly for the best rates. ${checkIn && checkOut ? `Stay from ${checkIn} to ${checkOut}.` : ''}`;

		return {
			title,
			description,
			keywords: [
				destination,
				'hotels',
				'hotel booking',
				'accommodation',
				'travel',
				'best rates',
				'reviews',
			],
			canonical: window.location.href.split('?')[0],
			robots: 'index, follow',
			openGraph: {
				title,
				description,
				type: 'website',
				url: window.location.href,
				image: '/images/search-og-image.jpg',
				imageAlt: `Hotels in ${destination}`,
				siteName: 'VibeBooking',
			},
			twitter: {
				card: 'summary_large_image',
				title,
				description,
				image: '/images/search-twitter-image.jpg',
				imageAlt: `Hotels in ${destination}`,
				site: '@VibeBooking',
			},
			structuredData: [this.createSearchResultsStructuredData(destination)],
		};
	}

	/**
	 * Create homepage SEO data
	 */
	createHomepageSEO(): SEOData {
		return {
			title: 'VibeBooking - Find Perfect Hotels with AI | Best Price Guarantee',
			description:
				'Discover and book the perfect hotel with AI-powered recommendations. Compare prices, read verified reviews, and enjoy best rate guarantees. Book direct for exclusive perks.',
			keywords: [
				'hotel booking',
				'AI hotel search',
				'best hotel prices',
				'travel booking',
				'hotel deals',
				'accommodation',
				'vacation rentals',
			],
			canonical: '/',
			robots: 'index, follow',
			openGraph: {
				title: 'VibeBooking - Find Perfect Hotels with AI',
				description:
					'AI-powered hotel search with best price guarantee and exclusive perks',
				type: 'website',
				url: window.location.origin,
				image: '/images/homepage-og-image.jpg',
				imageAlt: 'VibeBooking - AI Hotel Search',
				siteName: 'VibeBooking',
				locale: 'en_US',
			},
			twitter: {
				card: 'summary_large_image',
				title: 'VibeBooking - Find Perfect Hotels with AI',
				description: 'AI-powered hotel search with best price guarantee',
				image: '/images/homepage-twitter-image.jpg',
				imageAlt: 'VibeBooking - AI Hotel Search',
				site: '@VibeBooking',
			},
			structuredData: [
				this.createWebsiteStructuredData(),
				this.createOrganizationStructuredData(),
			],
		};
	}

	/**
	 * Reset to default SEO
	 */
	reset(): void {
		document.title = this.originalTitle;
		this.removeMetaTags();
		this.removeStructuredData();
		this.currentData = null;

		logger.debug('SEO data reset', { component: 'SEOManager' });
	}

	private updateMetaTags(data: SEOData): void {
		// Update title
		document.title = data.title;

		// Update basic meta tags
		this.updateMetaTag('description', data.description);
		this.updateMetaTag('keywords', data.keywords?.join(', ') || '');
		this.updateMetaTag('robots', data.robots || 'index, follow');

		// Update canonical URL
		if (data.canonical) {
			this.updateLinkTag('canonical', data.canonical);
		}

		// Update Open Graph tags
		if (data.openGraph) {
			this.updateMetaTag('og:title', data.openGraph.title, 'property');
			this.updateMetaTag(
				'og:description',
				data.openGraph.description,
				'property',
			);
			this.updateMetaTag('og:type', data.openGraph.type, 'property');
			this.updateMetaTag('og:url', data.openGraph.url, 'property');
			this.updateMetaTag('og:image', data.openGraph.image, 'property');
			this.updateMetaTag(
				'og:image:alt',
				data.openGraph.imageAlt || '',
				'property',
			);
			this.updateMetaTag('og:site_name', data.openGraph.siteName, 'property');
			this.updateMetaTag(
				'og:locale',
				data.openGraph.locale || 'en_US',
				'property',
			);
		}

		// Update Twitter Card tags
		if (data.twitter) {
			this.updateMetaTag('twitter:card', data.twitter.card);
			this.updateMetaTag('twitter:title', data.twitter.title);
			this.updateMetaTag('twitter:description', data.twitter.description);
			if (data.twitter.image) {
				this.updateMetaTag('twitter:image', data.twitter.image);
				this.updateMetaTag('twitter:image:alt', data.twitter.imageAlt || '');
			}
			if (data.twitter.site) {
				this.updateMetaTag('twitter:site', data.twitter.site);
			}
			if (data.twitter.creator) {
				this.updateMetaTag('twitter:creator', data.twitter.creator);
			}
		}
	}

	private updateMetaTag(
		name: string,
		content: string,
		attribute = 'name',
	): void {
		if (!content) {
return;
}

		let element = document.querySelector(
			`meta[${attribute}="${name}"]`,
		) as HTMLMetaElement;

		if (!element) {
			element = document.createElement('meta');
			element.setAttribute(attribute, name);
			document.head.appendChild(element);
		}

		element.content = content;
	}

	private updateLinkTag(rel: string, href: string): void {
		let element = document.querySelector(
			`link[rel="${rel}"]`,
		) as HTMLLinkElement;

		if (!element) {
			element = document.createElement('link');
			element.rel = rel;
			document.head.appendChild(element);
		}

		element.href = href;
	}

	private removeMetaTags(): void {
		const metaTags = document.querySelectorAll('meta[data-seo]');
		metaTags.forEach((tag) => tag.remove());
	}

	private updateStructuredData(data: StructuredDataItem[]): void {
		this.removeStructuredData();

		data.forEach((item, index) => {
			const script = document.createElement('script');
			script.type = 'application/ld+json';
			script.textContent = JSON.stringify(item);
			script.setAttribute('data-seo', 'structured-data');
			script.id = `structured-data-${index}`;
			document.head.appendChild(script);
		});
	}

	private removeStructuredData(): void {
		const scripts = document.querySelectorAll(
			'script[data-seo="structured-data"]',
		);
		scripts.forEach((script) => script.remove());
	}

	private createHotelStructuredData(
		hotel: HotelStructuredData,
	): StructuredDataItem {
		return {
			'@context': 'https://schema.org',
			'@type': 'Hotel',
			name: hotel.name,
			description: hotel.description,
			address: {
				'@type': 'PostalAddress',
				...hotel.address,
			},
			telephone: hotel.telephone,
			url: hotel.url,
			image: hotel.image,
			priceRange: hotel.priceRange,
			starRating: hotel.starRating
				? {
						'@type': 'Rating',
						ratingValue: hotel.starRating.ratingValue,
						bestRating: hotel.starRating.bestRating,
					}
				: undefined,
			amenityFeature: hotel.amenities.map((amenity) => ({
				'@type': 'LocationFeatureSpecification',
				name: amenity,
			})),
			checkinTime: hotel.checkinTime,
			checkoutTime: hotel.checkoutTime,
		};
	}

	private createBreadcrumbStructuredData(
		breadcrumbs: { name: string; url: string }[],
	): StructuredDataItem {
		return {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: breadcrumbs.map((item, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				name: item.name,
				item: `${window.location.origin}${item.url}`,
			})),
		};
	}

	private createSearchResultsStructuredData(
		destination: string,
	): StructuredDataItem {
		return {
			'@context': 'https://schema.org',
			'@type': 'SearchResultsPage',
			about: {
				'@type': 'Place',
				name: destination,
			},
			mainEntity: {
				'@type': 'ItemList',
				name: `Hotels in ${destination}`,
			},
		};
	}

	private createWebsiteStructuredData(): StructuredDataItem {
		return {
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: 'VibeBooking',
			url: window.location.origin,
			description:
				'AI-powered hotel booking platform with best price guarantee',
			potentialAction: {
				'@type': 'SearchAction',
				target: `${window.location.origin}/search?q={search_term_string}`,
				'query-input': 'required name=search_term_string',
			},
		};
	}

	private createOrganizationStructuredData(): StructuredDataItem {
		return {
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: 'VibeBooking',
			url: window.location.origin,
			logo: `${window.location.origin}/images/logo.png`,
			description: 'Leading AI-powered hotel booking platform',
			sameAs: [
				'https://twitter.com/VibeBooking',
				'https://facebook.com/VibeBooking',
				'https://linkedin.com/company/vibebooking',
			],
		};
	}
}

export const seoManager = SEOManager.getInstance();

// React hook for SEO management
export const useSEO = () => {
	return {
		setSEO: seoManager.setSEO.bind(seoManager),
		createHotelSEO: seoManager.createHotelSEO.bind(seoManager),
		createSearchSEO: seoManager.createSearchSEO.bind(seoManager),
		createHomepageSEO: seoManager.createHomepageSEO.bind(seoManager),
		reset: seoManager.reset.bind(seoManager),
	};
};
