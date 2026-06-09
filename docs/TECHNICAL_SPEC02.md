# WanderMate — Technical Specification
## Part 02: Database Schema

> Complete PostgreSQL schema design for local PostgreSQL. Every table, column, type, relationship, and index is defined here. This document is the single source of truth for the data model.

---

## 1. Entity Relationship Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   cities    │◄────┤  categories │     │dist_options │
│  (master)   │     │ (per city)  │     │ (per city)  │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │
       │       ┌─────────────┐     ┌─────────────┐
       │       │   guides    │     │   drivers   │
       │       │  (profiles) │     │  (profiles) │
       │       └──────┬──────┘     └──────┬──────┘
       │              │                    │
       │         ┌────┴────┐          ┌────┴────┐
       │         │guide_   │          │driver_  │
       │         │cities   │          │cities   │
       │         └─────────┘          └─────────┘
       │
       │◄──────────────────────────────────────────┐
       │                                           │
┌──────┴──────┐     ┌─────────────┐     ┌────────┴────────┐
│ activities  │◄────┤  bookings   │────►│     reviews     │
│(per city &  │     │(core table) │     │(per booking)    │
│ guide)      │     └──────┬──────┘     └─────────────────┘
└─────────────┘            │
                           │     ┌─────────────────┐
                           └────►│booking_status_  │
                                 │logs (audit)     │
                                 └─────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  packages   │     │  messages   │     │notifications│
│(combo, per  │     │(in-app chat)│     │(system log) │
│ city)       │     └─────────────┘     └─────────────┘
└─────────────┘
```

**Cardinality rules:**
- A `city` has many `activities`, `categories`, `distance_options`, `packages`, `bookings`
- A `guide` has many `activities` and `bookings`
- A `driver` has many `bookings`
- A `booking` has many `booking_status_logs` and one `review`
- `users` is the custom auth table (replaces Supabase `auth.users`)
- `profiles` is 1:1 with `users`

---

## 2. Enum Types

```sql
-- User roles in the platform
CREATE TYPE user_type AS ENUM ('tourist', 'guide', 'driver', 'city_admin', 'super_admin');

-- Booking types match the product spec exactly
CREATE TYPE booking_type AS ENUM (
  'activity',           -- Fixed tour booking
  'guide_hourly',       -- Book guide by hour
  'driver_hourly',      -- Book driver by hour
  'driver_distance',    -- Book driver by distance radius
  'driver_own_car',     -- Tourist supplies vehicle
  'package',            -- Combo package
  'surprise_me'         -- Guide curates secret day
);

-- Booking lifecycle states
CREATE TYPE booking_status AS ENUM (
  'draft',              -- Tourist building request, not submitted
  'pending',            -- Submitted, awaiting guide/driver response
  'confirmed',          -- Guide/driver accepted
  'in_progress',        -- Experience is happening today
  'completed',          -- Experience finished
  'cancelled',          -- Cancelled by tourist or guide/driver
  'declined',           -- Guide/driver declined
  'disputed'            -- Problem reported, under review
);

-- Difficulty levels for activities
CREATE TYPE difficulty_level AS ENUM ('easy', 'moderate', 'challenging', 'extreme');

-- Price calculation type
CREATE TYPE price_type AS ENUM ('fixed', 'per_person');
```

---

## 3. Core Tables

### 3.1 `cities` — Master City Configuration

Every city hub is defined here. Adding a new city = inserting one row.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Internal ID |
| `slug` | `text` | UNIQUE, NOT NULL | URL-friendly name: `cape-town` |
| `name` | `text` | NOT NULL | Display name: `Cape Town` |
| `country` | `text` | NOT NULL | `South Africa` |
| `currency_code` | `text` | NOT NULL | `ZAR` |
| `currency_symbol` | `text` | NOT NULL | `R` |
| `map_center_lat` | `decimal(10,8)` | NOT NULL | `-33.92490000` |
| `map_center_lng` | `decimal(11,8)` | NOT NULL | `18.42410000` |
| `timezone` | `text` | NOT NULL | `Africa/Johannesburg` |
| `whatsapp_country_code` | `text` | NOT NULL | `+27` |
| `hero_images` | `text[]` | DEFAULT `{}` | Array of image API paths |
| `is_active` | `boolean` | DEFAULT `false` | Only active cities are visible |
| `verification_notes` | `text` | | City-specific driver requirements |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_cities_slug ON cities(slug);
CREATE INDEX idx_cities_active ON cities(is_active);
```

