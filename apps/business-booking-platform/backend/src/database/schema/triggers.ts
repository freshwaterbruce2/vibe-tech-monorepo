import { sql } from 'drizzle-orm';

/**
 * Database Triggers for Audit Logging and Data Consistency
 *
 * These triggers automatically maintain data integrity, update search indexes,
 * track changes for audit purposes, and ensure business rule compliance.
 */

/**
 * Generic audit logging trigger function
 * Records all changes to tracked tables with before/after values
 */
export const createAuditTriggerFunction = sql`
  CREATE OR REPLACE FUNCTION audit_trigger_function()
  RETURNS TRIGGER AS $$
  DECLARE
    old_data JSONB;
    new_data JSONB;
    excluded_cols TEXT[] := ARRAY['updated_at', 'last_updated'];
  BEGIN
    -- Skip if no actual changes (excluding timestamp columns)
    IF TG_OP = 'UPDATE' THEN
      old_data := to_jsonb(OLD);
      new_data := to_jsonb(NEW);
      
      -- Remove excluded columns for comparison
      SELECT old_data - excluded_cols INTO old_data;
      SELECT new_data - excluded_cols INTO new_data;
      
      -- Skip if no meaningful changes
      IF old_data = new_data THEN
        RETURN NEW;
      END IF;
    END IF;
    
    -- Insert audit record
    INSERT INTO audit_log (
      table_name,
      record_id,
      operation,
      old_data,
      new_data,
      changed_by,
      changed_at,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      CASE 
        WHEN TG_OP = 'DELETE' THEN (OLD.id)::TEXT
        ELSE (NEW.id)::TEXT
      END,
      TG_OP,
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) 
           WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW)
           ELSE NULL END,
      current_setting('app.current_user_id', true),
      NOW(),
      current_setting('app.client_ip', true),
      current_setting('app.user_agent', true)
    );
    
    -- Return appropriate record
    CASE TG_OP
      WHEN 'DELETE' THEN RETURN OLD;
      ELSE RETURN NEW;
    END CASE;
  END;
  $$ LANGUAGE plpgsql;
`;

/**
 * Hotel search index maintenance trigger
 * Updates full-text search vectors when hotel data changes
 */
