# Local Tour & Experience Platform
## Product Feature Specification

> A multi-city experiences marketplace connecting tourists with verified local guides and drivers — through a beautiful web and mobile app, with WhatsApp notifications layered on top. Launched initially in Cape Town, designed from day one to expand to any city in the world.

---

## 1. Vision & Overview

A platform that allows tourists visiting any supported city to discover activities, book expert local guides, and arrange trusted drivers — all in one place. Each city operates as its own self-contained hub with localised content, guides, drivers, and activities, while sharing the same underlying platform infrastructure.

The platform serves three types of users: **Tourists**, **Guides**, and **Drivers**.

### Core Principles
- Free for all users during the launch phase until wide adoption is achieved
- Mobile-first, visually rich experience
- AI-powered recommendations and discovery
- WhatsApp used as a notification and communication layer, not the primary interface
- Built city by city — local feel, global scale
- Each city hub is independently manageable but shares one codebase and database

---

## 2. Multi-City Architecture

### 2.1 How Cities Work
- Each city is a **self-contained hub** on the platform
- Tourists select or are auto-detected into their current city on arrival
- Guides and drivers register under a specific city (can register in multiple)
- Activities, listings, and packages are tagged to a city
- Search, filters, and maps are scoped to the active city
- Each city can have its own:
  - Hero imagery and photography
  - Featured activities and categories relevant to that region
  - Distance radius options based on local geography
  - Local currency display
  - Relevant driver verification requirements (e.g. PDP in South Africa)

### 2.2 City Configuration
Each city on the platform is configured with:

| Setting | Description | Example (Cape Town) |
|---|---|---|
| City name | Display name | Cape Town |
| Country | For legal and payment context | South Africa |
| Currency | Local currency code | ZAR (R) |
| Map centre | Default map coordinates | -33.9249, 18.4241 |
| Distance labels | Named radius destinations | 30km: Hout Bay, Camps Bay |
| Hero media | City-specific photos and videos | Table Mountain imagery |
| Activity categories | Relevant to local offerings | Wine Tours, Hiking, Safaris |
| Verification rules | Local legal requirements for drivers | PDP required in SA |
| WhatsApp country code | For notifications | +27 |
| Timezone | For booking and calendar accuracy | Africa/Johannesburg |

### 2.3 Adding a New City
Adding a new city requires:
1. Creating a city record in the database with the configuration above
2. Uploading hero imagery and photography for that city
3. Recruiting and onboarding local guides and drivers
4. Creating initial activity listings for the city
5. Setting distance radius labels relevant to local geography
6. Configuring any country-specific driver verification requirements
7. No code changes needed — the platform handles everything dynamically

### 2.4 City Selection for Tourists
- On first visit, the platform detects the tourist's location automatically
- Tourist can manually switch city at any time from the navigation bar
- Search results, maps, and listings update instantly when city changes
- Tourist's booking history persists across cities

---

## 3. User Types

### 3.1 Tourist
A visitor to any supported city looking to discover and book experiences, guides, or drivers.

### 3.2 Guide
A local expert who leads tourists through specific activities or experiences. Registered under one or more cities.

### 3.3 Driver
A local driver who transports tourists to activities. May supply their own vehicle or drive the tourist's vehicle. Registered under one or more cities.

### 3.4 City Admin (Operator Role)
A person responsible for managing guides, drivers, and listings within a specific city. Can be a local partner or the platform owner themselves.

---

## 4. Platform Access

### 4.1 Website
- Full-featured responsive web app accessible on any browser
- Primary discovery and booking interface
- City-aware — all content scoped to the selected city

### 4.2 Mobile App (Phase 2)
- iOS and Android native apps
- Push notifications for bookings and messages
- Live location sharing during experiences
- Auto-detects city based on device location

### 4.3 WhatsApp Integration
- Used as a notification layer, not the primary interface
- Tourist receives booking confirmations via WhatsApp
- Guide/Driver receives lead and booking alerts via WhatsApp
- Quick back-and-forth messaging between tourist and guide/driver
- Country code configured per city for correct WhatsApp routing

---

## 5. Tourist Features