**Notes:**
- `slug` is the URL segment: `/cape-town/activities`
- `is_active = false` hides the city from tourists but allows admins to configure it
- `hero_images` stores API route paths (e.g. `/api/city-image/{id}`), not full URLs

---

### 3.2 `profiles` — Extended User Profiles

Extends the local `users` table with role and display data. One row per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, refs `users(id)` ON DELETE CASCADE | Same as users UID |
| `user_type` | `user_type` | DEFAULT `'tourist'` | Role |
| `first_name` | `text` | NOT NULL | |
| `last_name` | `text` | NOT NULL | |
| `phone` | `text` | UNIQUE | E.164 format: `+27821234567` |
| `avatar_url` | `text` | | Image API path or external URL |
| `preferred_currency` | `text` | | Tourist's home currency |
| `home_city_id` | `uuid` | FK → `cities(id)`, nullable | Tourist's detected home |
| `bio` | `text` | | Short bio (all user types) |
| `is_verified` | `boolean` | DEFAULT `false` | Email/phone verified |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_phone ON profiles(phone);
```

**Notes:**
- `id` is the same as `users.id` — this is a 1:1 extension pattern
- Application code creates both `users` and `profiles` rows during registration
- Guides and drivers have additional data in `guides`/`drivers` tables
- `user_type` can be upgraded (tourist → guide) but never downgraded in practice

---

### 3.3 `guides` — Guide-Specific Data

One row per guide. References `profiles`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `profile_id` | `uuid` | UNIQUE, NOT NULL, FK → `profiles(id)` | |
| `bio` | `text` | NOT NULL | Detailed professional bio |
| `tagline` | `text` | | Short headline: "Wine expert & storyteller" |
| `hourly_rate` | `integer` | | Cents, e.g., 15000 = R150.00 |
| `languages` | `text[]` | DEFAULT `{}` | `['English', 'Afrikaans', 'Xhosa']` |
| `certifications` | `text[]` | DEFAULT `{}` | `['First Aid', 'Wine Sommelier']` |
| `specialisations` | `text[]` | DEFAULT `{}` | `['Wine Tours', 'History', 'Photography']` |
| `years_experience` | `integer` | | |
| `gallery_images` | `text[]` | DEFAULT `{}` | Past tour photos |
| `is_available_hourly` | `boolean` | DEFAULT `false` | Opt-in to "Book by Hour" |
| `is_active` | `boolean` | DEFAULT `true` | Can receive bookings |
| `is_verified` | `boolean` | DEFAULT `false` | City admin approved |
| `submitted_at` | `timestamptz` | | When they applied |
| `verified_at` | `timestamptz` | | When admin approved |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_guides_profile ON guides(profile_id);
CREATE INDEX idx_guides_verified ON guides(is_verified, is_active);
CREATE INDEX idx_guides_hourly ON guides(is_available_hourly) WHERE is_available_hourly = true;
```

---

### 3.4 `drivers` — Driver-Specific Data

One row per driver. References `profiles`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `profile_id` | `uuid` | UNIQUE, NOT NULL, FK → `profiles(id)` | |
| `bio` | `text` | NOT NULL | |
| `tagline` | `text` | | "Luxury sedan with panoramic views" |
| `hourly_rate` | `integer` | | Cents per hour |
| `distance_rate` | `integer` | | Cents per km (if applicable) |
| `languages` | `text[]` | DEFAULT `{}` | |
| `has_own_vehicle` | `boolean` | DEFAULT `true` | Supplies vehicle? |
| `vehicle_make` | `text` | | `Toyota` |
| `vehicle_model` | `text` | | `Land Cruiser` |
| `vehicle_year` | `integer` | | `2020` |
| `vehicle_seats` | `integer` | | Including driver |
| `vehicle_images` | `text[]` | DEFAULT `{}` | Interior + exterior |
| `license_url` | `text` | | Image API path or external URL |
| `roadworthy_cert_url` | `text` | | |
| `insurance_cert_url` | `text` | | |
| `professional_permit_url` | `text` | | PDP in SA |
| `is_available_hourly` | `boolean` | DEFAULT `true` | |
| `is_available_distance` | `boolean` | DEFAULT `true` | |
| `is_active` | `boolean` | DEFAULT `true` | |
| `is_verified` | `boolean` | DEFAULT `false` | |
| `submitted_at` | `timestamptz` | | |
| `verified_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_drivers_profile ON drivers(profile_id);
CREATE INDEX idx_drivers_verified ON drivers(is_verified, is_active);
```

