# WanderMate — Cape Town Pilot Seed Data

> Realistic seed data for development, testing, and demo purposes. This represents the initial content needed to launch the Cape Town hub with a compelling, believable set of guides, drivers, and activities.
>
> All prices are in South African Rand (ZAR), stored as cents in the database.

---

## 1. City Configuration

```sql
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
);
```

**City Slug:** `cape-town`

---

## 2. Activity Categories

```sql
INSERT INTO public.categories (city_id, name, slug, description, icon, sort_order) VALUES
  (NULL, 'Wine Tours', 'wine-tours', 'Explore the Cape Winelands', 'wine', 1),
  (NULL, 'Hiking & Nature', 'hiking-nature', 'Mountain trails and nature walks', 'mountain', 2),
  (NULL, 'Cultural & Historical', 'cultural-historical', 'Township tours, museums, and heritage', 'landmark', 3),
  (NULL, 'Photography', 'photography', 'Scenic and wildlife photography experiences', 'camera', 4),
  (NULL, 'Food & Culinary', 'food-culinary', 'Local markets, cooking classes, and food tours', 'utensils', 5),
  (NULL, 'Wildlife & Safari', 'wildlife-safari', 'Day trips to see African wildlife', 'rabbit', 6),
  (NULL, 'Beaches & Coast', 'beaches-coast', 'Coastal drives and beach experiences', 'waves', 7),
  (NULL, 'Adventure & Sport', 'adventure-sport', 'Surfing, paragliding, shark cage diving', 'zap', 8);
```

*Note: `city_id = NULL` makes these global defaults. The application copies them when a new city is created. For Cape Town, all of these are relevant and active.*

---

## 3. Distance Options

```sql
INSERT INTO public.distance_options (city_id, radius_km, label, description, sort_order) VALUES
  ((SELECT id FROM public.cities WHERE slug = 'cape-town'), 15, 'City Bowl & Atlantic Seaboard', 'Table Mountain, Camps Bay, Sea Point, V&A Waterfront', 1),
  ((SELECT id FROM public.cities WHERE slug = 'cape-town'), 30, 'Peninsula South', 'Hout Bay, Chapmans Peak, Noordhoek, Simonstown', 2),
  ((SELECT id FROM public.cities WHERE slug = 'cape-town'), 50, 'Cape Winelands', 'Stellenbosch, Franschhoek, Paarl', 3),
  ((SELECT id FROM public.cities WHERE slug = 'cape-town'), 80, 'Overberg & Whale Coast', 'Hermanus, Bettys Bay, Kleinmond', 4),
  ((SELECT id FROM public.cities WHERE slug = 'cape-town'), 150, 'Garden Route Start', 'Mossel Bay, George, Wilderness', 5);
```

---

## 4. Guides

### Guide 1: Thandiwe Mokoena — Township & Cultural Specialist

**Profile:**
- Name: Thandiwe Mokoena
- Phone: +27821234501
- Languages: English, isiXhosa, Afrikaans
- Bio: "Born and raised in Langa, I share authentic stories of Cape Town's townships beyond the stereotypes. 12 years experience."
- Hourly Rate: R180/hour (18000 cents)
- Specialisations: Township Tours, Cultural History, Storytelling
- Certifications: First Aid Level 2, SATSA Registered
- Years Experience: 12
- Available Hourly: Yes

**Activities:**
1. **Langa Township Walking Tour** — R450/person, 3 hours, min 2, max 8
   - Visit a local shebeen, art centre, and meet community members
   - Includes: Local lunch, donation to community project
   - Pickup: V&A Waterfront or CBD hotels

2. **Bo-Kaap Cultural & Cooking Experience** — R650/person, 4 hours, min 2, max 6
   - Walk the colourful streets, learn about Cape Malay heritage, cook a traditional curry
   - Includes: Ingredients, recipe card, meal
   - Pickup: Bo-Kaap (or hotel transfer)

### Guide 2: James van der Merwe — Wine & Nature Expert

**Profile:**
- Name: James van der Merwe
- Phone: +27821234502
- Languages: English, Afrikaans
- Bio: "Third-generation Stellenbosch local. I know every vineyard worth visiting and the stories behind them. Wine judge certified."
- Hourly Rate: R250/hour (25000 cents)
- Specialisations: Wine Tours, Nature Walks, History
- Certifications: WSET Level 3, First Aid
- Years Experience: 8
- Available Hourly: Yes

