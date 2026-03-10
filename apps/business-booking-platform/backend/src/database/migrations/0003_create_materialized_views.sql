-- Hotel Booking Database Materialized Views Migration
-- Version: 0003
-- Description: Create materialized views for analytics and reporting

-- =====================================================
-- 1. HOTEL PERFORMANCE MATERIALIZED VIEW
-- =====================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS hotel_performance_mv;

-- Create hotel performance materialized view
CREATE MATERIALIZED VIEW hotel_performance_mv AS
SELECT 
  h.id as hotel_id,
  h.name as hotel_name,
  h.city,
  h.country,
  
  -- Booking metrics (last 30 days)
  COUNT(CASE WHEN b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as total_bookings_30d,
  COUNT(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as confirmed_bookings_30d,
  COUNT(CASE WHEN b.status = 'cancelled' AND b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as cancelled_bookings_30d,
  
  -- Revenue metrics (last 30 days)
  COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN b.total_amount END), 0) as total_revenue_30d,
  COALESCE(AVG(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN b.total_amount END), 0) as avg_booking_value_30d,
  
  -- Occupancy metrics
  COALESCE(AVG(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN b.nights END), 0) as avg_stay_length_30d,
  COALESCE((COUNT(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) * 100.0) / NULLIF(h.total_rooms * 30, 0), 0) as occupancy_rate_30d,
  
  -- Customer metrics
  h.rating as average_rating,
  h.review_count as total_reviews,
  COUNT(DISTINCT CASE WHEN customer_bookings.booking_count > 1 THEN b.user_id END) as repeat_customers,
  
  -- Trends (comparing to previous 30 days)
  CASE 
    WHEN COUNT(CASE WHEN b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END) > 0 
    THEN ((COUNT(CASE WHEN b.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) - 
          COUNT(CASE WHEN b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END)) * 100.0) / 
         COUNT(CASE WHEN b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END)
    ELSE 0
  END as booking_growth_percent,
  
  CASE 
    WHEN COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN b.total_amount END), 0) > 0 
    THEN ((COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at >= NOW() - INTERVAL '30 days' THEN b.total_amount END), 0) - 
          COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN b.total_amount END), 0)) * 100.0) / 
         COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN b.total_amount END), 1)
    ELSE 0
  END as revenue_growth_percent,
  
  NOW() as last_updated
FROM hotels h
LEFT JOIN bookings b ON h.id = b.hotel_id
LEFT JOIN (
  SELECT user_id, hotel_id, COUNT(*) as booking_count
  FROM bookings
  WHERE status = 'confirmed'
  GROUP BY user_id, hotel_id
) customer_bookings ON customer_bookings.user_id = b.user_id AND customer_bookings.hotel_id = h.id
GROUP BY h.id, h.name, h.city, h.country, h.rating, h.review_count, h.total_rooms;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX hotel_performance_mv_hotel_id_idx ON hotel_performance_mv(hotel_id);
CREATE INDEX hotel_performance_mv_city_idx ON hotel_performance_mv(city);
CREATE INDEX hotel_performance_mv_country_idx ON hotel_performance_mv(country);
CREATE INDEX hotel_performance_mv_revenue_idx ON hotel_performance_mv(total_revenue_30d);
CREATE INDEX hotel_performance_mv_bookings_idx ON hotel_performance_mv(total_bookings_30d);
CREATE INDEX hotel_performance_mv_occupancy_idx ON hotel_performance_mv(occupancy_rate_30d);
CREATE INDEX hotel_performance_mv_growth_idx ON hotel_performance_mv(booking_growth_percent);

-- =====================================================
-- 2. DAILY BOOKING METRICS MATERIALIZED VIEW
-- =====================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS daily_booking_metrics_mv;

