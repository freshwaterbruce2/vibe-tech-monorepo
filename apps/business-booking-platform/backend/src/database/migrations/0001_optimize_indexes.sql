-- Hotel Booking Database Optimization Migration
-- Version: 0001
-- Description: Optimize indexes, add full-text search, and implement audit logging

-- =====================================================
-- 1. ENHANCED HOTEL SEARCH INDEXES
-- =====================================================

-- Composite indexes for common search patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotels_city_country_idx ON hotels(city, country);
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotels_price_range_idx ON hotels(price_range) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotels_active_featured_idx ON hotels(is_active, is_featured);
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotels_neighborhood_idx ON hotels(neighborhood) WHERE neighborhood IS NOT NULL;

-- Complex search indexes for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotels_search_idx ON hotels(city, is_active, rating) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotels_price_search_idx ON hotels(city, price_min, price_max, is_active) WHERE is_active = true;

-- Full-text search index using GIN
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotels_fulltext_idx ON hotels 
USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, '')));

-- Spatial index for location-based searches (if PostGIS is available)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS hotels_location_gist_idx ON hotels USING gist(st_point(longitude::double precision, latitude::double precision));

-- =====================================================
-- 2. BOOKING PERFORMANCE INDEXES
-- =====================================================

-- Enhanced booking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_room_id_idx ON bookings(room_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_payment_status_idx ON bookings(payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_statuses_idx ON bookings(status, payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_check_out_idx ON bookings(check_out);
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_date_range_idx ON bookings(check_in, check_out);
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_guest_name_idx ON bookings(guest_first_name, guest_last_name);

-- Analytics and reporting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_created_at_idx ON bookings(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_hotel_date_idx ON bookings(hotel_id, check_in);
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_hotel_revenue_idx ON bookings(hotel_id, total_amount, created_at) 
WHERE status = 'confirmed';

-- Partial indexes for active bookings
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_user_active_idx ON bookings(user_id, status) 
WHERE status IN ('confirmed', 'checked_in');

-- =====================================================
-- 3. PAYMENT AND SECURITY INDEXES
-- =====================================================

-- Payment method indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_type_idx ON payment_methods(type) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_transaction_id_idx ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- User session indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- =====================================================
-- 4. DATA VALIDATION CONSTRAINTS
-- =====================================================

-- Hotel data validation
ALTER TABLE hotels ADD CONSTRAINT hotels_rating_check 
CHECK (rating >= 0 AND rating <= 5);

ALTER TABLE hotels ADD CONSTRAINT hotels_star_rating_check 
CHECK (star_rating >= 1 AND star_rating <= 5);

ALTER TABLE hotels ADD CONSTRAINT hotels_price_check 
CHECK (price_min >= 0 AND price_max >= price_min);

ALTER TABLE hotels ADD CONSTRAINT hotels_coordinates_check 
CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);

-- Booking data validation
ALTER TABLE bookings ADD CONSTRAINT bookings_date_validation 
CHECK (check_out > check_in);

ALTER TABLE bookings ADD CONSTRAINT bookings_nights_validation 
CHECK (nights > 0);

ALTER TABLE bookings ADD CONSTRAINT bookings_guests_validation 
CHECK (adults > 0 AND adults + children <= 10);

ALTER TABLE bookings ADD CONSTRAINT bookings_amount_validation 
CHECK (total_amount > 0);

-- Room availability validation
ALTER TABLE room_availability ADD CONSTRAINT room_availability_quantities_check 
CHECK (available >= 0 AND booked >= 0);

-- =====================================================
-- 5. PERFORMANCE OPTIMIZATION COLUMNS
-- =====================================================

-- Add computed columns for better performance
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS price_range VARCHAR(20);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS location_point TEXT;

-- Update price range categories
UPDATE hotels SET price_range = CASE
  WHEN price_min < 100 THEN 'budget'
  WHEN price_min < 200 THEN 'mid-range'
  WHEN price_min < 400 THEN 'upscale'
  ELSE 'luxury'
END WHERE price_range IS NULL;

-- Update location points for spatial queries
UPDATE hotels SET location_point = 'POINT(' || longitude || ' ' || latitude || ')'
WHERE location_point IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- =====================================================
-- 6. SEARCH OPTIMIZATION TABLE
-- =====================================================

-- Create hotel search optimization table
CREATE TABLE IF NOT EXISTS hotel_search (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL UNIQUE REFERENCES hotels(id) ON DELETE CASCADE,
  name_vector TEXT,
  description_vector TEXT,
  location_vector TEXT,
  amenities_vector TEXT,
  combined_vector TEXT,
  popularity_score REAL DEFAULT 0,
  quality_score REAL DEFAULT 0,
  location_score REAL DEFAULT 0,
  searchable_text TEXT,
  keyword_tags JSONB DEFAULT '[]'::jsonb,
  last_indexed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search table
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotel_search_hotel_id_idx ON hotel_search(hotel_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotel_search_name_vector_idx ON hotel_search 
USING gin(to_tsvector('english', name_vector));
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotel_search_combined_vector_idx ON hotel_search 
USING gin(to_tsvector('english', combined_vector));
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotel_search_keyword_tags_idx ON hotel_search 
USING gin(keyword_tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS hotel_search_scoring_idx ON hotel_search(popularity_score, quality_score, location_score);

-- =====================================================
-- 7. ANALYTICS TABLES
-- =====================================================

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  query_type VARCHAR(20) NOT NULL,
  normalized_query TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  sort_by VARCHAR(50),
  total_results INTEGER DEFAULT 0,
  clicked_results INTEGER DEFAULT 0,
  booked_results INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  session_id VARCHAR(255),
  user_id UUID REFERENCES users(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  user_location JSONB DEFAULT '{}'::jsonb,
  search_location JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS search_analytics_query_idx ON search_analytics(query);
CREATE INDEX CONCURRENTLY IF NOT EXISTS search_analytics_query_type_idx ON search_analytics(query_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS search_analytics_created_at_idx ON search_analytics(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS search_analytics_execution_time_idx ON search_analytics(execution_time_ms);

-- =====================================================
-- 8. AUDIT LOGGING TABLES
-- =====================================================

-- Master audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_fields JSONB,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  impersonated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id VARCHAR(100),
  api_endpoint VARCHAR(255),
  http_method VARCHAR(10),
  application_version VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_log_table_record_idx ON audit_log(table_name, record_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_log_changed_by_idx ON audit_log(changed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_log_changed_at_idx ON audit_log(changed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_log_operation_idx ON audit_log(operation);

-- User activity log
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id VARCHAR(100),
  description TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  error_code VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer TEXT,
  geo_country VARCHAR(2),
  geo_city VARCHAR(100),
  geo_coordinates JSONB,
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_activity_log_user_id_idx ON user_activity_log(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_activity_log_action_idx ON user_activity_log(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_activity_log_occurred_at_idx ON user_activity_log(occurred_at);

-- Security events log
CREATE TABLE IF NOT EXISTS security_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  detection_method VARCHAR(50),
  rule_id VARCHAR(100),
  action_taken VARCHAR(100),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS security_events_log_event_type_idx ON security_events_log(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS security_events_log_severity_idx ON security_events_log(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS security_events_log_ip_address_idx ON security_events_log(ip_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS security_events_log_occurred_at_idx ON security_events_log(occurred_at);

-- =====================================================
-- 9. PERFORMANCE LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  memory_usage_mb INTEGER,
  cpu_usage_percent NUMERIC(5,2),
  db_query_count INTEGER,
  db_query_time_ms INTEGER,
  cache_hit BOOLEAN,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  request_id VARCHAR(100),
  error_occurred BOOLEAN DEFAULT false,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance log indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS performance_log_metric_type_idx ON performance_log(metric_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS performance_log_operation_idx ON performance_log(operation);
CREATE INDEX CONCURRENTLY IF NOT EXISTS performance_log_response_time_idx ON performance_log(response_time_ms);
CREATE INDEX CONCURRENTLY IF NOT EXISTS performance_log_recorded_at_idx ON performance_log(recorded_at);

-- =====================================================
-- 10. POPULATE SEARCH DATA
-- =====================================================

-- Initialize hotel search data
INSERT INTO hotel_search (
  hotel_id,
  name_vector,
  description_vector,
  location_vector,
  amenities_vector,
  combined_vector,
  searchable_text,
  keyword_tags,
  quality_score
)
SELECT 
  h.id,
  to_tsvector('english', COALESCE(h.name, '')),
  to_tsvector('english', COALESCE(h.description, '') || ' ' || COALESCE(h.short_description, '')),
  to_tsvector('english', COALESCE(h.city, '') || ' ' || COALESCE(h.neighborhood, '') || ' ' || COALESCE(h.country, '')),
  to_tsvector('english', COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(h.amenities)), ' '), '')),
  to_tsvector('english', 
    COALESCE(h.name, '') || ' ' ||
    COALESCE(h.description, '') || ' ' ||
    COALESCE(h.city, '') || ' ' ||
    COALESCE(h.neighborhood, '') || ' ' ||
    COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(h.amenities)), ' '), '')
  ),
  COALESCE(h.name, '') || ' ' || COALESCE(h.description, '') || ' ' || COALESCE(h.city, ''),
  COALESCE(h.amenities, '[]'::jsonb),
  (h.rating / 5.0) * 100
FROM hotels h
ON CONFLICT (hotel_id) DO UPDATE SET
  name_vector = EXCLUDED.name_vector,
  description_vector = EXCLUDED.description_vector,
  location_vector = EXCLUDED.location_vector,
  amenities_vector = EXCLUDED.amenities_vector,
  combined_vector = EXCLUDED.combined_vector,
  searchable_text = EXCLUDED.searchable_text,
  keyword_tags = EXCLUDED.keyword_tags,
  quality_score = EXCLUDED.quality_score,
  last_indexed = NOW(),
  updated_at = NOW();

-- =====================================================
-- 11. MAINTENANCE TASKS
-- =====================================================

-- Analyze tables for better query planning
ANALYZE hotels;
ANALYZE bookings;
ANALYZE hotel_search;
ANALYZE search_analytics;
ANALYZE audit_log;

-- Update table statistics
UPDATE pg_stat_user_tables SET n_tup_ins = 0 WHERE relname IN ('hotels', 'bookings', 'hotel_search');

COMMIT;