**Activities:**
1. **Stellenbosch Premium Wine Route** — R1200/person, 6 hours, min 2, max 6
   - 4 boutique wineries, private tastings, cellar tour
   - Includes: All tastings, lunch pairing, transport coordination
   - Pickup: Cape Town CBD

2. **Kirstenbosch Botanical Gardens Walk** — R350/person, 2.5 hours, min 1, max 10
   - Indigenous flora, medicinal plants, Table Mountain ecology
   - Includes: Garden entry fee
   - Pickup: Kirstenbosch gates

### Guide 3: Sarah Chen — Adventure & Photography

**Profile:**
- Name: Sarah Chen
- Phone: +27821234503
- Languages: English, Mandarin
- Bio: "Professional photographer and hiking guide. I help you capture Cape Town's most Instagram-worthy spots while keeping you safe on the trails."
- Hourly Rate: R200/hour (20000 cents)
- Specialisations: Photography, Hiking, Adventure Tours
- Certifications: Wilderness First Responder, Drone Pilot License
- Years Experience: 5
- Available Hourly: Yes

**Activities:**
1. **Table Mountain Sunrise Photography Hike** — R550/person, 4 hours, min 2, max 5
   - Platteklip Gorge route, golden hour shooting techniques
   - Includes: Snacks, photography tips booklet
   - Difficulty: Moderate
   - Pickup: Lower Cable Station

2. **Cape Point & Chapmans Peak Photo Safari** — R850/person, 8 hours, min 2, max 4
   - Scenic drive with multiple photo stops, ostrich viewing, lighthouse
   - Includes: Park entry fees, lunch
   - Pickup: Cape Town CBD

### Guide 4: David Nkosi — Wildlife & Safari Specialist

**Profile:**
- Name: David Nkosi
- Phone: +27821234504
- Languages: English, isiZulu, Afrikaans
- Bio: "Former game ranger turned specialist guide. I know where the wildlife is and how to find it."
- Hourly Rate: R220/hour (22000 cents)
- Specialisations: Wildlife, Safari, Birding
- Certifications: FGASA Level 2, Wilderness First Aid
- Years Experience: 15
- Available Hourly: No (fixed tours only)

**Activities:**
1. **Aquila Private Game Reserve Day Safari** — R2200/person, 10 hours, min 2, max 6
   - Big 5 game drive, buffet lunch, swimming pool
   - Includes: Return transport, reserve entry, lunch, game drive
   - Pickup: Cape Town CBD (05:30 AM)

2. **Birding at Rondevlei Nature Reserve** — R400/person, 3 hours, min 2, max 8
   - Flamingos, pelicans, and 200+ bird species
   - Includes: Reserve entry, binoculars, bird checklist
   - Pickup: Grassy Park or CBD

### Guide 5: Emma Ross — Food & Lifestyle

**Profile:**
- Name: Emma Ross
- Phone: +27821234505
- Languages: English, French
- Bio: "Chef, food writer, and market obsessive. I'll show you where Capetonians actually eat — from township braais to fine dining."
- Hourly Rate: R200/hour (20000 cents)
- Specialisations: Food Tours, Markets, Cooking
- Certifications: Professional Chef Diploma
- Years Experience: 7
- Available Hourly: Yes

**Activities:**
1. **Old Biscuit Mill Saturday Market Food Tour** — R500/person, 3 hours, min 2, max 6
   - Curated tastings, meet the producers, sourdough workshop
   - Includes: All tastings, coffee, recipe cards
   - Pickup: Woodstock (or CBD transfer)

2. **Cape Malay Cooking Class in Bo-Kaap** — R750/person, 4 hours, min 2, max 6
   - Shop for spices at Atlas Trading, cook 3 dishes, feast together
   - Includes: All ingredients, spice pack to take home
   - Pickup: Bo-Kaap

---

## 5. Drivers

### Driver 1: Pieter de Klerk — Luxury sedan & wine specialist

