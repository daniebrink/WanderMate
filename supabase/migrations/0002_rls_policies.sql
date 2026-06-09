-- ============================================================================
-- WanderMate Row Level Security (RLS) Policies
-- ============================================================================
-- These policies enforce multi-tenancy and role-based access control.
-- Every table has RLS enabled from 0001_initial_schema.sql.
-- This migration defines WHO can see/modify WHICH rows.
--
-- Security Principles:
-- 1. Default deny — no policy = no access
-- 2. Tourists see only public data + their own private data
-- 3. Guides/Drivers see only their own data + public data
-- 4. City admins see all data for their assigned city
-- 5. Super admins see everything
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Check if current user is a super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is a city_admin for a specific city
CREATE OR REPLACE FUNCTION public.is_city_admin_for(p_city_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND user_type = 'city_admin'
      AND home_city_id = p_city_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is ANY kind of admin (super or city) for a city
CREATE OR REPLACE FUNCTION public.is_admin_for_city(p_city_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN public.is_super_admin() OR public.is_city_admin_for(p_city_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user owns a specific guide record
CREATE OR REPLACE FUNCTION public.owns_guide(p_guide_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.guides
    WHERE id = p_guide_id AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user owns a specific driver record
CREATE OR REPLACE FUNCTION public.owns_driver(p_driver_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.drivers
    WHERE id = p_driver_id AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get the guide_id for the current user (if they are a guide)
CREATE OR REPLACE FUNCTION public.get_my_guide_id()
RETURNS uuid AS $$
DECLARE
  v_guide_id uuid;
BEGIN
  SELECT id INTO v_guide_id FROM public.guides WHERE profile_id = auth.uid();
  RETURN v_guide_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get the driver_id for the current user (if they are a driver)
CREATE OR REPLACE FUNCTION public.get_my_driver_id()
RETURNS uuid AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  SELECT id INTO v_driver_id FROM public.drivers WHERE profile_id = auth.uid();
  RETURN v_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CITIES
-- ============================================================================

-- Anyone can read active cities
CREATE POLICY "cities_select_public"
  ON public.cities FOR SELECT
  USING (is_active = true);

-- Admins can read all cities (active or not)
CREATE POLICY "cities_select_admin"
  ON public.cities FOR SELECT
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

-- Only super admins can insert/update/delete cities
CREATE POLICY "cities_insert_super"
  ON public.cities FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "cities_update_super"
  ON public.cities FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "cities_delete_super"
  ON public.cities FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- 3. PROFILES
-- ============================================================================

-- Anyone can read basic profile info (needed for displaying guide/driver names)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins can update any profile (e.g., verifying guides, changing user_type)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type IN ('city_admin', 'super_admin')
  ));

-- Only super admins can delete profiles
CREATE POLICY "profiles_delete_super"
  ON public.profiles FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- 4. GUIDES
-- ============================================================================

-- Public can see active, verified guides
CREATE POLICY "guides_select_public"
  ON public.guides FOR SELECT
  USING (is_active = true AND is_verified = true);

-- Guide owners can see their own record (even if not verified/active yet)
CREATE POLICY "guides_select_own"
  ON public.guides FOR SELECT
  USING (profile_id = auth.uid());

-- City admins can see all guides in their city (via guide_cities join logic in app)
-- We allow city admins to read all guides; the app filters by city
CREATE POLICY "guides_select_admin"
  ON public.guides FOR SELECT
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

-- Guide owners can update their own record
CREATE POLICY "guides_update_own"
  ON public.guides FOR UPDATE
  USING (profile_id = auth.uid());

-- Admins can update any guide (verification, activation)
CREATE POLICY "guides_update_admin"
  ON public.guides FOR UPDATE
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

-- Only admins can insert/delete guides (application creates these via onboarding flow)
CREATE POLICY "guides_insert_admin"
  ON public.guides FOR INSERT
  WITH CHECK (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

CREATE POLICY "guides_delete_admin"
  ON public.guides FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- 5. DRIVERS
-- ============================================================================

-- Same pattern as guides
CREATE POLICY "drivers_select_public"
  ON public.drivers FOR SELECT
  USING (is_active = true AND is_verified = true);

CREATE POLICY "drivers_select_own"
  ON public.drivers FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "drivers_select_admin"
  ON public.drivers FOR SELECT
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

CREATE POLICY "drivers_update_own"
  ON public.drivers FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "drivers_update_admin"
  ON public.drivers FOR UPDATE
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

CREATE POLICY "drivers_insert_admin"
  ON public.drivers FOR INSERT
  WITH CHECK (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

CREATE POLICY "drivers_delete_admin"
  ON public.drivers FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- 6. GUIDE_CITIES & DRIVER_CITIES
-- ============================================================================

-- Public can read (needed for filtering guides/drivers by city)
CREATE POLICY "guide_cities_select_public"
  ON public.guide_cities FOR SELECT
  USING (is_active = true);

CREATE POLICY "driver_cities_select_public"
  ON public.driver_cities FOR SELECT
  USING (is_active = true);

-- Owners can read/update their own city assignments
CREATE POLICY "guide_cities_select_own"
  ON public.guide_cities FOR SELECT
  USING (public.owns_guide(guide_id));

CREATE POLICY "driver_cities_select_own"
  ON public.driver_cities FOR SELECT
  USING (public.owns_driver(driver_id));

-- Admins can manage
CREATE POLICY "guide_cities_admin"
  ON public.guide_cities FOR ALL
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

CREATE POLICY "driver_cities_admin"
  ON public.driver_cities FOR ALL
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

-- ============================================================================
-- 7. CATEGORIES
-- ============================================================================

-- Public can read active categories
CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT
  USING (is_active = true);

-- Admins can manage categories for their city (or all cities for super admin)
CREATE POLICY "categories_admin"
  ON public.categories FOR ALL
  USING (public.is_super_admin() OR (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ) AND (
    city_id IS NULL OR public.is_city_admin_for(city_id)
  )));

-- ============================================================================
-- 8. DISTANCE_OPTIONS
-- ============================================================================

-- Public can read
CREATE POLICY "distance_options_select_public"
  ON public.distance_options FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "distance_options_admin"
  ON public.distance_options FOR ALL
  USING (public.is_admin_for_city(city_id));

-- ============================================================================
-- 9. ACTIVITIES
-- ============================================================================

-- Public can see active activities
CREATE POLICY "activities_select_public"
  ON public.activities FOR SELECT
  USING (is_active = true);

-- Guide owners can see all their own activities (including drafts/inactive)
CREATE POLICY "activities_select_own"
  ON public.activities FOR SELECT
  USING (public.owns_guide(guide_id));

-- Admins can see all activities in their city
CREATE POLICY "activities_select_admin"
  ON public.activities FOR SELECT
  USING (public.is_admin_for_city(city_id));

-- Guide owners can insert/update their own activities
CREATE POLICY "activities_insert_own"
  ON public.activities FOR INSERT
  WITH CHECK (public.owns_guide(guide_id));

CREATE POLICY "activities_update_own"
  ON public.activities FOR UPDATE
  USING (public.owns_guide(guide_id));

-- Admins can update any activity in their city
CREATE POLICY "activities_update_admin"
  ON public.activities FOR UPDATE
  USING (public.is_admin_for_city(city_id));

-- Only admins can delete activities
CREATE POLICY "activities_delete_admin"
  ON public.activities FOR DELETE
  USING (public.is_admin_for_city(city_id));

-- ============================================================================
-- 10. PACKAGES
-- ============================================================================

-- Public can see active packages
CREATE POLICY "packages_select_public"
  ON public.packages FOR SELECT
  USING (is_active = true);

-- Admins can manage packages for their city
CREATE POLICY "packages_admin"
  ON public.packages FOR ALL
  USING (public.is_admin_for_city(city_id));

-- ============================================================================
-- 11. BOOKINGS (The most complex policies)
-- ============================================================================

-- Tourists can see their own bookings
CREATE POLICY "bookings_select_tourist"
  ON public.bookings FOR SELECT
  USING (tourist_id = auth.uid());

-- Guides can see bookings assigned to them
CREATE POLICY "bookings_select_guide"
  ON public.bookings FOR SELECT
  USING (guide_id = public.get_my_guide_id());

-- Drivers can see bookings assigned to them
CREATE POLICY "bookings_select_driver"
  ON public.bookings FOR SELECT
  USING (driver_id = public.get_my_driver_id());

-- City admins can see all bookings in their city
CREATE POLICY "bookings_select_city_admin"
  ON public.bookings FOR SELECT
  USING (public.is_admin_for_city(city_id));

-- Tourists can insert their own bookings
CREATE POLICY "bookings_insert_tourist"
  ON public.bookings FOR INSERT
  WITH CHECK (tourist_id = auth.uid());

-- Tourists can update their own draft/pending bookings
CREATE POLICY "bookings_update_tourist"
  ON public.bookings FOR UPDATE
  USING (
    tourist_id = auth.uid()
    AND status IN ('draft', 'pending')
  );

-- Guides can update bookings assigned to them (accept/decline)
CREATE POLICY "bookings_update_guide"
  ON public.bookings FOR UPDATE
  USING (
    guide_id = public.get_my_guide_id()
    AND status IN ('pending', 'confirmed', 'in_progress')
  );

-- Drivers can update bookings assigned to them
CREATE POLICY "bookings_update_driver"
  ON public.bookings FOR UPDATE
  USING (
    driver_id = public.get_my_driver_id()
    AND status IN ('pending', 'confirmed', 'in_progress')
  );

-- Admins can update any booking in their city
CREATE POLICY "bookings_update_admin"
  ON public.bookings FOR UPDATE
  USING (public.is_admin_for_city(city_id));

-- Admins can delete bookings (rare, for data cleanup)
CREATE POLICY "bookings_delete_admin"
  ON public.bookings FOR DELETE
  USING (public.is_admin_for_city(city_id));

-- ============================================================================
-- 12. BOOKING_STATUS_LOGS
-- ============================================================================

-- Same visibility as bookings — if you can see the booking, you can see its logs
CREATE POLICY "status_logs_select_tourist"
  ON public.booking_status_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.tourist_id = auth.uid()
  ));

CREATE POLICY "status_logs_select_guide"
  ON public.booking_status_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.guide_id = public.get_my_guide_id()
  ));