export const createHotelSearchTriggerFunction = sql`
  CREATE OR REPLACE FUNCTION hotel_search_trigger_function()
  RETURNS TRIGGER AS $$
  BEGIN
    -- Update search vectors in hotel_search table
    INSERT INTO hotel_search (
      hotel_id,
      name_vector,
      description_vector,
      location_vector,
      amenities_vector,
      combined_vector,
      searchable_text,
      keyword_tags,
      last_indexed
    ) VALUES (
      NEW.id,
      to_tsvector('english', COALESCE(NEW.name, '')),
      to_tsvector('english', COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.short_description, '')),
      to_tsvector('english', COALESCE(NEW.city, '') || ' ' || COALESCE(NEW.neighborhood, '') || ' ' || COALESCE(NEW.country, '')),
      to_tsvector('english', COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.amenities)), ' '), '')),
      to_tsvector('english', 
        COALESCE(NEW.name, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.city, '') || ' ' ||
        COALESCE(NEW.neighborhood, '') || ' ' ||
        COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.amenities)), ' '), '')
      ),
      COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.city, ''),
      COALESCE(NEW.amenities, '[]'::jsonb),
      NOW()
    )
    ON CONFLICT (hotel_id) DO UPDATE SET
      name_vector = to_tsvector('english', COALESCE(NEW.name, '')),
      description_vector = to_tsvector('english', COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.short_description, '')),
      location_vector = to_tsvector('english', COALESCE(NEW.city, '') || ' ' || COALESCE(NEW.neighborhood, '') || ' ' || COALESCE(NEW.country, '')),
      amenities_vector = to_tsvector('english', COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.amenities)), ' '), '')),
      combined_vector = to_tsvector('english', 
        COALESCE(NEW.name, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.city, '') || ' ' ||
        COALESCE(NEW.neighborhood, '') || ' ' ||
        COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.amenities)), ' '), '')
      ),
      searchable_text = COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.city, ''),
      keyword_tags = COALESCE(NEW.amenities, '[]'::jsonb),
      last_indexed = NOW(),
      updated_at = NOW();
    
    -- Update price range category for faster filtering
    NEW.price_range := CASE
      WHEN NEW.price_min < 100 THEN 'budget'
      WHEN NEW.price_min < 200 THEN 'mid-range'
      WHEN NEW.price_min < 400 THEN 'upscale'
      ELSE 'luxury'
    END;
    
    -- Generate location point for spatial queries (if PostGIS is available)
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
      NEW.location_point := 'POINT(' || NEW.longitude || ' ' || NEW.latitude || ')';
    END IF;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

/**
 * Booking validation and business rules trigger
 * Ensures booking data integrity and business logic compliance
 */
export const createBookingValidationTriggerFunction = sql`
  CREATE OR REPLACE FUNCTION booking_validation_trigger_function()
  RETURNS TRIGGER AS $$
  DECLARE
    room_availability INTEGER;
    hotel_active BOOLEAN;
  BEGIN
    -- Validate booking dates
    IF NEW.check_in >= NEW.check_out THEN
      RAISE EXCEPTION 'Check-out date must be after check-in date';
    END IF;
    
    IF NEW.check_in < CURRENT_DATE THEN
      RAISE EXCEPTION 'Check-in date cannot be in the past';
    END IF;
    
    -- Calculate nights automatically
    NEW.nights := EXTRACT(DAY FROM (NEW.check_out - NEW.check_in));
    
    -- Validate guest counts
    IF NEW.adults < 1 THEN
      RAISE EXCEPTION 'At least one adult is required';
    END IF;
    
    IF NEW.adults + NEW.children > 10 THEN
      RAISE EXCEPTION 'Maximum 10 guests per booking';
    END IF;
    
    -- Check hotel is active
    SELECT is_active INTO hotel_active 
    FROM hotels 
    WHERE id = NEW.hotel_id;
    
    IF NOT hotel_active THEN
      RAISE EXCEPTION 'Cannot book inactive hotel';
    END IF;
    
    -- Generate unique confirmation number if not provided
    IF NEW.confirmation_number IS NULL OR NEW.confirmation_number = '' THEN
      NEW.confirmation_number := 'BK' || to_char(NOW(), 'YYYYMMDD') || '-' || 
                                UPPER(substring(md5(random()::text) from 1 for 6));
    END IF;
    
    -- Set cancellation deadline (24 hours before check-in by default)
    IF NEW.cancellation_deadline IS NULL THEN
      NEW.cancellation_deadline := NEW.check_in - INTERVAL '24 hours';
    END IF;
    
    -- Validate total amount
    IF NEW.total_amount <= 0 THEN
      RAISE EXCEPTION 'Total amount must be positive';
    END IF;
    
    -- Update status history on status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
      INSERT INTO booking_status_history (
        booking_id,
        previous_status,
        new_status,
        reason,
        changed_by
      ) VALUES (
        NEW.id,
        OLD.status,
        NEW.status,
        'Status updated via trigger',
        current_setting('app.current_user_id', true)::uuid
      );
    END IF;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

/**
 * Room availability tracking trigger
 * Updates room availability when bookings are created/modified/cancelled
 */
export const createRoomAvailabilityTriggerFunction = sql`
  CREATE OR REPLACE FUNCTION room_availability_trigger_function()
  RETURNS TRIGGER AS $$
  DECLARE
    booking_date DATE;
  BEGIN
    -- Handle booking creation/confirmation
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
      -- Decrease availability for each night
      FOR booking_date IN SELECT generate_series(NEW.check_in::date, NEW.check_out::date - 1, '1 day'::interval)::date LOOP
        INSERT INTO room_availability (room_id, date, available, booked, price, currency)
        VALUES (NEW.room_id, booking_date, -1, 1, NEW.room_rate / NEW.nights, NEW.currency)
        ON CONFLICT (room_id, date) DO UPDATE SET
          booked = room_availability.booked + 1,
          available = GREATEST(room_availability.available - 1, 0),
          last_updated = NOW();
      END LOOP;
    END IF;
    
    -- Handle booking cancellation
    IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      -- Increase availability for each night
      FOR booking_date IN SELECT generate_series(OLD.check_in::date, OLD.check_out::date - 1, '1 day'::interval)::date LOOP
        UPDATE room_availability 
        SET 
          booked = GREATEST(booked - 1, 0),
          available = available + 1,
          last_updated = NOW()
        WHERE room_id = OLD.room_id AND date = booking_date;
      END LOOP;
    END IF;
    
    -- Handle booking deletion
    IF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
      FOR booking_date IN SELECT generate_series(OLD.check_in::date, OLD.check_out::date - 1, '1 day'::interval)::date LOOP
        UPDATE room_availability 
        SET 
          booked = GREATEST(booked - 1, 0),
          available = available + 1,
          last_updated = NOW()
        WHERE room_id = OLD.room_id AND date = booking_date;
      END LOOP;
      RETURN OLD;
    END IF;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

/**
 * Hotel rating update trigger
 * Automatically recalculates hotel ratings when reviews are added/updated
 */
export const createHotelRatingTriggerFunction = sql`
  CREATE OR REPLACE FUNCTION hotel_rating_trigger_function()
  RETURNS TRIGGER AS $$
  DECLARE
    avg_rating NUMERIC;
    review_count INTEGER;
  BEGIN
    -- Calculate new average rating and count
    SELECT 
      COALESCE(AVG(rating), 0),
      COUNT(*)
    INTO avg_rating, review_count
    FROM reviews 
    WHERE hotel_id = COALESCE(NEW.hotel_id, OLD.hotel_id) AND is_approved = true;
    
    -- Update hotel rating
    UPDATE hotels 
    SET 
      rating = avg_rating,
      review_count = review_count,
      updated_at = NOW()
    WHERE id = COALESCE(NEW.hotel_id, OLD.hotel_id);
    
    -- Update search performance scores
    UPDATE hotel_search
    SET 
      quality_score = (avg_rating / 5.0) * 100,
      last_indexed = NOW(),
      updated_at = NOW()
    WHERE hotel_id = COALESCE(NEW.hotel_id, OLD.hotel_id);
    
    CASE TG_OP
      WHEN 'DELETE' THEN RETURN OLD;
      ELSE RETURN NEW;
    END CASE;
  END;
  $$ LANGUAGE plpgsql;