**Profile:**
- Name: Pieter de Klerk
- Phone: +27822345601
- Languages: English, Afrikaans
- Bio: "Professional chauffeur with 20 years experience. Specialist in wine route driving — I know the back roads and the best lunch stops."
- Hourly Rate: R350/hour (35000 cents)
- Distance Rate: R12/km (12 cents)
- Vehicle: Mercedes-Benz E-Class, 2021, 4 seats
- Has Own Vehicle: Yes
- Available Hourly: Yes
- Available Distance: Yes

**Verification:**
- PDP: Yes
- Roadworthy: Yes
- Insurance: Comprehensive commercial

### Driver 2: Bongani Mthembu — Safari vehicle & large groups

**Profile:**
- Name: Bongani Mthembu
- Phone: +27822345602
- Languages: English, isiXhosa, isiZulu
- Bio: "Experienced overland driver. My Toyota Land Cruiser can go anywhere — beaches, mountains, game reserves. Perfect for families and groups."
- Hourly Rate: R400/hour (40000 cents)
- Vehicle: Toyota Land Cruiser 79, 2019, 9 seats
- Has Own Vehicle: Yes
- Available Hourly: Yes
- Available Distance: Yes

**Verification:**
- PDP: Yes
- Roadworthy: Yes
- Insurance: Yes

### Driver 3: Fatima Hassen — City specialist & own-car driver

**Profile:**
- Name: Fatima Hassen
- Phone: +27822345603
- Languages: English, Afrikaans
- Bio: "City driving specialist. I navigate Cape Town's traffic so you don't have to. Also available to drive your rental car if you're nervous on our roads."
- Hourly Rate: R280/hour (28000 cents)
- Vehicle: Hyundai Tucson, 2022, 5 seats
- Has Own Vehicle: Yes
- Available Hourly: Yes
- Available Distance: Yes
- Also Offers: Drive tourist's own car (+R50/hour discount)

**Verification:**
- PDP: Yes
- Roadworthy: Yes
- Insurance: Yes

---

## 6. Combo Packages

### Package 1: "Ultimate Cape Town Day" — Guide + Driver + Activities

**Price:** R3500/person (min 2, max 4)
**Duration:** 10 hours
**Description:** "The perfect introduction to Cape Town. Your private guide and driver take you from sunrise on Table Mountain to sunset wine tasting."

**Itinerary:**
1. 06:00 — Hotel pickup (driver)
2. 06:30 — Table Mountain sunrise hike with photography tips (guide)
3. 10:00 — Breakfast at V&A Waterfront
4. 11:30 — Bo-Kaap cultural walk (guide)
5. 13:30 — Lunch at Old Biscuit Mill
6. 15:00 — Drive to Stellenbosch (driver)
7. 16:00 — Two boutique wine tastings
8. 18:30 — Return to Cape Town

**Assigned:** Guide Sarah Chen + Driver Pieter de Klerk

### Package 2: "Wildlife & Culture Weekend"

**Price:** R5800/person (min 2, max 4)
**Duration:** 2 days
**Description:** "Saturday safari, Sunday township culture. Includes one night accommodation near Aquila Reserve."

**Itinerary:**
- Day 1: Aquila Big 5 safari with David Nkosi, overnight at reserve lodge
- Day 2: Return via Langa township tour with Thandiwe Mokoena

**Assigned:** Guide David Nkosi (Day 1) + Thandiwe Mokoena (Day 2) + Driver Bongani Mthembu

---

## 7. Sample Bookings for Testing

These represent bookings in various states for dashboard and state-machine testing:

| Booking | Type | Status | Guide/Driver | Date | Purpose |
|---------|------|--------|--------------|------|---------|
| #1 | activity | `pending` | Thandiwe / — | Tomorrow | Test guide acceptance flow |
| #2 | guide_hourly | `confirmed` | James / — | Next week | Test tourist dashboard "upcoming" |
| #3 | driver_hourly | `in_progress` | — / Pieter | Today | Test "today" view |
| #4 | activity | `completed` | Sarah / — | 3 days ago | Test review prompt |
| #5 | package | `reviewed` | David+Thandi / Bongani | 2 weeks ago | Test archived booking |
| #6 | driver_distance | `declined` | — / Fatima | Next week | Test declined state |
| #7 | surprise_me | `draft` | — / — | — | Test draft persistence |
| #8 | activity | `cancelled` | James / — | Next week | Test cancellation flow |
| #9 | activity | `disputed` | Thandiwe / — | Yesterday | Test admin intervention |