CREATE POLICY "status_logs_select_driver"
  ON public.booking_status_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.driver_id = public.get_my_driver_id()
  ));

CREATE POLICY "status_logs_select_admin"
  ON public.booking_status_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND public.is_admin_for_city(b.city_id)
  ));

-- Only the trigger can insert status logs
CREATE POLICY "status_logs_insert_trigger"
  ON public.booking_status_logs FOR INSERT
  WITH CHECK (false); -- Application bypasses RLS for trigger inserts or uses service role

-- ============================================================================
-- 13. REVIEWS
-- ============================================================================

-- Public can read approved reviews
CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  USING (is_approved = true);

-- Reviewers can read their own reviews (even if not yet approved)
CREATE POLICY "reviews_select_reviewer"
  ON public.reviews FOR SELECT
  USING (reviewer_id = auth.uid());

-- Reviewees can read reviews about them
CREATE POLICY "reviews_select_reviewee"
  ON public.reviews FOR SELECT
  USING (reviewee_id = auth.uid());

-- Admins can read all reviews
CREATE POLICY "reviews_select_admin"
  ON public.reviews FOR SELECT
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

-- Tourists can insert reviews for their completed bookings
CREATE POLICY "reviews_insert_tourist"
  ON public.reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.tourist_id = auth.uid()
        AND b.status IN ('completed', 'reviewed')
    )
  );