`;

/**
 * Updated timestamp trigger
 * Automatically updates the updated_at column on any change
 */
export const createUpdatedAtTriggerFunction = sql`
  CREATE OR REPLACE FUNCTION updated_at_trigger_function()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

/**
 * Create all trigger functions
 */
export const createTriggerFunctions = [
	createAuditTriggerFunction,
	createHotelSearchTriggerFunction,
	createBookingValidationTriggerFunction,
	createRoomAvailabilityTriggerFunction,
	createHotelRatingTriggerFunction,
	createUpdatedAtTriggerFunction,
];

/**
 * Apply triggers to tables
 */
export const createTriggers = [
	// Audit triggers
	sql`CREATE TRIGGER audit_hotels_trigger 
      AFTER INSERT OR UPDATE OR DELETE ON hotels 
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();`,

	sql`CREATE TRIGGER audit_bookings_trigger 
      AFTER INSERT OR UPDATE OR DELETE ON bookings 
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();`,

	sql`CREATE TRIGGER audit_payments_trigger 
      AFTER INSERT OR UPDATE OR DELETE ON payments 
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();`,

	sql`CREATE TRIGGER audit_users_trigger 
      AFTER INSERT OR UPDATE OR DELETE ON users 
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();`,

	// Hotel search maintenance
	sql`CREATE TRIGGER hotel_search_trigger 
      BEFORE INSERT OR UPDATE ON hotels 
      FOR EACH ROW EXECUTE FUNCTION hotel_search_trigger_function();`,

	// Booking validation and business rules
	sql`CREATE TRIGGER booking_validation_trigger 
      BEFORE INSERT OR UPDATE ON bookings 
      FOR EACH ROW EXECUTE FUNCTION booking_validation_trigger_function();`,

	// Room availability tracking
	sql`CREATE TRIGGER room_availability_trigger 
      AFTER INSERT OR UPDATE OR DELETE ON bookings 
      FOR EACH ROW EXECUTE FUNCTION room_availability_trigger_function();`,

	// Hotel rating updates
	sql`CREATE TRIGGER hotel_rating_trigger 
      AFTER INSERT OR UPDATE OR DELETE ON reviews 
      FOR EACH ROW EXECUTE FUNCTION hotel_rating_trigger_function();`,

	// Updated timestamp triggers
	sql`CREATE TRIGGER updated_at_hotels_trigger 
      BEFORE UPDATE ON hotels 
      FOR EACH ROW EXECUTE FUNCTION updated_at_trigger_function();`,

	sql`CREATE TRIGGER updated_at_bookings_trigger 
      BEFORE UPDATE ON bookings 
      FOR EACH ROW EXECUTE FUNCTION updated_at_trigger_function();`,

	sql`CREATE TRIGGER updated_at_users_trigger 
      BEFORE UPDATE ON users 
      FOR EACH ROW EXECUTE FUNCTION updated_at_trigger_function();`,

	sql`CREATE TRIGGER updated_at_payments_trigger 
      BEFORE UPDATE ON payments 
      FOR EACH ROW EXECUTE FUNCTION updated_at_trigger_function();`,

	sql`CREATE TRIGGER updated_at_rooms_trigger 
      BEFORE UPDATE ON rooms 
      FOR EACH ROW EXECUTE FUNCTION updated_at_trigger_function();`,
];