---

## 8. Complete Seed SQL Migration

Below is the complete SQL to insert all seed data. Save as `migrations/002_seed_cape_town.sql`.

```sql
-- ============================================================================
-- WanderMate Cape Town Seed Data
-- ============================================================================
-- Run after 001_local_postgres.sql
-- ============================================================================

-- 1. Insert city
INSERT INTO public.cities (slug, name, country, currency_code, currency_symbol, map_center_lat, map_center_lng, timezone, whatsapp_country_code, hero_images, is_active, verification_notes)
VALUES ('cape-town', 'Cape Town', 'South Africa', 'ZAR', 'R', -33.92490000, 18.42410000, 'Africa/Johannesburg', '+27', ARRAY['cities/cape-town/hero-1.jpg'], true, 'PDP required');

-- 2. Insert categories (global)
INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
  ('Wine Tours', 'wine-tours', 'Explore the Cape Winelands', 'wine', 1),
  ('Hiking & Nature', 'hiking-nature', 'Mountain trails and nature walks', 'mountain', 2),
  ('Cultural & Historical', 'cultural-historical', 'Township tours, museums, and heritage', 'landmark', 3),
  ('Photography', 'photography', 'Scenic and wildlife photography experiences', 'camera', 4),
  ('Food & Culinary', 'food-culinary', 'Local markets, cooking classes, and food tours', 'utensils', 5),
  ('Wildlife & Safari', 'wildlife-safari', 'Day trips to see African wildlife', 'rabbit', 6),
  ('Beaches & Coast', 'beaches-coast', 'Coastal drives and beach experiences', 'waves', 7),
  ('Adventure & Sport', 'adventure-sport', 'Surfing, paragliding, shark cage diving', 'zap', 8);

-- 3. Insert distance options
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
) AS d(radius_km, label, description, sort_order);

-- 4. Insert users, profiles and guides
-- NOTE: Create users rows first (password_hash can be a dummy hash for demo data),
-- then profiles, then guides/drivers.

-- 5. Insert activities (after guides exist)
-- 6. Insert packages (after guides, drivers, activities exist)
-- 7. Insert sample bookings (after all above)
```

**Note on Authentication:**
The seed data requires corresponding `users` rows first (local custom auth table). For local development:

1. Insert into `users` (email + bcrypt password_hash) — dummy hashes are fine for demo
2. Insert into `profiles` referencing those `users.id` values
3. Update `profiles.user_type` to `'guide'` or `'driver'` as needed
4. Then insert into `guides`/`drivers` tables

You can also use the demo seed API route (`/api/seed-demo`) which creates all test data automatically.

---

## 9. Image Assets Needed

For a realistic demo, prepare these images (stored via the image upload API or placed in the `public/images` folder):

### City Hero Images
- `cities/cape-town/hero-table-mountain.jpg` — Table Mountain at golden hour
- `cities/cape-town/hero-camps-bay.jpg` — Camps Bay beach and Twelve Apostles
- `cities/cape-town/hero-bo-kaap.jpg` — Colourful Bo-Kaap houses

### Guide Profile Photos
- `guides/thandiwe-mokoena/profile.jpg`
- `guides/james-van-der-merwe/profile.jpg`
- `guides/sarah-chen/profile.jpg`
- `guides/david-nkosi/profile.jpg`
- `guides/emma-ross/profile.jpg`

### Guide Gallery Images (3-5 per guide)
- `guides/thandiwe-mokoena/gallery-01.jpg` — Langa street scene
- `guides/thandiwe-mokoena/gallery-02.jpg` — Tourists with local family
- etc.

### Activity Images (3-5 per activity)
- `activities/langa-township-tour/01.jpg`
- `activities/langa-township-tour/02.jpg`
- etc.

### Vehicle Images (for drivers)
- `drivers/pieter-de-klerk/vehicle-exterior.jpg`
- `drivers/pieter-de-klerk/vehicle-interior.jpg`

---

*This seed data gives you 5 guides, 3 drivers, 10 activities, 2 packages, and 9 test bookings — enough to build and test every screen in the MVP.*
