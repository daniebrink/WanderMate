-- ============================================================================
-- WanderMate Local PostgreSQL Schema
-- ============================================================================
-- Run this against your local PostgreSQL database (or any Postgres host).
-- Creates the full schema minus Supabase-specific features (auth.users, RLS).
--
-- Usage:  psql $DATABASE_URL -f migrations/001_local_postgres.sql
-- ============================================================================

-- ============================================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('tourist', 'guide', 'driver', 'city_admin', 'super_admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type') THEN
    CREATE TYPE booking_type AS ENUM ('activity', 'guide_hourly', 'driver_hourly', 'driver_distance', 'driver_own_car', 'package', 'surprise_me');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'declined', 'disputed', 'reviewed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE difficulty_level AS ENUM ('easy', 'moderate', 'challenging', 'extreme');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_type') THEN
    CREATE TYPE price_type AS ENUM ('fixed', 'per_person');
  END IF;
END
$$;

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.0 users — Local auth table (replaces Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2.1 cities — Master city configuration
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  country text NOT NULL,
  currency_code text NOT NULL,
  currency_symbol text NOT NULL,
  map_center_lat decimal(10,8) NOT NULL,
  map_center_lng decimal(11,8) NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  whatsapp_country_code text NOT NULL,
  hero_images text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  verification_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_active ON cities(is_active);

-- ----------------------------------------------------------------------------
-- 2.2 profiles — Extends users with role and display data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL DEFAULT 'tourist',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text UNIQUE,
  avatar_url text,
  preferred_currency text,
  home_city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  bio text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_home_city ON profiles(home_city_id);

-- ----------------------------------------------------------------------------
-- 2.3 guides — Guide-specific profile data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  bio text NOT NULL DEFAULT '',
  tagline text,
  hourly_rate integer,
  languages text[] DEFAULT '{}',
  certifications text[] DEFAULT '{}',
  specialisations text[] DEFAULT '{}',
  years_experience integer,
  gallery_images text[] DEFAULT '{}',
  is_available_hourly boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guides_profile ON guides(profile_id);
CREATE INDEX IF NOT EXISTS idx_guides_verified ON guides(is_verified, is_active);
CREATE INDEX IF NOT EXISTS idx_guides_hourly ON guides(is_available_hourly) WHERE is_available_hourly = true;

-- ----------------------------------------------------------------------------
-- 2.4 drivers — Driver-specific profile data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  bio text NOT NULL DEFAULT '',
  tagline text,
  hourly_rate integer,
  distance_rate integer,
  languages text[] DEFAULT '{}',
  has_own_vehicle boolean NOT NULL DEFAULT true,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_seats integer,
  vehicle_images text[] DEFAULT '{}',
  license_url text,
  roadworthy_cert_url text,
  insurance_cert_url text,
  professional_permit_url text,
  is_available_hourly boolean NOT NULL DEFAULT true,
  is_available_distance boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_profile ON drivers(profile_id);
CREATE INDEX IF NOT EXISTS idx_drivers_verified ON drivers(is_verified, is_active);

-- ----------------------------------------------------------------------------
-- 2.5 guide_cities — Many-to-many: guides can operate in multiple cities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guide_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  areas_covered text[] DEFAULT '{}',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, city_id)
);

CREATE INDEX IF NOT EXISTS idx_guide_cities_city ON guide_cities(city_id, is_active);

-- ----------------------------------------------------------------------------
-- 2.6 driver_cities — Many-to-many: drivers can operate in multiple cities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS driver_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  areas_covered text[] DEFAULT '{}',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, city_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_cities_city ON driver_cities(city_id, is_active);

-- ----------------------------------------------------------------------------
-- 2.7 categories — Activity categories per city (NULL city_id = global default)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_city ON categories(city_id, is_active, sort_order);

-- ----------------------------------------------------------------------------
-- 2.8 distance_options — Radius labels per city
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distance_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  radius_km integer NOT NULL,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distance_options_city ON distance_options(city_id, sort_order);

-- ----------------------------------------------------------------------------
-- 2.9 activities — Tour listings created by guides
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  short_description text,
  duration_hours decimal(4,1),
  price integer NOT NULL,
  price_type price_type NOT NULL DEFAULT 'per_person',
  min_group_size integer NOT NULL DEFAULT 1,
  max_group_size integer,
  difficulty_level difficulty_level,
  included_items text[] DEFAULT '{}',
  excluded_items text[] DEFAULT '{}',
  pickup_address text,
  pickup_lat decimal(10,8),
  pickup_lng decimal(11,8),
  images text[] DEFAULT '{}',
  video_url text,
  languages_offered text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  featured_order integer,
  avg_rating decimal(2,1) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_activities_city ON activities(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_activities_guide ON activities(guide_id, is_active);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category_id);
CREATE INDEX IF NOT EXISTS idx_activities_featured ON activities(city_id, is_featured, featured_order) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_activities_price ON activities(city_id, price);
CREATE INDEX IF NOT EXISTS idx_activities_rating ON activities(city_id, avg_rating DESC);

