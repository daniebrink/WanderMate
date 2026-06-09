-- ============================================================================
-- WanderMate Cape Town Seed Data
-- ============================================================================
-- Run this after 0001 and 0002 are applied.
-- Inserts city config, categories, and distance options.
-- Guides/drivers/activities require auth.users and are seeded separately.
-- ============================================================================

-- 1. Insert Cape Town
INSERT INTO public.cities (
  slug, name, country, currency_code, currency_symbol,
  map_center_lat, map_center_lng, timezone, whatsapp_country_code,
  hero_images, is_active, verification_notes
) VALUES (
  'cape-town',
  'Cape Town',
  'South Africa',
  'ZAR',
  'R',
  -33.92490000,
  18.42410000,
  'Africa/Johannesburg',
  '+27',
  ARRAY[
    'cities/cape-town/hero-table-mountain.jpg',
    'cities/cape-town/hero-camps-bay.jpg',
    'cities/cape-town/hero-bo-kaap.jpg'
  ],
  true,
  'Professional Driving Permit (PDP) required for all commercial drivers. Vehicle must have valid roadworthy certificate and insurance.'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert global categories (NULL city_id = available to all cities)
INSERT INTO public.categories (city_id, name, slug, description, icon, sort_order) VALUES
  (NULL, 'Wine Tours', 'wine-tours', 'Explore the Cape Winelands', 'wine', 1),
  (NULL, 'Hiking & Nature', 'hiking-nature', 'Mountain trails and nature walks', 'mountain', 2),
  (NULL, 'Cultural & Historical', 'cultural-historical', 'Township tours, museums, and heritage', 'landmark', 3),
  (NULL, 'Photography', 'photography', 'Scenic and wildlife photography experiences', 'camera', 4),
  (NULL, 'Food & Culinary', 'food-culinary', 'Local markets, cooking classes, and food tours', 'utensils', 5),
  (NULL, 'Wildlife & Safari', 'wildlife-safari', 'Day trips to see African wildlife', 'rabbit', 6),
  (NULL, 'Beaches & Coast', 'beaches-coast', 'Coastal drives and beach experiences', 'waves', 7),
  (NULL, 'Adventure & Sport', 'adventure-sport', 'Surfing, paragliding, shark cage diving', 'zap', 8)
ON CONFLICT DO NOTHING;

-- 3. Insert distance options for Cape Town
WITH ct AS (SELECT id FROM public.cities WHERE slug = 'cape-town')
INSERT INTO public.distance_options (city_id, radius_km, label, description, sort_order)
SELECT ct.id, d.radius_km, d.label, d.description, d.sort_order
FROM ct
CROSS JOIN (VALUES
  (15, 'City Bowl & Atlantic Seaboard', 'Table Mountain, Camps Bay, Sea Point, V&A Waterfront', 1),
  (30, 'Peninsula South', 'Hout Bay, Chapmans Peak, Noordhoek, Simonstown', 2),
  (50, 'Cape Winelands', 'Stellenbosch, Franschhoek, Paarl', 3),
  (80, 'Overberg & Whale Coast', 'Hermanus, Bettys Bay, Kleinmond', 4),
  (150, 'Garden Route Start', 'Mossel Bay, George, Wilderness', 5)
) AS d(radius_km, label, description, sort_order)
ON CONFLICT DO NOTHING;