---

### 3.5 `guide_cities` & `driver_cities` — Many-to-Many Junctions

Guides and drivers can operate in multiple cities.

**`guide_cities`:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `guide_id` | `uuid` | NOT NULL, FK → `guides(id)` | |
| `city_id` | `uuid` | NOT NULL, FK → `cities(id)` | |
| `areas_covered` | `text[]` | DEFAULT `{}` | Specific areas within city |
| `is_primary` | `boolean` | DEFAULT `false` | Main city for this guide |
| `is_active` | `boolean` | DEFAULT `true` | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**`driver_cities`:**
Identical structure, referencing `drivers(id)`.

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_guide_cities_unique ON guide_cities(guide_id, city_id);
CREATE INDEX idx_guide_cities_city ON guide_cities(city_id, is_active);
CREATE UNIQUE INDEX idx_driver_cities_unique ON driver_cities(driver_id, city_id);
CREATE INDEX idx_driver_cities_city ON driver_cities(city_id, is_active);
```

---

### 3.6 `categories` — Activity Categories (Per City)

Categories like "Wine Tours", "Hiking" are defined per city but can inherit from global defaults.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `city_id` | `uuid` | FK → `cities(id)`, nullable | NULL = global default |
| `name` | `text` | NOT NULL | `Wine Tours` |
| `slug` | `text` | NOT NULL | `wine-tours` |
| `description` | `text` | | |
| `icon` | `text` | | Lucide icon name or emoji |
| `sort_order` | `integer` | DEFAULT `0` | Display order |
| `is_active` | `boolean` | DEFAULT `true` | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_categories_city ON categories(city_id, is_active, sort_order);
```

**Notes:**
- Global categories (`city_id IS NULL`) are copied to each new city on creation
- City admins can override, hide, or add local categories

---

### 3.7 `distance_options` — Radius Labels (Per City)

"30km = Hout Bay, Camps Bay" — configured per city.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `city_id` | `uuid` | NOT NULL, FK → `cities(id)` | |
| `radius_km` | `integer` | NOT NULL | `30` |
| `label` | `text` | NOT NULL | `Hout Bay, Camps Bay` |
| `description` | `text` | | `Coastal suburbs and beaches` |
| `sort_order` | `integer` | DEFAULT `0` | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_distance_options_city ON distance_options(city_id, sort_order);
```

---

### 3.8 `activities` — Tour Listings

Created by guides. Belongs to one city.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `city_id` | `uuid` | NOT NULL, FK → `cities(id)` | |
| `guide_id` | `uuid` | NOT NULL, FK → `guides(id)` | Owner |
| `category_id` | `uuid` | FK → `categories(id)` | |
| `title` | `text` | NOT NULL | |
| `slug` | `text` | NOT NULL | Auto-generated from title |
| `description` | `text` | NOT NULL | Full HTML/markdown |
| `short_description` | `text` | | Card preview text |
| `duration_hours` | `decimal(4,1)` | | `4.5` |
| `price` | `integer` | NOT NULL | Cents |
| `price_type` | `price_type` | DEFAULT `'per_person'` | |
| `min_group_size` | `integer` | DEFAULT `1` | |
| `max_group_size` | `integer` | | NULL = unlimited |
| `difficulty_level` | `difficulty_level` | | |
| `included_items` | `text[]` | DEFAULT `{}` | `['Lunch', 'Transport', 'Park fees']` |
| `excluded_items` | `text[]` | DEFAULT `{}` | `['Gratuities', 'Alcoholic drinks']` |
| `pickup_address` | `text` | | Human-readable address |
| `pickup_lat` | `decimal(10,8)` | | |
| `pickup_lng` | `decimal(11,8)` | | |
| `images` | `text[]` | DEFAULT `{}` | Storage paths |
| `video_url` | `text` | | External or storage URL |
| `languages_offered` | `text[]` | DEFAULT `{}` | Override guide's default |
| `is_active` | `boolean` | DEFAULT `true` | |
| `is_featured` | `boolean` | DEFAULT `false` | Admin-curated |
| `featured_order` | `integer` | | For homepage ordering |
| `avg_rating` | `decimal(2,1)` | DEFAULT `0` | Cached average |
| `review_count` | `integer` | DEFAULT `0` | Cached count |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_activities_city ON activities(city_id, is_active);
CREATE INDEX idx_activities_guide ON activities(guide_id, is_active);
CREATE INDEX idx_activities_category ON activities(category_id);
CREATE INDEX idx_activities_featured ON activities(city_id, is_featured, featured_order) WHERE is_featured = true;
CREATE INDEX idx_activities_price ON activities(city_id, price);
CREATE INDEX idx_activities_rating ON activities(city_id, avg_rating DESC);
```