-- Reviewers can update their own review (within 24h of creation)
CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE
  USING (
    reviewer_id = auth.uid()
    AND created_at > now() - interval '24 hours'
  );

-- Admins can update any review (approve/hide/featue)
CREATE POLICY "reviews_update_admin"
  ON public.reviews FOR UPDATE
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'city_admin'
  ));

-- Only admins can delete reviews
CREATE POLICY "reviews_delete_admin"
  ON public.reviews FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- 14. MESSAGES
-- ============================================================================

-- Only sender and recipient can see messages
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Senders can insert messages (must be part of the booking)
CREATE POLICY "messages_insert_sender"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.tourist_id = auth.uid() OR b.guide_id = public.get_my_guide_id() OR b.driver_id = public.get_my_driver_id())
    )
  );

-- Recipients can update is_read status
CREATE POLICY "messages_update_recipient"
  ON public.messages FOR UPDATE
  USING (recipient_id = auth.uid());

-- No delete policy — messages are permanent

-- ============================================================================
-- 15. NOTIFICATIONS
-- ============================================================================

-- Recipients can see their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (profile_id = auth.uid());

-- Admins can see all notifications (for debugging)
CREATE POLICY "notifications_select_admin"
  ON public.notifications FOR SELECT
  USING (public.is_super_admin());

-- Only system/Edge Functions insert notifications (service role bypasses RLS)
CREATE POLICY "notifications_insert_system"
  ON public.notifications FOR INSERT
  WITH CHECK (false); -- Service role bypasses RLS

-- Recipients can update their own notifications (mark as read, etc.)
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (profile_id = auth.uid());

-- ============================================================================
-- 16. FORCE RLS FOR AUTHENTICATED AND ANONYMOUS USERS
-- ============================================================================

-- Ensure RLS applies to ALL roles including postgres (service role bypasses via config)
ALTER TABLE public.cities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guides FORCE ROW LEVEL SECURITY;
ALTER TABLE public.drivers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guide_cities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.driver_cities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.distance_options FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.packages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 17. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.is_super_admin IS 'Returns true if current user has user_type = super_admin';
COMMENT ON FUNCTION public.is_city_admin_for IS 'Returns true if current user is a city_admin for the given city_id';
COMMENT ON FUNCTION public.is_admin_for_city IS 'Returns true if current user is super_admin OR city_admin for the given city';
COMMENT ON FUNCTION public.owns_guide IS 'Returns true if current user owns the given guide record';
COMMENT ON FUNCTION public.owns_driver IS 'Returns true if current user owns the given driver record';