### 5.1 Homepage & Discovery
- Stunning city-specific photography and video hero banner (changes per city)
- Featured activities, guides, and drivers for the active city
- Search bar with natural language support (AI-powered)
- Category quick-links relevant to the active city (e.g. Wine Tours, Hiking, Safari, Beaches, Culture, Photography, Wildlife)
- "What's popular today" section based on bookings in that city

### 5.2 Search & Filter
- All search results scoped to the active city
- Filter by:
  - Activity type / interest
  - Duration (1hr, half day, full day)
  - Price range
  - Date and availability
  - Distance from city centre
  - Language spoken by guide/driver
  - Group size
  - Vehicle type (for driver bookings)
- Sort by: Price, Rating, Popularity, Availability

### 5.3 Activity Detail Page
Each activity listing includes:
- Photo gallery (multiple images)
- Video preview
- Full description
- Duration
- Price range
- Difficulty / fitness level
- What's included and excluded
- Pickup point(s) with interactive map
- Reviews and ratings from past tourists
- Available guides for this activity
- Option to add a driver

### 5.4 Booking Types

#### 5.4.1 Fixed Tour Booking
- Specific activity with a set itinerary
- Choose a listed guide
- Select a date and time
- Confirm group size
- Pay to secure booking

#### 5.4.2 Book a Guide by the Hour
- No fixed destination or itinerary
- Tourist books a guide's time (2hr / 4hr / 8hr / custom)
- Tourist shares their interests optionally to help the guide prepare
- Guide shows up and adapts to the tourist's mood on the day
- Confirm pickup location

#### 5.4.3 Book a Driver by the Hour
- Tourist books a driver and vehicle for a set number of hours
- No fixed route — decide together on arrival
- Driver navigates, tourist directs
- Packages: 2hr / 4hr / 8hr / sunrise to sunset

#### 5.4.4 Book a Driver by Distance
- Tourist sets a distance radius from the city centre
- Platform suggests what is reachable within that radius (labels configured per city)
- Tourist selects interests (wine, nature, beaches, history, etc.)
- Driver picks them up and they plan the exact route together
- Distance options and destination labels are city-specific

#### 5.4.5 Driver for Tourist's Own Car
- Tourist supplies the vehicle
- Driver navigates, handles parking, and provides local knowledge
- Useful for tourists who have rented a car but want a local navigator
- Priced differently — no vehicle cost included

#### 5.4.6 Combo Package Booking
- Pre-built packages combining a guide + driver + activity
- Higher value, premium pricing, higher commission
- Packages created and managed per city

#### 5.4.7 "Surprise Me" Booking
- Tourist hands complete control to the guide
- Guide curates a secret day based on the tourist's stated interests
- Tourist does not know the full itinerary until they experience it
- Premium tier — priced 20–30% higher than standard bookings
- Creates high-value social media moments and word-of-mouth referrals

### 5.5 Guide & Driver Request Flow
- Tourist clicks "Request a Guide" or "Request a Driver" on any listing
- Enters travel dates, group size, interests, and any special requests
- Platform matches with available guides/drivers in that city
- Guide/Driver receives WhatsApp notification with tourist's details
- Guide/Driver contacts tourist directly to confirm
- Tourist can also receive contact from multiple guides and choose

### 5.6 Tourist Account
- View upcoming and past bookings across all cities
- Save favourite activities and guides
- Leave reviews after completed experiences
- Manage payment methods (Phase 2)
- In-app messaging with guides and drivers

### 5.7 Reviews & Ratings
- Star rating (1–5) after each completed experience
- Written review
- Photo upload option
- Reviews visible on guide and driver profiles
- Platform average displayed on listing cards

---

## 6. Guide Features

### 6.1 Guide Profile
- Profile photo and short bio
- Certifications and specialisations
- Languages spoken
- Cities registered in
- Areas and activities covered within each city
- Photo gallery of past tours
- Availability calendar
- Ratings and reviews from past tourists
- Hourly rate and tour pricing

### 6.2 Activity Listings
- Guide creates listings for specific tours they offer
- Each listing is tagged to a city
- Each listing includes: description, duration, price, included items, pickup points, photos
- Can list multiple activities across multiple cities
- Can be part of combo packages