**Notes:**
- `avg_rating` and `review_count` are **cached denormalized fields**. Update them via trigger when reviews are inserted/updated/deleted. This avoids expensive `AVG()` queries on listing pages.
- `slug` must be unique per city (not globally): `cape-town/table-mountain-sunrise` vs `johannesburg/table-mountain-sunrise` is allowed but unlikely.

---

### 3.9 `packages` — Combo Packages

Pre-built experiences combining guide + driver + activity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `city_id` | `uuid` | NOT NULL, FK → `cities(id)` | |
| `title` | `text` | NOT NULL | |
| `slug` | `text` | NOT NULL | |
| `description` | `text` | NOT NULL | |
| `itinerary` | `jsonb` | NOT NULL | Structured itinerary steps |
| `guide_id` | `uuid` | FK → `guides(id)` | Assigned guide |
| `driver_id` | `uuid` | FK → `drivers(id)` | Assigned driver |
| `total_price` | `integer` | NOT NULL | Cents |
| `duration_hours` | `decimal(4,1)` | | |
| `max_group_size` | `integer` | | |
| `images` | `text[]` | DEFAULT `{}` | |
| `whats_included` | `text[]` | DEFAULT `{}` | |
| `whats_not_included` | `text[]` | DEFAULT `{}` | |
| `pickup_address` | `text` | | |
| `pickup_lat` | `decimal(10,8)` | | |
| `pickup_lng` | `decimal(11,8)` | | |
| `is_active` | `boolean` | DEFAULT `true` | |
| `is_featured` | `boolean` | DEFAULT `false` | |
| `avg_rating` | `decimal(2,1)` | DEFAULT `0` | |
| `review_count` | `integer` | DEFAULT `0` | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_packages_city ON packages(city_id, is_active);
CREATE INDEX idx_packages_featured ON packages(city_id, is_featured) WHERE is_featured = true;
```

**`itinerary` JSONB structure:**
```json
[
  {
    "order": 1,
    "time": "08:00",
    "title": "Pickup from hotel",
    "description": "...",
    "location": {"lat": -33.9, "lng": 18.4, "address": "..."},
    "image_url": "..."
  }
]
```

---

### 3.10 `bookings` — Core Transaction Table

The most important table. Every booking request, confirmation, and completion lives here.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `city_id` | `uuid` | NOT NULL, FK → `cities(id)` | |
| `tourist_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Who booked |
| `booking_type` | `booking_type` | NOT NULL | |
| `activity_id` | `uuid` | FK → `activities(id)` | For activity bookings |
| `package_id` | `uuid` | FK → `packages(id)` | For package bookings |
| `guide_id` | `uuid` | FK → `guides(id)` | Assigned guide |
| `driver_id` | `uuid` | FK → `drivers(id)` | Assigned driver |
| `status` | `booking_status` | DEFAULT `'draft'` | Current state |
| `travel_date` | `date` | NOT NULL | Experience date |
| `start_time` | `time` | | e.g., `08:00:00` |
| `duration_hours` | `decimal(4,1)` | | Final or requested duration |
| `group_size` | `integer` | NOT NULL | Number of people |
| `total_price` | `integer` | | Agreed price in cents |
| `deposit_amount` | `integer` | | For Phase 2 payments |
| `special_requests` | `text` | | Dietary, mobility, interests |
| `interests` | `text[]` | DEFAULT `{}` | For hourly/surprise_me: `['wine', 'photography']` |
| `distance_radius_km` | `integer` | | For driver_distance bookings |
| `pickup_location` | `text` | | Address |
| `pickup_lat` | `decimal(10,8)` | | |
| `pickup_lng` | `decimal(11,8)` | | |
| `tourist_has_vehicle` | `boolean` | DEFAULT `false` | For driver_own_car |
| `is_paid` | `boolean` | DEFAULT `false` | Phase 2 |
| `paid_at` | `timestamptz` | | |
| `whatsapp_notified` | `boolean` | DEFAULT `false` | Track WhatsApp delivery |
| `whatsapp_sent_at` | `timestamptz` | | |
| `cancelled_by` | `uuid` | FK → `profiles(id)` | Who cancelled |
| `cancellation_reason` | `text` | | |
| `cancelled_at` | `timestamptz` | | |
| `completed_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_bookings_city ON bookings(city_id, status);
CREATE INDEX idx_bookings_tourist ON bookings(tourist_id, created_at DESC);
CREATE INDEX idx_bookings_guide ON bookings(guide_id, travel_date);
CREATE INDEX idx_bookings_driver ON bookings(driver_id, travel_date);
CREATE INDEX idx_bookings_status ON bookings(status, travel_date);
CREATE INDEX idx_bookings_date ON bookings(travel_date, status);
CREATE INDEX idx_bookings_type ON bookings(booking_type, city_id);
```