-- ----------------------------------------------------------------------------
-- 2.10 packages — Combo packages (guide + driver + activity)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  itinerary jsonb NOT NULL DEFAULT '[]',
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  total_price integer NOT NULL,
  duration_hours decimal(4,1),
  max_group_size integer,
  images text[] DEFAULT '{}',
  whats_included text[] DEFAULT '{}',
  whats_not_included text[] DEFAULT '{}',
  pickup_address text,
  pickup_lat decimal(10,8),
  pickup_lng decimal(11,8),
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  avg_rating decimal(2,1) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_packages_city ON packages(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_packages_featured ON packages(city_id, is_featured) WHERE is_featured = true;

-- ----------------------------------------------------------------------------
-- 2.10a package_images — Package images stored as BYTEA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  image_data BYTEA NOT NULL,
  image_mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_images_package ON package_images(package_id, sort_order);

-- ----------------------------------------------------------------------------
-- 2.11 bookings — Core transaction table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  tourist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_type booking_type NOT NULL,
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES guides(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  status booking_status NOT NULL DEFAULT 'draft',
  travel_date date NOT NULL,
  start_time time,
  duration_hours decimal(4,1),
  group_size integer NOT NULL,
  total_price integer,
  deposit_amount integer,
  special_requests text,
  interests text[] DEFAULT '{}',
  distance_radius_km integer,
  pickup_location text,
  pickup_lat decimal(10,8),
  pickup_lng decimal(11,8),
  tourist_has_vehicle boolean NOT NULL DEFAULT false,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  whatsapp_notified boolean NOT NULL DEFAULT false,
  whatsapp_sent_at timestamptz,
  cancelled_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  cancellation_reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_tourist ON bookings(tourist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_guide ON bookings(guide_id, travel_date);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id, travel_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, travel_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(travel_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type, city_id);

-- Business rule constraints
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_bookings_has_provider;
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_has_provider
  CHECK (guide_id IS NOT NULL OR driver_id IS NOT NULL);

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_bookings_activity_type;
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_activity_type
  CHECK (booking_type != 'activity' OR activity_id IS NOT NULL);

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_bookings_package_type;
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_package_type
  CHECK (booking_type != 'package' OR package_id IS NOT NULL);

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_bookings_travel_date;
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_travel_date
  CHECK (travel_date >= CURRENT_DATE OR status IN ('draft', 'cancelled', 'declined', 'completed', 'reviewed', 'disputed'));

-- ----------------------------------------------------------------------------
-- 2.12 booking_status_logs — Immutable audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status booking_status,
  new_status booking_status NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_logs_booking ON booking_status_logs(booking_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.13 reviews — One review per completed booking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_type text NOT NULL CHECK (reviewee_type IN ('guide', 'driver')),
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text,
  photos text[] DEFAULT '{}',
  is_approved boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id, reviewee_type, is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_activity ON reviews(activity_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(reviewee_id, rating DESC);

-- ----------------------------------------------------------------------------
-- 2.14 messages — In-app messaging per booking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.15 notifications — System notification log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'push')),
  type text NOT NULL,
  title text,
  content text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  external_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON notifications(booking_id, channel);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status, channel);

-- ============================================================================
-- 3. TRIGGERS & FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  -- cities
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cities_updated_at') THEN
    CREATE TRIGGER trg_cities_updated_at BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- profiles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- guides
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guides_updated_at') THEN
    CREATE TRIGGER trg_guides_updated_at BEFORE UPDATE ON guides FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- drivers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_drivers_updated_at') THEN
    CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- activities
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activities_updated_at') THEN
    CREATE TRIGGER trg_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- packages
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_packages_updated_at') THEN
    CREATE TRIGGER trg_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- bookings
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_updated_at') THEN
    CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- reviews
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reviews_updated_at') THEN
    CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 3.2 Log every booking status change
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by uuid;
  v_notes text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      v_changed_by := current_setting('app.current_user_id', true)::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_changed_by := NULL;
    END;
    BEGIN
      v_notes := current_setting('app.status_change_note', true);
    EXCEPTION WHEN OTHERS THEN
      v_notes := 'Status updated via application';
    END;

    INSERT INTO booking_status_logs (
      booking_id, previous_status, new_status, changed_by, notes
    ) VALUES (
      NEW.id, OLD.status, NEW.status, v_changed_by, v_notes
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_booking_status_log') THEN
    CREATE TRIGGER trg_booking_status_log AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION log_booking_status_change();
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 3.3 Update cached avg_rating and review_count on activities
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_activity_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_activity_id uuid;
BEGIN
  target_activity_id := COALESCE(NEW.activity_id, OLD.activity_id);
  IF target_activity_id IS NOT NULL THEN
    UPDATE activities
    SET
      avg_rating = COALESCE((
        SELECT AVG(rating)::decimal(2,1)
        FROM reviews
        WHERE activity_id = target_activity_id AND is_approved = true
      ), 0),
      review_count = (
        SELECT COUNT(*)
        FROM reviews
        WHERE activity_id = target_activity_id AND is_approved = true
      )
    WHERE id = target_activity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reviews_activity_rating') THEN
    CREATE TRIGGER trg_reviews_activity_rating
      AFTER INSERT OR UPDATE OR DELETE ON reviews
      FOR EACH ROW EXECUTE FUNCTION update_activity_rating();
  END IF;
END
$$;

-- ============================================================================
-- 4. COMPLETION
-- ============================================================================

COMMENT ON SCHEMA public IS 'WanderMate multi-city tour and experience platform (local PostgreSQL)';