-- Create daily booking metrics materialized view
CREATE MATERIALIZED VIEW daily_booking_metrics_mv AS
SELECT 
  DATE(b.created_at) as date,
  
  -- Booking counts
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
  
  -- Revenue metrics
  COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN b.status = 'confirmed' THEN b.total_amount END), 0) as avg_booking_value,
  
  -- Guest metrics
  SUM(b.adults + b.children) as total_guests,
  AVG(b.nights) as avg_stay_length,
  
  -- Geographic distribution
  COUNT(DISTINCT h.city) as unique_cities,
  COUNT(DISTINCT h.country) as unique_countries,
  
  -- Customer metrics
  COUNT(DISTINCT COALESCE(b.user_id, b.guest_email)) as unique_customers,
  COUNT(DISTINCT CASE WHEN repeat_customers.booking_count > 1 THEN COALESCE(b.user_id, b.guest_email) END) as repeat_customers,
  
  NOW() as last_updated
FROM bookings b
LEFT JOIN hotels h ON b.hotel_id = h.id
LEFT JOIN (
  SELECT 
    COALESCE(user_id::text, guest_email) as customer_id,
    COUNT(*) as booking_count
  FROM bookings
  WHERE status = 'confirmed'
  GROUP BY COALESCE(user_id::text, guest_email)
) repeat_customers ON repeat_customers.customer_id = COALESCE(b.user_id::text, b.guest_email)
WHERE b.created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(b.created_at);

-- Create indexes on the materialized view
CREATE UNIQUE INDEX daily_booking_metrics_mv_date_idx ON daily_booking_metrics_mv(date);
CREATE INDEX daily_booking_metrics_mv_revenue_idx ON daily_booking_metrics_mv(total_revenue);
CREATE INDEX daily_booking_metrics_mv_bookings_idx ON daily_booking_metrics_mv(total_bookings);
CREATE INDEX daily_booking_metrics_mv_customers_idx ON daily_booking_metrics_mv(unique_customers);

-- =====================================================
-- 3. SEARCH PERFORMANCE MATERIALIZED VIEW
-- =====================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS search_performance_mv;

-- Create search performance materialized view
CREATE MATERIALIZED VIEW search_performance_mv AS
SELECT 
  DATE(sa.created_at) as date,
  
  -- Search volume
  COUNT(*) as total_searches,
  COUNT(DISTINCT COALESCE(sa.user_id, sa.session_id)) as unique_users,
  
  -- Search types
  COUNT(CASE WHEN sa.query_type = 'natural_language' THEN 1 END) as natural_language_searches,
  COUNT(CASE WHEN sa.query_type = 'filtered' THEN 1 END) as filtered_searches,
  COUNT(CASE WHEN sa.query_type = 'map_based' THEN 1 END) as map_based_searches,
  
  -- Performance metrics
  AVG(sa.execution_time_ms) as avg_execution_time_ms,
  (COUNT(CASE WHEN sa.cache_hit THEN 1 END) * 100.0) / COUNT(*) as cache_hit_rate_percent,
  
  -- Result metrics
  AVG(sa.total_results) as avg_result_count,
  CASE WHEN SUM(sa.total_results) > 0 THEN (SUM(sa.clicked_results) * 100.0) / SUM(sa.total_results) ELSE 0 END as click_through_rate_percent,
  CASE WHEN SUM(sa.clicked_results) > 0 THEN (SUM(sa.booked_results) * 100.0) / SUM(sa.clicked_results) ELSE 0 END as conversion_rate_percent,
  
  -- Popular searches (top 10 queries for the day)
  ARRAY_AGG(
    DISTINCT sa.normalized_query 
    ORDER BY COUNT(*) DESC
  ) FILTER (WHERE sa.normalized_query IS NOT NULL) as top_queries,
  
  NOW() as last_updated
FROM search_analytics sa
WHERE sa.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(sa.created_at);

-- Create indexes on the materialized view
CREATE UNIQUE INDEX search_performance_mv_date_idx ON search_performance_mv(date);
CREATE INDEX search_performance_mv_searches_idx ON search_performance_mv(total_searches);
CREATE INDEX search_performance_mv_ctr_idx ON search_performance_mv(click_through_rate_percent);
CREATE INDEX search_performance_mv_conversion_idx ON search_performance_mv(conversion_rate_percent);