### 6.3 Guide Dashboard
- View incoming lead notifications per city
- Accept or decline lead requests
- View upcoming confirmed bookings
- Manage availability calendar
- View earnings summary (Phase 2 — when monetisation activates)
- Respond to tourist messages
- View and respond to reviews

### 6.4 Flexible Bookings for Guides
- Opt in to "Book by Hour" availability
- Set hourly rate for unstructured time bookings
- Receive bookings with no fixed itinerary
- Indicate areas of expertise for interest-matching

### 6.5 Notifications
- WhatsApp alerts for new leads
- WhatsApp confirmation when a booking is secured
- Reminder notifications before each experience

---

## 7. Driver Features

### 7.1 Driver Profile
- Profile photo and bio
- Vehicle details:
  - Make, model, year
  - Number of seats
  - Vehicle photos (interior and exterior)
  - Roadworthy and insurance status
- Languages spoken
- Cities and areas covered
- Whether vehicle is supplied or driver-only service
- Ratings and reviews

### 7.2 Driver Service Types
- **Chauffeured transfer** — driver supplies vehicle, takes tourist to activity
- **Driver for tourist's car** — tourist supplies vehicle, driver navigates
- **Hourly hire** — book driver's time with no fixed destination
- **Distance-based hire** — set a radius, explore freely
- **Airport transfers** — fixed route, fixed pricing
- **Special interest driver** — e.g. wine route, photography, shopping (configurable per city)
- **Full day explorer** — sunrise to sunset availability

### 7.3 Driver Dashboard
- View incoming trip requests per city
- Accept or decline requests
- Manage availability calendar
- View upcoming confirmed trips
- View earnings summary (Phase 2)
- In-app messaging with tourists

### 7.4 Driver Verification
Verification requirements are configured per city/country. The platform supports:
- Driver's licence upload and verification
- Professional driving permit (where required by local law)
- Vehicle roadworthy certificate
- Vehicle insurance confirmation
- ID document verification
- Optional: background check badge for premium listing

---

## 8. Combo Packages

### 8.1 What They Are
Pre-built experiences combining a guide, driver, and activity into a single bookable package. Packages are created per city.

### 8.2 Package Detail Page
- Full itinerary breakdown
- Photos for each stop
- Combined pricing (transparent breakdown available)
- Driver and guide profile cards
- What to bring checklist
- Booking and payment in one flow

---

## 9. AI-Powered Features

### 9.1 Smart Search
- Natural language search: "I want something adventurous within an hour from here"
- Platform interprets intent and surfaces relevant activities, guides, and drivers in the active city

### 9.2 Interest Matching
- Tourist completes a short interest quiz on first visit
- Platform recommends personalised experiences for their current city

### 9.3 Distance Explorer
- Tourist sets a distance radius from the city centre
- AI surfaces what is reachable and most relevant to their stated interests
- Distance labels and suggested destinations are city-specific
- Dynamically updates suggestions as interests change

### 9.4 "Surprise Me" Engine
- Guide receives tourist's interest profile
- AI suggests an optimal secret itinerary for the guide to curate
- City-aware — suggestions are drawn from local knowledge for that city

### 9.5 Multilingual Support
- AI handles queries in any language automatically
- Platform auto-detects tourist's language preference
- Guide/driver profiles show languages spoken for easy matching
- Particularly valuable in cities with diverse tourist origins

---

## 10. Maps & Location

### 10.1 Interactive Activity Map
- Browse all activities on a map centred on the active city
- Filter by category, price, and availability directly on the map
- Cluster view for dense areas

### 10.2 Pickup Point Maps
- Each activity and guide listing shows exact pickup coordinates
- Tourist gets a map pin sent to WhatsApp before the experience

### 10.3 Distance Radius Explorer
- Visual map showing what is reachable within a selected distance from the city centre
- Activities and points of interest appear as pins within the radius
- Radius labels are city-configured (e.g. named towns, attractions)

### 10.4 Live Location Sharing (Phase 2)
- Tourist can track driver's live location before pickup
- Reduces anxiety for first-time tourists in an unfamiliar city

---

## 11. Booking & Payments

### 11.1 Launch Phase (Free Model)
- All bookings are facilitated free of charge
- No commission taken from guides or drivers
- No fees charged to tourists
- Platform connects tourist with guide/driver — transaction happens off-platform initially
- Goal: build trust, adoption, and supply before monetising

### 11.2 Booking Flow
1. Tourist selects activity, guide, or driver in their current city
2. Selects date, time, and duration
3. Adds group size and any special requests
4. Submits booking request
5. Guide/Driver receives WhatsApp notification
6. Guide/Driver confirms availability and contacts tourist
7. Tourist and guide/driver agree on final details directly
8. Experience takes place
9. Tourist leaves a review on the platform

### 11.3 Currency Handling
- Prices displayed in the local currency of the active city
- Tourist's account stores their home currency preference
- Payment gateway configured per country (Phase 2)

### 11.4 Future Payment Integration (Phase 2 — Post Adoption)
- In-app payment via locally appropriate payment gateways per country
- Deposit system: 30% upfront to secure booking, balance paid at end of experience
- Overtime billing: extra hours or distance billed at agreed rate
- Commission automatically deducted before payout to guide/driver
- Earnings dashboard for guides and drivers

---

## 12. Monetisation Strategy (Post Launch)

> All features below are planned for activation once the platform reaches significant adoption in a given city. The platform launches completely free for all users.

### 12.1 Lead Generation Fee
- Guide/driver pays a fee per qualified lead received
- Amount configurable per city based on local market rates
- Low risk for guides — only pay for real interested tourists

### 12.2 Booking Commission
- Platform takes 10–15% of each completed booking
- Automatically handled through in-app payment system
- Higher commission on combo packages (15–20%)

### 12.3 Monthly Subscriptions for Guides & Drivers
- Flat monthly fee to be listed and receive leads
- Fee amount configurable per city
- Basic and premium tiers available

### 12.4 Featured Listings & Priority Placement
- Guides and drivers pay extra to appear first in search results within their city
- Category sponsorship available per city

### 12.5 Partnership Revenue (Future)
- Travel insurance upsell at checkout
- Airport transfer partnerships
- Restaurant and accommodation referral fees
- Activity operator sponsorships — configurable per city

---

## 13. City Admin Panel

### 13.1 Purpose
Each city can be managed independently by a City Admin (either the platform owner or a local partner).

### 13.2 City Admin Features
- Add and edit city configuration (name, currency, map centre, distance labels, categories)
- Upload and manage city hero imagery
- Approve and verify guide and driver applications
- Create and manage combo packages for the city
- View booking and lead activity for the city
- Manage featured listings and sponsored placements
- Access city-level analytics (bookings, revenue, popular activities)

### 13.3 Super Admin (Platform Owner)
- Manage all cities from a single dashboard
- Add new cities
- View platform-wide analytics
- Manage monetisation settings globally or per city
- Oversee guide and driver verification across all cities

---

## 14. Geographic Expansion Plan

### How Expansion Works
New cities are added by:
1. Configuring the city in the admin panel
2. Uploading city-specific imagery
3. Recruiting local guides and drivers
4. Creating initial activity listings
5. Launching locally — no new code deployment required

### Suggested Expansion Order

#### Phase 1 — Pilot City (Cape Town)
- Prove the model, refine the product
- Build reviews, guides, and drivers in one city before expanding

#### Phase 2 — South Africa
- Johannesburg & surrounds
- Durban & KwaZulu-Natal
- Garden Route (Knysna, Plettenberg Bay)
- Kruger National Park region

#### Phase 3 — Africa
- Nairobi, Kenya
- Marrakech, Morocco
- Victoria Falls (Zimbabwe/Zambia)
- Zanzibar, Tanzania
- Cairo, Egypt

#### Phase 4 — Global
- Any city with a tourism economy and WhatsApp-active local guides
- Platform is language and currency agnostic by design

---

## 15. Recommended Tech Stack

Given a solo founder or small team, the recommended stack prioritises speed to build, low cost to run, and scalability as the platform grows across cities.

### 15.1 Frontend — Next.js + Tailwind CSS
- **Next.js** — React framework that handles both the website and mobile-friendly app in one codebase
- **Tailwind CSS** — builds beautiful UI fast without writing lots of custom CSS
- **Shadcn/UI** — pre-built beautiful components (buttons, modals, cards, calendars) that save weeks of work
- **Mapbox GL JS** — stunning interactive maps for activity discovery and the distance explorer

**Why:** Fast to build, great SEO for tourist searches, city-aware routing built in, and works perfectly on mobile browsers before a native app is built.

---

### 15.2 Backend & Database — Local PostgreSQL
- **PostgreSQL database** — stores all cities, users, listings, bookings, and reviews
- **Custom Authentication** — `bcryptjs` for password hashing + `iron-session` for encrypted cookie sessions
- **Server Actions** — Next.js Server Actions handle all reads and writes directly against the database
- **Image Storage** — images stored as BYTEA in PostgreSQL and served via Next.js API routes
- **Application-Level Security** — city-scoping and role checks implemented in Server Actions

**Why:** A local PostgreSQL database removes external dependencies, simplifies development, and eliminates network latency. The schema is standard PostgreSQL and can be hosted anywhere.

---

### 15.3 Multi-City Database Design
Key tables and their city-awareness:

| Table | City-Aware | Notes |
|---|---|---|
| cities | — | Master city config table |
| activities | Yes (city_id) | Each activity belongs to a city |
| guides | Yes (city_ids array) | Guide can serve multiple cities |
| drivers | Yes (city_ids array) | Driver can serve multiple cities |
| bookings | Yes (city_id) | Booking scoped to a city |
| packages | Yes (city_id) | Combo packages per city |
| reviews | Yes (via booking) | Inherited from booking city |
| distance_options | Yes (city_id) | Radius labels per city |
| categories | Yes (city_id) | Category sets per city |

---

### 15.4 AI Layer — Anthropic Claude API
- **Smart search** — tourist types naturally and gets intelligent city-scoped results
- **Multilingual support** — handles queries in any language automatically
- **Surprise Me engine** — generates city-aware secret itinerary suggestions for guides
- **Chatbot assistant** — answers tourist questions about the active city 24/7
- **Review summarisation** — summarises multiple reviews into one paragraph per listing

**Why:** A genuine competitive advantage over Viator and GetYourGuide, and scales to every new city automatically.

---

### 15.5 Mobile — React Native + Expo (Phase 2)
- Single codebase that produces both iOS and Android apps
- Shares most logic with the Next.js web app
- Expo framework makes it faster to build and deploy
- Push notifications for bookings and messages
- Auto-detects city based on device location

**Why:** Do not build the native app on day one. Launch the web app first, validate, then build mobile once there are active users across multiple cities.

---

### 15.6 WhatsApp Notifications — WATI or Twilio
- **WATI** — easier to set up, built specifically for WhatsApp Business API
- **Twilio** — more flexible and developer-friendly for custom flows
- Country code for WhatsApp routing is pulled from the city configuration
- Sends booking confirmations, lead alerts, and reminders to guides and drivers

**Why:** Guides and drivers in most tourism markets live on WhatsApp. This is the most reliable way to reach them instantly regardless of city.

---

### 15.7 Payments — Stripe + Local Gateways (Phase 2)
- **Stripe** — international tourists paying in any major currency, available in most countries
- **Local payment gateways** — configured per country (e.g. PayFast for South Africa, M-Pesa for Kenya)
- **Stripe Connect** — automatically pays out to multiple guides and drivers after commission deduction
- Currency displayed based on city configuration

**Why:** Stripe handles multi-currency natively. Local gateways are added per country as the platform expands.

---

### 15.8 Hosting & Infrastructure
- **Vercel** — hosts the Next.js frontend, generous free tier, deploys in seconds
- **Local PostgreSQL** — runs on your machine in development; can be deployed to any managed Postgres (Neon, AWS RDS, etc.) in production
- **Cloudflare** — CDN for fast image loading globally and basic DDoS protection

**Why:** Zero external backend dependencies in development. The database runs locally or in Docker. Production can use any PostgreSQL host.

---

### 15.9 Full Stack Summary

| Layer | Technology | Cost to Start |
|---|---|---|
| Frontend | Next.js + Tailwind + Shadcn | Free |
| Database | Local PostgreSQL (`pg`) | Free (Docker or local install) |
| Authentication | `bcryptjs` + `iron-session` | Free |
| File Storage | PostgreSQL BYTEA + API routes | Free |
| Maps | Mapbox | Free tier (50k loads/month) |
| AI Features | Claude API | Pay per use (~cents per query) |
| WhatsApp | WATI | ~R400/month |
| Hosting | Vercel | Free tier |
| CDN | Cloudflare | Free tier |
| Payments | Stripe + local gateways | % per transaction only |
| Mobile (later) | React Native + Expo | Free |

**Estimated monthly cost to launch: R400–R800/month** (primarily WATI for WhatsApp)

---

### 15.10 Development Phases

#### Phase 1 — MVP (6–10 weeks)
- Single city (pilot)
- Tourist browse and search
- Activity, guide, and driver listings
- Request a guide/driver form
- WhatsApp notification to guide/driver
- Basic guide and driver profiles
- Mobile-responsive web app

#### Phase 2 — Multi-City & Growth (3–4 months)
- City admin panel and city configuration system
- Tourist and guide accounts
- Reviews and ratings
- Booking calendar and availability
- In-app messaging
- Advanced search and filters
- AI smart search and multilingual support
- Second and third city onboarded

#### Phase 3 — Monetisation & Scale (6+ months)
- In-app payments with multi-currency and local gateways
- Commission and payout system
- Guide and driver earnings dashboard
- Native mobile app (iOS + Android)
- Premium listings and featured placements
- Expansion to additional countries

---

### 15.11 Who Builds This?

#### Option A — Solo Founder + AI (Vibe Coding)
- Use Claude or Cursor AI to write most of the code
- Founder directs, AI builds
- Cost: Time + ~R800/month tools
- Timeline: 3–6 months to MVP
- Best for: Full control and lowest cost

#### Option B — Hire a Developer
- One skilled Next.js + PostgreSQL developer
- South Africa rates: R300–R600/hour
- MVP cost: R60,000–R150,000
- Timeline: 6–10 weeks
- Best for: Speed with available budget

#### Option C — No-Code First (Fastest to Market)
- Use Webflow (frontend) + Airtable (database) + Make (automation)
- Build in 1–2 weeks to test the concept in the pilot city
- Migrate to proper code stack once validated
- Best for: Proving the idea before investing in development

---

### 15.12 Recommended Approach for Launch

1. **Start with Option C** — build a Webflow site in 2 weeks to test the market in one city
2. Sign up the first 10 guides and 10 drivers manually in the pilot city
3. Facilitate the first 20 tourist bookings to prove demand
4. Then invest in the full Next.js + PostgreSQL stack — built city-agnostic from day one
5. Onboard the second city using only the admin panel — no code changes

This approach validates the business before committing significant development budget, and ensures the real build is designed for scale from the start.

---

## 16. Launch Checklist (Per City)

- [ ] Configure city in the admin panel (name, currency, map centre, categories, distance labels)
- [ ] Upload city-specific hero imagery and photography
- [ ] Recruit 10–20 verified guides across key activity categories for the city
- [ ] Recruit 10–15 verified drivers meeting local legal requirements
- [ ] Build and populate activity listings with photos and descriptions
- [ ] Launch city page with search, browse, and request flow
- [ ] Set up WhatsApp notification system with correct country code
- [ ] Promote in local tourism Facebook groups, Airbnb host communities, and travel forums
- [ ] Collect first 50 tourist reviews to build social proof
- [ ] Iterate on UX based on real tourist and guide feedback
- [ ] Monitor booking conversion rate and time-to-response from guides
- [ ] Begin planning Phase 2 payment integration once adoption is stable

---

*Document version 3.0 — WanderMate — Local Tour & Experience Platform (Multi-City)*
