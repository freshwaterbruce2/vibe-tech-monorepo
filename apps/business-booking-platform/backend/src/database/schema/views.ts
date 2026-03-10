import { sql } from 'drizzle-orm';
import { pgView } from 'drizzle-orm/pg-core';

/**
 * Materialized Views for Analytics and Reporting
 *
 * These views provide pre-computed aggregations for dashboard analytics,
 * hotel performance metrics, and business intelligence.
 */

/**
 * Hotel Performance Summary
 * Aggregates booking and revenue data by hotel for analytics
 */
export const hotelPerformanceView = pgView('hotel_performance_view').as(
	(qb) => {
		return qb
			.select({
				hotelId: sql`h.id`.as('hotel_id'),
				hotelName: sql`h.name`.as('hotel_name'),
				city: sql`h.city`.as('city'),
				country: sql`h.country`.as('country'),

				// Booking metrics (last 30 days)
				totalBookings:
					sql`COUNT(CASE WHEN b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)`.as(
						'total_bookings_30d',
					),
				confirmedBookings:
					sql`COUNT(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)`.as(
						'confirmed_bookings_30d',
					),
				cancelledBookings:
					sql`COUNT(CASE WHEN b.status = 'cancelled' AND b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)`.as(
						'cancelled_bookings_30d',
					),

				// Revenue metrics (last 30 days)
				totalRevenue:
					sql`COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN b.total_amount END), 0)`.as(
						'total_revenue_30d',
					),
				averageBookingValue:
					sql`COALESCE(AVG(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN b.total_amount END), 0)`.as(
						'avg_booking_value_30d',
					),

				// Occupancy metrics
				averageStayLength:
					sql`COALESCE(AVG(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN b.nights END), 0)`.as(
						'avg_stay_length_30d',
					),
				occupancyRate:
					sql`COALESCE((COUNT(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) * 100.0) / NULLIF(h.total_rooms * 30, 0), 0)`.as(
						'occupancy_rate_30d',
					),

				// Customer metrics
				averageRating: sql`h.rating`.as('average_rating'),
				totalReviews: sql`h.review_count`.as('total_reviews'),
				repeatCustomers:
					sql`COUNT(DISTINCT CASE WHEN customer_bookings.booking_count > 1 THEN b.user_id END)`.as(
						'repeat_customers',
					),

				// Trends (comparing to previous 30 days)
				bookingGrowth: sql`
        CASE 
          WHEN COUNT(CASE WHEN b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END) > 0 
          THEN ((COUNT(CASE WHEN b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) - 
                COUNT(CASE WHEN b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END)) * 100.0) / 
               COUNT(CASE WHEN b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END)
          ELSE 0
        END`.as('booking_growth_percent'),

				revenueGrowth: sql`
        CASE 
          WHEN COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN b.total_amount END), 0) > 0 
          THEN ((COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN b.total_amount END), 0) - 
                COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN b.total_amount END), 0)) * 100.0) / 
               COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN b.total_amount END), 1)
          ELSE 0
        END`.as('revenue_growth_percent'),

				lastUpdated: sql`NOW()`.as('last_updated'),
			})
			.from(sql`hotels h`)
			.leftJoin(sql`bookings b`, sql`h.id = b.hotel_id`)
			.leftJoin(
				sql`(
        SELECT user_id, hotel_id, COUNT(*) as booking_count
        FROM bookings
        WHERE status = 'confirmed'
        GROUP BY user_id, hotel_id
      ) customer_bookings`,
				sql`customer_bookings.user_id = b.user_id AND customer_bookings.hotel_id = h.id`,
			)
			.groupBy(
				sql`h.id, h.name, h.city, h.country, h.rating, h.review_count, h.total_rooms`,
			);
	},
);

/**
 * Daily booking metrics for time-series analysis
 */