-- =====================================================
-- 4. REVENUE ANALYTICS MATERIALIZED VIEW
-- =====================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS revenue_analytics_mv;

-- Create revenue analytics materialized view
CREATE MATERIALIZED VIEW revenue_analytics_mv AS
SELECT 
  h.country,
  h.city,
  DATE_TRUNC('month', b.created_at) as month,
  
  -- Revenue metrics
  SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END) as total_revenue,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as total_bookings,
  AVG(CASE WHEN b.status = 'confirmed' THEN b.total_amount END) as avg_booking_value,
  
  -- Guest metrics
  SUM(CASE WHEN b.status = 'confirmed' THEN b.adults + b.children ELSE 0 END) as total_guests,
  AVG(CASE WHEN b.status = 'confirmed' THEN b.adults + b.children END) as avg_party_size,
  
  -- Occupancy metrics
  SUM(CASE WHEN b.status = 'confirmed' THEN b.nights ELSE 0 END) as total_nights,
  AVG(CASE WHEN b.status = 'confirmed' THEN b.nights END) as avg_stay_length,
  
  -- Performance metrics
  (COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0) / COUNT(*) as cancellation_rate_percent,
  SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount END) / NULLIF(SUM(CASE WHEN b.status = 'confirmed' THEN b.nights END), 0) as revenue_per_night,
  
  NOW() as last_updated
FROM bookings b
LEFT JOIN hotels h ON b.hotel_id = h.id
WHERE b.created_at >= NOW() - INTERVAL '12 months'
GROUP BY h.country, h.city, DATE_TRUNC('month', b.created_at);

-- Create indexes on the materialized view
CREATE INDEX revenue_analytics_mv_location_idx ON revenue_analytics_mv(country, city);
CREATE INDEX revenue_analytics_mv_month_idx ON revenue_analytics_mv(month);
CREATE INDEX revenue_analytics_mv_revenue_idx ON revenue_analytics_mv(total_revenue);
CREATE INDEX revenue_analytics_mv_bookings_idx ON revenue_analytics_mv(total_bookings);

-- =====================================================
-- 5. HOTEL RANKING MATERIALIZED VIEW
-- =====================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS hotel_ranking_mv;

-- Create hotel ranking materialized view for search optimization
CREATE MATERIALIZED VIEW hotel_ranking_mv AS
SELECT 
  h.id as hotel_id,
  h.name,
  h.city,
  h.country,
  h.rating,
  h.review_count,
  h.price_min,
  h.price_max,
  h.star_rating,
  
  -- Performance scores
  hs.popularity_score,
  hs.quality_score,
  hs.location_score,
  
  -- Booking performance (last 90 days)
  COALESCE(booking_stats.total_bookings, 0) as recent_bookings,
  COALESCE(booking_stats.avg_rating, h.rating) as recent_avg_rating,
  COALESCE(booking_stats.revenue, 0) as recent_revenue,
  
  -- Composite ranking score
  (
    (h.rating / 5.0 * 0.3) + 
    (LEAST(h.review_count, 100) / 100.0 * 0.2) +
    (COALESCE(hs.popularity_score, 0) / 100.0 * 0.25) +
    (COALESCE(hs.quality_score, 0) / 100.0 * 0.25)
  ) * 100 as overall_score,
  
  -- Search boost factors
  CASE WHEN h.is_featured THEN 1.2 ELSE 1.0 END as featured_boost,
  CASE WHEN COALESCE(booking_stats.total_bookings, 0) > 10 THEN 1.1 ELSE 1.0 END as popularity_boost,
  
  NOW() as last_updated