**Constraints:**
```sql
-- Ensure at least one service provider is assigned
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_has_provider 
  CHECK (guide_id IS NOT NULL OR driver_id IS NOT NULL);

-- Ensure activity_id is set for activity bookings
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_activity_type 
  CHECK (booking_type != 'activity' OR activity_id IS NOT NULL);

-- Ensure package_id is set for package bookings  
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_package_type 
  CHECK (booking_type != 'package' OR package_id IS NOT NULL);
```

**Notes:**
- `total_price` may be NULL in `draft`/`pending` state if price is negotiated later
- `interests` drives the "Surprise Me" engine and hourly matching
- `whatsapp_notified` prevents double-sending notifications on retries
- The `chk_bookings_has_provider` constraint enforces that a booking must have at least a guide OR a driver

---

### 3.11 `booking_status_logs` — Audit Trail

Immutable record of every status change. Critical for disputes and analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `booking_id` | `uuid` | NOT NULL, FK → `bookings(id)` | |
| `previous_status` | `booking_status` | | NULL if first log entry |
| `new_status` | `booking_status` | NOT NULL | |
| `changed_by` | `uuid` | FK → `profiles(id)` | Who triggered change |
| `notes` | `text` | | Human-readable reason |
| `metadata` | `jsonb` | DEFAULT `'{}'` | Machine-readable context |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_status_logs_booking ON booking_status_logs(booking_id, created_at DESC);
```

**Trigger:** Automatically insert a row whenever `bookings.status` changes.

---

### 3.12 `reviews` — Ratings & Reviews

One review per completed booking. Reviewer = tourist. Reviewee = guide or driver.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `booking_id` | `uuid` | UNIQUE, NOT NULL, FK → `bookings(id)` | One per booking |
| `reviewer_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Tourist |
| `reviewee_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Guide or driver |
| `reviewee_type` | `text` | NOT NULL, CHECK IN ('guide', 'driver') | |
| `activity_id` | `uuid` | FK → `activities(id)` | Context for activity review |
| `rating` | `integer` | NOT NULL, CHECK (1-5) | |
| `text` | `text` | | Written review |
| `photos` | `text[]` | DEFAULT `{}` | Tourist-uploaded photos |
| `is_approved` | `boolean` | DEFAULT `true` | Auto-approved; admin can hide |
| `is_featured` | `boolean` | DEFAULT `false` | Admin-curated for homepage |
| `helpful_count` | `integer` | DEFAULT `0` | Upvotes |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id, reviewee_type, is_approved);
CREATE INDEX idx_reviews_activity ON reviews(activity_id, is_approved);
CREATE INDEX idx_reviews_rating ON reviews(reviewee_id, rating DESC);
```

**Trigger:** On insert/update/delete, recalculate `guides.avg_rating` / `drivers.avg_rating` / `activities.avg_rating`.

---

### 3.13 `messages` — In-App Messaging

Tourist ↔ Guide/Driver communication. Not WhatsApp (that's external).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `booking_id` | `uuid` | NOT NULL, FK → `bookings(id)` | Scoped to booking |
| `sender_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `recipient_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `content` | `text` | NOT NULL | |
| `is_read` | `boolean` | DEFAULT `false` | |
| `read_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_messages_booking ON messages(booking_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read, created_at DESC);
```

---

### 3.14 `notifications` — System Notification Log

Tracks WhatsApp sends, emails, push notifications (Phase 2).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Recipient |
| `booking_id` | `uuid` | FK → `bookings(id)` | Related booking |
| `channel` | `text` | NOT NULL | `whatsapp`, `email`, `push` |
| `type` | `text` | NOT NULL | `booking_request`, `booking_confirmed`, etc. |
| `title` | `text` | | |
| `content` | `text` | | Final message sent |
| `status` | `text` | DEFAULT `'pending'` | `pending`, `sent`, `failed`, `delivered` |
| `external_id` | `text` | | Twilio message SID |
| `error_message` | `text` | | If failed |
| `sent_at` | `timestamptz` | | |
| `delivered_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_notifications_profile ON notifications(profile_id, created_at DESC);
CREATE INDEX idx_notifications_booking ON notifications(booking_id, channel);
CREATE INDEX idx_notifications_status ON notifications(status, channel);
```

---

## 4. Critical Triggers & Functions

### 4.1 Auto-create profile on signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    '',
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Note:** In practice, the application creates both `users` and `profiles` rows in a single transaction during registration, so this trigger is optional.

### 4.2 Booking status audit log

```sql
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO booking_status_logs (
      booking_id, previous_status, new_status, changed_by, notes
    ) VALUES (
      NEW.id, OLD.status, NEW.status, 
      COALESCE(current_setting('app.current_user_id', true)::uuid, NULL),
      COALESCE(current_setting('app.status_change_note', true), 'Status updated')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_status_log
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();
```

### 4.3 Update cached ratings

```sql
CREATE OR REPLACE FUNCTION public.update_activity_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities
  SET avg_rating = (
    SELECT COALESCE(AVG(rating), 0) 
    FROM reviews 
    WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id) AND is_approved = true
  ),
  review_count = (
    SELECT COUNT(*) 
    FROM reviews 
    WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id) AND is_approved = true
  )
  WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_activity_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_activity_rating();
```

*(Similar triggers needed for `guides` and `drivers` tables.)*

---

## 5. Design Decisions & Rationale

### 5.1 Prices stored as integers (cents)
Floating-point money causes rounding errors. Always store currency as the smallest unit (cents) and format on display: `15000` → `R150.00`.

### 5.2 Cached `avg_rating` on listings
Reviews table is the source of truth, but listing pages run `AVG()` constantly. Triggers keep the cache synchronized. If a trigger fails, the cache is stale but not wrong — run a nightly recalculation job.

### 5.3 Booking status log is immutable
Never update or delete `booking_status_logs`. This table is your dispute resolution evidence. If a guide claims they never confirmed, the log proves it.

### 5.4 `users` extended via `profiles` (1:1)
The local `users` table owns authentication (email + password_hash). The `profiles` table contains all app-specific display data. This mirrors the Supabase pattern but uses our own auth tables.

### 5.5 `jsonb` for itinerary, not separate table
Package itineraries are read-heavy, write-rarely, and schema-stable. JSONB avoids a join and keeps the package self-contained. If itineraries become complex/searchable, migrate to a normalized table later.

---

*Next: Part 03 defines the booking state machine — valid transitions, business rules, and edge cases.*