export const dailyBookingMetricsView = pgView('daily_booking_metrics_view').as(
	(qb) => {
		return qb
			.select({
				date: sql`DATE(b.created_at)`.as('date'),

				// Booking counts
				totalBookings: sql`COUNT(*)`.as('total_bookings'),
				confirmedBookings:
					sql`COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END)`.as(
						'confirmed_bookings',
					),
				cancelledBookings:
					sql`COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)`.as(
						'cancelled_bookings',
					),
				pendingBookings:
					sql`COUNT(CASE WHEN b.status = 'pending' THEN 1 END)`.as(
						'pending_bookings',
					),

				// Revenue metrics
				totalRevenue:
					sql`COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount END), 0)`.as(
						'total_revenue',
					),
				averageBookingValue:
					sql`COALESCE(AVG(CASE WHEN b.status = 'confirmed' THEN b.total_amount END), 0)`.as(
						'avg_booking_value',
					),

				// Guest metrics
				totalGuests: sql`SUM(b.adults + b.children)`.as('total_guests'),
				averageStayLength: sql`AVG(b.nights)`.as('avg_stay_length'),

				// Geographic distribution
				uniqueCities: sql`COUNT(DISTINCT h.city)`.as('unique_cities'),
				uniqueCountries: sql`COUNT(DISTINCT h.country)`.as('unique_countries'),

				// Customer metrics
				uniqueCustomers:
					sql`COUNT(DISTINCT COALESCE(b.user_id, b.guest_email))`.as(
						'unique_customers',
					),
				repeatCustomers:
					sql`COUNT(DISTINCT CASE WHEN repeat_customers.booking_count > 1 THEN COALESCE(b.user_id, b.guest_email) END)`.as(
						'repeat_customers',
					),

				lastUpdated: sql`NOW()`.as('last_updated'),
			})
			.from(sql`bookings b`)
			.leftJoin(sql`hotels h`, sql`b.hotel_id = h.id`)
			.leftJoin(
				sql`(
        SELECT 
          COALESCE(user_id::text, guest_email) as customer_id,
          COUNT(*) as booking_count
        FROM bookings
        WHERE status = 'confirmed'
        GROUP BY COALESCE(user_id::text, guest_email)
      ) repeat_customers`,
				sql`repeat_customers.customer_id = COALESCE(b.user_id::text, b.guest_email)`,
			)
			.where(sql`b.created_at >= NOW() - INTERVAL '90 days'`)
			.groupBy(sql`DATE(b.created_at)`);
	},
);

/**
 * Hotel search performance metrics
 */
export const searchPerformanceView = pgView('search_performance_view').as(
	(qb) => {
		return qb
			.select({
				date: sql`DATE(sa.created_at)`.as('date'),

				// Search volume
				totalSearches: sql`COUNT(*)`.as('total_searches'),
				uniqueUsers:
					sql`COUNT(DISTINCT COALESCE(sa.user_id, sa.session_id))`.as(
						'unique_users',
					),

				// Search types
				naturalLanguageSearches:
					sql`COUNT(CASE WHEN sa.query_type = 'natural_language' THEN 1 END)`.as(
						'natural_language_searches',
					),
				filteredSearches:
					sql`COUNT(CASE WHEN sa.query_type = 'filtered' THEN 1 END)`.as(
						'filtered_searches',
					),
				mapBasedSearches:
					sql`COUNT(CASE WHEN sa.query_type = 'map_based' THEN 1 END)`.as(
						'map_based_searches',
					),

				// Performance metrics
				averageExecutionTime: sql`AVG(sa.execution_time_ms)`.as(
					'avg_execution_time_ms',
				),
				cacheHitRate:
					sql`(COUNT(CASE WHEN sa.cache_hit THEN 1 END) * 100.0) / COUNT(*)`.as(
						'cache_hit_rate_percent',
					),

				// Result metrics
				averageResultCount: sql`AVG(sa.total_results)`.as('avg_result_count'),
				clickThroughRate:
					sql`CASE WHEN SUM(sa.total_results) > 0 THEN (SUM(sa.clicked_results) * 100.0) / SUM(sa.total_results) ELSE 0 END`.as(
						'click_through_rate_percent',
					),
				conversionRate:
					sql`CASE WHEN SUM(sa.clicked_results) > 0 THEN (SUM(sa.booked_results) * 100.0) / SUM(sa.clicked_results) ELSE 0 END`.as(
						'conversion_rate_percent',
					),

				// Popular searches
				topQueries: sql`
        ARRAY_AGG(
          DISTINCT sa.normalized_query 
          ORDER BY COUNT(*) DESC
        ) FILTER (WHERE sa.normalized_query IS NOT NULL)
      `.as('top_queries'),

				lastUpdated: sql`NOW()`.as('last_updated'),
			})
			.from(sql`search_analytics sa`)
			.where(sql`sa.created_at >= NOW() - INTERVAL '30 days'`)
			.groupBy(sql`DATE(sa.created_at)`);
	},
);

/**
 * Revenue analytics by location and time
 */