FROM hotels h
LEFT JOIN hotel_search hs ON h.id = hs.hotel_id
LEFT JOIN (
  SELECT 
    hotel_id,
    COUNT(*) as total_bookings,
    AVG(total_amount) as avg_booking_value,
    SUM(total_amount) as revenue,
    -- Simulated recent rating (would come from reviews if available)
    AVG(4.0 + (RANDOM() * 1.0)) as avg_rating
  FROM bookings
  WHERE created_at >= NOW() - INTERVAL '90 days'
    AND status = 'confirmed'
  GROUP BY hotel_id
) booking_stats ON h.id = booking_stats.hotel_id
WHERE h.is_active = true;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX hotel_ranking_mv_hotel_id_idx ON hotel_ranking_mv(hotel_id);
CREATE INDEX hotel_ranking_mv_city_idx ON hotel_ranking_mv(city);
CREATE INDEX hotel_ranking_mv_country_idx ON hotel_ranking_mv(country);
CREATE INDEX hotel_ranking_mv_overall_score_idx ON hotel_ranking_mv(overall_score DESC);
CREATE INDEX hotel_ranking_mv_price_idx ON hotel_ranking_mv(price_min, price_max);
CREATE INDEX hotel_ranking_mv_rating_idx ON hotel_ranking_mv(rating DESC);

-- =====================================================
-- 6. REFRESH FUNCTIONS
-- =====================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time INTERVAL) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
BEGIN
  -- Hotel Performance View
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY hotel_performance_mv;
  end_time := clock_timestamp();
  view_name := 'hotel_performance_mv';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  -- Daily Booking Metrics View
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_booking_metrics_mv;
  end_time := clock_timestamp();
  view_name := 'daily_booking_metrics_mv';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  -- Search Performance View
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_performance_mv;
  end_time := clock_timestamp();
  view_name := 'search_performance_mv';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  -- Revenue Analytics View
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_analytics_mv;
  end_time := clock_timestamp();
  view_name := 'revenue_analytics_mv';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  -- Hotel Ranking View
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY hotel_ranking_mv;
  end_time := clock_timestamp();
  view_name := 'hotel_ranking_mv';
  refresh_time := end_time - start_time;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh views based on data freshness
CREATE OR REPLACE FUNCTION refresh_stale_materialized_views(staleness_threshold INTERVAL DEFAULT '1 hour')
RETURNS TABLE(view_name TEXT, was_stale BOOLEAN, refresh_time INTERVAL) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  is_stale BOOLEAN;
BEGIN
  -- Check and refresh hotel_performance_mv
  SELECT (last_updated < NOW() - staleness_threshold) INTO is_stale
  FROM hotel_performance_mv LIMIT 1;
  
  IF is_stale OR is_stale IS NULL THEN
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY hotel_performance_mv;
    end_time := clock_timestamp();
    view_name := 'hotel_performance_mv';
    was_stale := COALESCE(is_stale, true);
    refresh_time := end_time - start_time;
    RETURN NEXT;
  END IF;
  
  -- Check and refresh daily_booking_metrics_mv
  SELECT (last_updated < NOW() - staleness_threshold) INTO is_stale
  FROM daily_booking_metrics_mv WHERE date = CURRENT_DATE LIMIT 1;
  
  IF is_stale OR is_stale IS NULL THEN
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_booking_metrics_mv;
    end_time := clock_timestamp();
    view_name := 'daily_booking_metrics_mv';
    was_stale := COALESCE(is_stale, true);
    refresh_time := end_time - start_time;
    RETURN NEXT;
  END IF;
  
  -- Similar checks for other views...
  -- (Additional view checks would go here)
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. AUTOMATED REFRESH SETUP
-- =====================================================

-- Create a function that can be called by a cron job
CREATE OR REPLACE FUNCTION automated_view_refresh()
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Refresh views during off-peak hours (assumes UTC)
  IF EXTRACT(HOUR FROM NOW()) BETWEEN 2 AND 6 THEN
    -- Full refresh during maintenance window
    PERFORM refresh_all_materialized_views();
    result := 'Full refresh completed at ' || NOW();
  ELSE
    -- Incremental refresh based on staleness
    PERFORM refresh_stale_materialized_views('30 minutes');
    result := 'Incremental refresh completed at ' || NOW();
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMIT;