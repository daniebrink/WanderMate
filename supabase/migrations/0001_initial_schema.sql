-- ============================================================================
-- WanderMate Initial Schema Migration
-- ============================================================================
-- This migration creates the complete database schema for the WanderMate
-- multi-city tour and experience platform.
--
-- Run with: supabase db push
-- Or execute in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================================

CREATE TYPE public.user_type AS ENUM (
  'tourist',
  'guide',
  'driver',
  'city_admin',
  'super_admin'
);

CREATE TYPE public.booking_type AS ENUM (
  'activity',
  'guide_hourly',
  'driver_hourly',
  'driver_distance',
  'driver_own_car',
  'package',
  'surprise_me'
);

CREATE TYPE public.booking_status AS ENUM (
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
  'disputed',
  'reviewed'
);

CREATE TYPE public.difficulty_level AS ENUM (
  'easy',
  'moderate',
  'challenging',
  'extreme'
);

CREATE TYPE public.price_type AS ENUM (
  'fixed',
  'per_person'
);

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 cities — Master city configuration
-- ----------------------------------------------------------------------------
CREATE TABLE public.cities (
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

COMMENT ON TABLE public.cities IS 'Master configuration for each city hub. Adding a new city = inserting one row.';
COMMENT ON COLUMN public.cities.slug IS 'URL-friendly identifier, e.g., cape-town, johannesburg';
COMMENT ON COLUMN public.cities.is_active IS 'Only active cities are visible to tourists';

CREATE UNIQUE INDEX idx_cities_slug ON public.cities(slug);
CREATE INDEX idx_cities_active ON public.cities(is_active);

-- ----------------------------------------------------------------------------
-- 2.2 profiles — Extends auth.users with role and display data
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type public.user_type NOT NULL DEFAULT 'tourist',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text UNIQUE,
  avatar_url text,
  preferred_currency text,
  home_city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  bio text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS '1:1 extension of auth.users. Never modify auth.users directly.';

CREATE INDEX idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_home_city ON public.profiles(home_city_id);

-- ----------------------------------------------------------------------------
-- 2.3 guides — Guide-specific profile data
-- ----------------------------------------------------------------------------
CREATE TABLE public.guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
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

COMMENT ON TABLE public.guides IS 'One row per guide. References profiles for auth and contact info.';

CREATE INDEX idx_guides_profile ON public.guides(profile_id);
CREATE INDEX idx_guides_verified ON public.guides(is_verified, is_active);
CREATE INDEX idx_guides_hourly ON public.guides(is_available_hourly) WHERE is_available_hourly = true;

-- ----------------------------------------------------------------------------
-- 2.4 drivers — Driver-specific profile data
-- ----------------------------------------------------------------------------
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
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

COMMENT ON TABLE public.drivers IS 'One row per driver. Vehicle and verification docs stored as Storage URLs.';

CREATE INDEX idx_drivers_profile ON public.drivers(profile_id);
CREATE INDEX idx_drivers_verified ON public.drivers(is_verified, is_active);

-- ----------------------------------------------------------------------------
-- 2.5 guide_cities — Many-to-many: guides can operate in multiple cities
-- ----------------------------------------------------------------------------
CREATE TABLE public.guide_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  areas_covered text[] DEFAULT '{}',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, city_id)
);

CREATE INDEX idx_guide_cities_city ON public.guide_cities(city_id, is_active);

-- ----------------------------------------------------------------------------
-- 2.6 driver_cities — Many-to-many: drivers can operate in multiple cities
-- ----------------------------------------------------------------------------
CREATE TABLE public.driver_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  areas_covered text[] DEFAULT '{}',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, city_id)
);

CREATE INDEX idx_driver_cities_city ON public.driver_cities(city_id, is_active);

-- ----------------------------------------------------------------------------
-- 2.7 categories — Activity categories per city (NULL city_id = global default)
-- ----------------------------------------------------------------------------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_city ON public.categories(city_id, is_active, sort_order);