export const revenueAnalyticsView = pgView('revenue_analytics_view').as(
	(qb) => {
		return qb
			.select({
				country: sql`h.country`.as('country'),
				city: sql`h.city`.as('city'),
				month: sql`DATE_TRUNC('month', b.created_at)`.as('month'),

				// Revenue metrics
				totalRevenue:
					sql`SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END)`.as(
						'total_revenue',
					),
				totalBookings:
					sql`COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END)`.as(
						'total_bookings',
					),
				averageBookingValue:
					sql`AVG(CASE WHEN b.status = 'confirmed' THEN b.total_amount END)`.as(
						'avg_booking_value',
					),

				// Guest metrics
				totalGuests:
					sql`SUM(CASE WHEN b.status = 'confirmed' THEN b.adults + b.children ELSE 0 END)`.as(
						'total_guests',
					),
				averagePartySize:
					sql`AVG(CASE WHEN b.status = 'confirmed' THEN b.adults + b.children END)`.as(
						'avg_party_size',
					),

				// Occupancy metrics
				totalNights:
					sql`SUM(CASE WHEN b.status = 'confirmed' THEN b.nights ELSE 0 END)`.as(
						'total_nights',
					),
				averageStayLength:
					sql`AVG(CASE WHEN b.status = 'confirmed' THEN b.nights END)`.as(
						'avg_stay_length',
					),

				// Performance metrics
				cancellationRate:
					sql`(COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0) / COUNT(*)`.as(
						'cancellation_rate_percent',
					),
				revenuePerNight:
					sql`SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount END) / NULLIF(SUM(CASE WHEN b.status = 'confirmed' THEN b.nights END), 0)`.as(
						'revenue_per_night',
					),

				lastUpdated: sql`NOW()`.as('last_updated'),
			})
			.from(sql`bookings b`)
			.leftJoin(sql`hotels h`, sql`b.hotel_id = h.id`)
			.where(sql`b.created_at >= NOW() - INTERVAL '12 months'`)
			.groupBy(sql`h.country, h.city, DATE_TRUNC('month', b.created_at)`);
	},
);

/**
 * SQL commands to create materialized views (for migrations)
 */
export const createMaterializedViews = [
	sql`
    CREATE MATERIALIZED VIEW hotel_performance_mv AS
    SELECT * FROM hotel_performance_view;
    
    CREATE UNIQUE INDEX hotel_performance_mv_hotel_id_idx ON hotel_performance_mv(hotel_id);
    CREATE INDEX hotel_performance_mv_city_idx ON hotel_performance_mv(city);
    CREATE INDEX hotel_performance_mv_country_idx ON hotel_performance_mv(country);
    CREATE INDEX hotel_performance_mv_revenue_idx ON hotel_performance_mv(total_revenue_30d);
    CREATE INDEX hotel_performance_mv_bookings_idx ON hotel_performance_mv(total_bookings_30d);
  `,

	sql`
    CREATE MATERIALIZED VIEW daily_booking_metrics_mv AS
    SELECT * FROM daily_booking_metrics_view;
    
    CREATE UNIQUE INDEX daily_booking_metrics_mv_date_idx ON daily_booking_metrics_mv(date);
    CREATE INDEX daily_booking_metrics_mv_revenue_idx ON daily_booking_metrics_mv(total_revenue);
    CREATE INDEX daily_booking_metrics_mv_bookings_idx ON daily_booking_metrics_mv(total_bookings);
  `,

	sql`
    CREATE MATERIALIZED VIEW search_performance_mv AS
    SELECT * FROM search_performance_view;
    
    CREATE UNIQUE INDEX search_performance_mv_date_idx ON search_performance_mv(date);
    CREATE INDEX search_performance_mv_searches_idx ON search_performance_mv(total_searches);
    CREATE INDEX search_performance_mv_ctr_idx ON search_performance_mv(click_through_rate_percent);
  `,

	sql`
    CREATE MATERIALIZED VIEW revenue_analytics_mv AS
    SELECT * FROM revenue_analytics_view;
    
    CREATE INDEX revenue_analytics_mv_location_idx ON revenue_analytics_mv(country, city);
    CREATE INDEX revenue_analytics_mv_month_idx ON revenue_analytics_mv(month);
    CREATE INDEX revenue_analytics_mv_revenue_idx ON revenue_analytics_mv(total_revenue);
  `,
];

/**
 * Refresh materialized views (should be run periodically via cron job)
 */
export const refreshMaterializedViews = [
	sql`REFRESH MATERIALIZED VIEW CONCURRENTLY hotel_performance_mv;`,
	sql`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_booking_metrics_mv;`,
	sql`REFRESH MATERIALIZED VIEW CONCURRENTLY search_performance_mv;`,
	sql`REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_analytics_mv;`,
];