-- ----------------------------------------------------------------------------
-- 2.8 distance_options — Radius labels per city (e.g., "30km = Hout Bay")
-- ----------------------------------------------------------------------------
CREATE TABLE public.distance_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  radius_km integer NOT NULL,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_distance_options_city ON public.distance_options(city_id, sort_order);

-- ----------------------------------------------------------------------------
-- 2.9 activities — Tour listings created by guides
-- ----------------------------------------------------------------------------
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  short_description text,
  duration_hours decimal(4,1),
  price integer NOT NULL,
  price_type public.price_type NOT NULL DEFAULT 'per_person',
  min_group_size integer NOT NULL DEFAULT 1,
  max_group_size integer,
  difficulty_level public.difficulty_level,
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

COMMENT ON TABLE public.activities IS 'Tour listings. avg_rating and review_count are cached via triggers.';

CREATE INDEX idx_activities_city ON public.activities(city_id, is_active);
CREATE INDEX idx_activities_guide ON public.activities(guide_id, is_active);
CREATE INDEX idx_activities_category ON public.activities(category_id);
CREATE INDEX idx_activities_featured ON public.activities(city_id, is_featured, featured_order) WHERE is_featured = true;
CREATE INDEX idx_activities_price ON public.activities(city_id, price);
CREATE INDEX idx_activities_rating ON public.activities(city_id, avg_rating DESC);

-- ----------------------------------------------------------------------------
-- 2.10 packages — Combo packages (guide + driver + activity)
-- ----------------------------------------------------------------------------
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  itinerary jsonb NOT NULL DEFAULT '[]',
  guide_id uuid REFERENCES public.guides(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
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

CREATE INDEX idx_packages_city ON public.packages(city_id, is_active);
CREATE INDEX idx_packages_featured ON public.packages(city_id, is_featured) WHERE is_featured = true;

-- ----------------------------------------------------------------------------
-- 2.10a package_images — Package images stored as BYTEA
-- ----------------------------------------------------------------------------
CREATE TABLE public.package_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  image_data BYTEA NOT NULL,
  image_mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_package_images_package ON public.package_images(package_id, sort_order);

-- ----------------------------------------------------------------------------
-- 2.11 bookings — Core transaction table
-- ----------------------------------------------------------------------------
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  tourist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_type public.booking_type NOT NULL,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES public.guides(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  status public.booking_status NOT NULL DEFAULT 'draft',
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
  cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bookings IS 'The core transaction. Every booking request, confirmation, and completion lives here.';

CREATE INDEX idx_bookings_city ON public.bookings(city_id, status);
CREATE INDEX idx_bookings_tourist ON public.bookings(tourist_id, created_at DESC);
CREATE INDEX idx_bookings_guide ON public.bookings(guide_id, travel_date);
CREATE INDEX idx_bookings_driver ON public.bookings(driver_id, travel_date);
CREATE INDEX idx_bookings_status ON public.bookings(status, travel_date);
CREATE INDEX idx_bookings_date ON public.bookings(travel_date, status);
CREATE INDEX idx_bookings_type ON public.bookings(booking_type, city_id);

-- Business rule constraints
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_bookings_has_provider 
  CHECK (guide_id IS NOT NULL OR driver_id IS NOT NULL);

ALTER TABLE public.bookings
  ADD CONSTRAINT chk_bookings_activity_type 
  CHECK (booking_type != 'activity' OR activity_id IS NOT NULL);

ALTER TABLE public.bookings
  ADD CONSTRAINT chk_bookings_package_type 
  CHECK (booking_type != 'package' OR package_id IS NOT NULL);

ALTER TABLE public.bookings
  ADD CONSTRAINT chk_bookings_travel_date 
  CHECK (travel_date >= CURRENT_DATE OR status IN ('draft', 'cancelled', 'declined', 'completed', 'reviewed', 'disputed'));

-- ----------------------------------------------------------------------------
-- 2.12 booking_status_logs — Immutable audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE public.booking_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  previous_status public.booking_status,
  new_status public.booking_status NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_status_logs IS 'Immutable record of every status change. Never update or delete rows.';

CREATE INDEX idx_status_logs_booking ON public.booking_status_logs(booking_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.13 reviews — One review per completed booking
-- ----------------------------------------------------------------------------
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_type text NOT NULL CHECK (reviewee_type IN ('guide', 'driver')),
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text,
  photos text[] DEFAULT '{}',
  is_approved boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id, reviewee_type, is_approved);
CREATE INDEX idx_reviews_activity ON public.reviews(activity_id, is_approved);
CREATE INDEX idx_reviews_rating ON public.reviews(reviewee_id, rating DESC);

-- ----------------------------------------------------------------------------
-- 2.14 messages — In-app messaging per booking
-- ----------------------------------------------------------------------------
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_booking ON public.messages(booking_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.15 notifications — System notification log (WhatsApp, email, push)
-- ----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
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

CREATE INDEX idx_notifications_profile ON public.notifications(profile_id, created_at DESC);
CREATE INDEX idx_notifications_booking ON public.notifications(booking_id, channel);
CREATE INDEX idx_notifications_status ON public.notifications(status, channel);

-- ============================================================================
-- 3. TRIGGERS & FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Auto-create profile when auth.users row is inserted
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3.2 Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_cities_updated_at
  BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_guides_updated_at
  BEFORE UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3.3 Log every booking status change to booking_status_logs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by uuid;
  v_notes text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Try to get current user from session variable (set by application)
    BEGIN
      v_changed_by := current_setting('app.current_user_id', true)::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_changed_by := NULL;
    END;
    
    -- Try to get note from session variable
    BEGIN
      v_notes := current_setting('app.status_change_note', true);
    EXCEPTION WHEN OTHERS THEN
      v_notes := 'Status updated via application';
    END;

    INSERT INTO public.booking_status_logs (
      booking_id, previous_status, new_status, changed_by, notes
    ) VALUES (
      NEW.id, OLD.status, NEW.status, v_changed_by, v_notes
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_status_log
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

-- ----------------------------------------------------------------------------
-- 3.4 Update cached avg_rating and review_count on activities
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_activity_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_activity_id uuid;
BEGIN
  target_activity_id := COALESCE(NEW.activity_id, OLD.activity_id);
  
  IF target_activity_id IS NOT NULL THEN
    UPDATE public.activities
    SET 
      avg_rating = COALESCE((
        SELECT AVG(rating)::decimal(2,1) 
        FROM public.reviews 
        WHERE activity_id = target_activity_id AND is_approved = true
      ), 0),
      review_count = (
        SELECT COUNT(*) 
        FROM public.reviews 
        WHERE activity_id = target_activity_id AND is_approved = true
      )
    WHERE id = target_activity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_activity_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_activity_rating();

-- ----------------------------------------------------------------------------
-- 3.5 Update cached avg_rating and review_count on guides
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_guide_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_profile_id uuid;
BEGIN
  -- reviewee_id is the profile_id of the guide
  target_profile_id := COALESCE(NEW.reviewee_id, OLD.reviewee_id);
  
  IF target_profile_id IS NOT NULL AND COALESCE(NEW.reviewee_type, OLD.reviewee_type) = 'guide' THEN
    UPDATE public.guides
    SET 
      is_verified = is_verified  -- no-op to trigger update
    WHERE profile_id = target_profile_id;
    -- Note: In production, you'd maintain avg_rating on guides table too
    -- For now, reviews table is source of truth; add cache column if needed
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_guide_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_guide_rating();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) — Enable on all tables
-- ============================================================================

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distance_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Note: Detailed RLS policies are in migration 0002_rls_policies.sql
-- This migration focuses on schema structure.

-- ============================================================================
-- 5. COMPLETION
-- ============================================================================

COMMENT ON SCHEMA public IS 'WanderMate multi-city tour and experience platform';
