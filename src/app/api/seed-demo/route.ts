import { NextResponse } from "next/server";
import { query, withClient } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 403 }
    );
  }

  const results = {
    usersCreated: [] as string[],
    usersUpdated: [] as string[],
    guidesCreated: [] as string[],
    guidesUpdated: [] as string[],
    driversCreated: [] as string[],
    driversUpdated: [] as string[],
    activitiesCreated: [] as string[],
    activitiesUpdated: [] as string[],
    errors: [] as string[],
  };

  try {
    /* ── Ensure Cape Town exists ── */
    const { rows: cityRows } = await query(
      `SELECT id FROM cities WHERE slug = 'cape-town'`
    );
    let cityId: string;
    if (cityRows.length > 0) {
      cityId = cityRows[0].id;
      // City images are now stored in city_images table (BYTEA)
      // Ensure hero_images is cleared to avoid stale path references
      await query(
        `UPDATE cities SET hero_images = NULL WHERE id = $1`,
        [cityId]
      );
    } else {
      const { rows: newCity } = await query(
        `INSERT INTO cities (
          slug, name, country, currency_code, currency_symbol,
          map_center_lat, map_center_lng, timezone, whatsapp_country_code,
          hero_images, is_active, verification_notes
        ) VALUES (
          'cape-town', 'Cape Town', 'South Africa', 'ZAR', 'R',
          -33.9249, 18.4241, 'Africa/Johannesburg', '+27',
          NULL,
          true,
          'Professional Driving Permit (PDP) required for all commercial drivers. Vehicle must have valid roadworthy certificate and insurance.'
        ) RETURNING id`
      );
      cityId = newCity[0].id;
    }

    /* ── Ensure categories exist ── */
    const { rows: catRows } = await query(`SELECT id, slug FROM categories`);
    const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));
    if (catBySlug.size === 0) {
      await query(`
        INSERT INTO categories (city_id, name, slug, description, icon, sort_order) VALUES
          (NULL, 'Wine Tours', 'wine-tours', 'Explore the Cape Winelands', 'wine', 1),
          (NULL, 'Hiking & Nature', 'hiking-nature', 'Mountain trails and nature walks', 'mountain', 2),
          (NULL, 'Cultural & Historical', 'cultural-historical', 'Township tours, museums, and heritage', 'landmark', 3),
          (NULL, 'Photography', 'photography', 'Scenic and wildlife photography experiences', 'camera', 4),
          (NULL, 'Food & Culinary', 'food-culinary', 'Local markets, cooking classes, and food tours', 'utensils', 5),
          (NULL, 'Wildlife & Safari', 'wildlife-safari', 'Day trips to see African wildlife', 'rabbit', 6),
          (NULL, 'Beaches & Coast', 'beaches-coast', 'Coastal drives and beach experiences', 'waves', 7),
          (NULL, 'Adventure & Sport', 'adventure-sport', 'Surfing, paragliding, shark cage diving', 'zap', 8)
      `);
      const { rows: freshCats } = await query(`SELECT id, slug FROM categories`);
      freshCats.forEach((c) => catBySlug.set(c.slug, c.id));
    }

    /* ═══════════════════════════════════════════════════════════
       1. GUIDES
       ═══════════════════════════════════════════════════════════ */
    for (const def of GUIDE_DEFS) {
      const userId = await ensureUser(def, results);
      if (!userId) continue;

      // Upsert profile
      await query(
        `INSERT INTO profiles (id, user_type, phone, bio, first_name, last_name, avatar_url)
         VALUES ($1, 'guide', $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           user_type = EXCLUDED.user_type,
           phone = EXCLUDED.phone,
           bio = EXCLUDED.bio,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           avatar_url = EXCLUDED.avatar_url`,
        [userId, def.phone, def.guide.bio, def.first_name, def.last_name, def.guide.avatar_url]
      );

      // Check if guide exists
      const { rows: beforeGuide } = await query(
        `SELECT id FROM guides WHERE profile_id = $1`,
        [userId]
      );

      const { rows: guideRows } = await query(
        `INSERT INTO guides (
          profile_id, bio, tagline, hourly_rate, languages, certifications,
          specialisations, years_experience, is_available_hourly, is_verified, verified_at, gallery_images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), $10)
        ON CONFLICT (profile_id) DO UPDATE SET
          bio = EXCLUDED.bio,
          tagline = EXCLUDED.tagline,
          hourly_rate = EXCLUDED.hourly_rate,
          languages = EXCLUDED.languages,
          certifications = EXCLUDED.certifications,
          specialisations = EXCLUDED.specialisations,
          years_experience = EXCLUDED.years_experience,
          is_available_hourly = EXCLUDED.is_available_hourly,
          is_verified = EXCLUDED.is_verified,
          verified_at = EXCLUDED.verified_at,
          gallery_images = EXCLUDED.gallery_images
        RETURNING id`,
        [
          userId,
          def.guide.bio,
          def.guide.tagline,
          def.guide.hourly_rate,
          def.guide.languages,
          def.guide.certifications,
          def.guide.specialisations,
          def.guide.years_experience,
          def.guide.is_available_hourly,
          def.guide.gallery_images,
        ]
      );

      const guideId = guideRows[0].id;

      if (beforeGuide.length > 0) {
        results.guidesUpdated.push(`${def.guide.tagline} — ${def.email}`);
      } else {
        results.guidesCreated.push(`${def.guide.tagline} — ${def.email}`);
      }

      // Guide cities
      await query(
        `INSERT INTO guide_cities (guide_id, city_id, areas_covered, is_primary)
         VALUES ($1, $2, ARRAY['City Bowl','Atlantic Seaboard','Southern Suburbs'], true)
         ON CONFLICT (guide_id, city_id) DO NOTHING`,
        [guideId, cityId]
      );

      // Activities
      for (const act of def.activities) {
        const catId = def.category_slug
          ? (catBySlug.get(def.category_slug) ?? null)
          : null;

        const { rows: beforeAct } = await query(
          `SELECT id FROM activities WHERE city_id = $1 AND slug = $2`,
          [cityId, act.slug]
        );

        await query(
          `INSERT INTO activities (
            city_id, guide_id, category_id, title, slug, description,
            short_description, duration_hours, price, price_type,
            min_group_size, max_group_size, difficulty_level, included_items,
            pickup_address, is_active, is_featured, images
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, true, $16)
          ON CONFLICT (city_id, slug) DO UPDATE SET
            guide_id = EXCLUDED.guide_id,
            category_id = EXCLUDED.category_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            short_description = EXCLUDED.short_description,
            duration_hours = EXCLUDED.duration_hours,
            price = EXCLUDED.price,
            price_type = EXCLUDED.price_type,
            min_group_size = EXCLUDED.min_group_size,
            max_group_size = EXCLUDED.max_group_size,
            difficulty_level = EXCLUDED.difficulty_level,
            included_items = EXCLUDED.included_items,
            pickup_address = EXCLUDED.pickup_address,
            is_active = EXCLUDED.is_active,
            is_featured = EXCLUDED.is_featured,
            images = EXCLUDED.images`,
          [
            cityId,
            guideId,
            catId,
            act.title,
            act.slug,
            act.description,
            act.short_description,
            act.duration_hours,
            act.price,
            act.price_type,
            act.min_group_size,
            act.max_group_size,
            (act as any).difficulty_level ?? null,
            act.included_items,
            act.pickup_address,
            act.images,
          ]
        );

        if (beforeAct.length > 0) {
          results.activitiesUpdated.push(act.title);
        } else {
          results.activitiesCreated.push(act.title);
        }
      }
    }

    /* ═══════════════════════════════════════════════════════════
       2. DRIVERS
       ═══════════════════════════════════════════════════════════ */
    for (const def of DRIVER_DEFS) {
      const userId = await ensureUser(def, results);
      if (!userId) continue;

      await query(
        `INSERT INTO profiles (id, user_type, phone, bio, first_name, last_name)
         VALUES ($1, 'driver', $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           user_type = EXCLUDED.user_type,
           phone = EXCLUDED.phone,
           bio = EXCLUDED.bio,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name`,
        [userId, def.phone, def.driver.bio, def.first_name, def.last_name]
      );

      const { rows: beforeDriver } = await query(
        `SELECT id FROM drivers WHERE profile_id = $1`,
        [userId]
      );

      const { rows: driverRows } = await query(
        `INSERT INTO drivers (
          profile_id, bio, tagline, hourly_rate, distance_rate, languages,
          has_own_vehicle, vehicle_make, vehicle_model, vehicle_year, vehicle_seats,
          is_available_hourly, is_available_distance, is_verified, verified_at, vehicle_images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), $14)
        ON CONFLICT (profile_id) DO UPDATE SET
          bio = EXCLUDED.bio,
          tagline = EXCLUDED.tagline,
          hourly_rate = EXCLUDED.hourly_rate,
          distance_rate = EXCLUDED.distance_rate,
          languages = EXCLUDED.languages,
          has_own_vehicle = EXCLUDED.has_own_vehicle,
          vehicle_make = EXCLUDED.vehicle_make,
          vehicle_model = EXCLUDED.vehicle_model,
          vehicle_year = EXCLUDED.vehicle_year,
          vehicle_seats = EXCLUDED.vehicle_seats,
          is_available_hourly = EXCLUDED.is_available_hourly,
          is_available_distance = EXCLUDED.is_available_distance,
          is_verified = EXCLUDED.is_verified,
          verified_at = EXCLUDED.verified_at,
          vehicle_images = EXCLUDED.vehicle_images
        RETURNING id`,
        [
          userId,
          def.driver.bio,
          def.driver.tagline,
          def.driver.hourly_rate,
          def.driver.distance_rate,
          def.driver.languages,
          def.driver.has_own_vehicle,
          def.driver.vehicle_make,
          def.driver.vehicle_model,
          def.driver.vehicle_year,
          def.driver.vehicle_seats,
          def.driver.is_available_hourly,
          def.driver.is_available_distance,
          def.driver.vehicle_images,
        ]
      );

      const driverId = driverRows[0].id;

      if (beforeDriver.length > 0) {
        results.driversUpdated.push(`${def.driver.tagline} — ${def.email}`);
      } else {
        results.driversCreated.push(`${def.driver.tagline} — ${def.email}`);
      }

      await query(
        `INSERT INTO driver_cities (driver_id, city_id, areas_covered, is_primary)
         VALUES ($1, $2, ARRAY['City Bowl','Atlantic Seaboard','Winelands','Peninsula'], true)
         ON CONFLICT (driver_id, city_id) DO NOTHING`,
        [driverId, cityId]
      );
    }

    /* ── Admin user ── */
    const adminUserId = await ensureUser(
      { email: "admin@wandermate.demo", password: "demo1234", first_name: "Admin", last_name: "User" },
      results
    );
    if (adminUserId) {
      await query(
        `INSERT INTO profiles (id, user_type, first_name, last_name)
         VALUES ($1, 'super_admin', $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           user_type = EXCLUDED.user_type,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name`,
        [adminUserId, "Admin", "User"]
      );
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

/* ── Ensure user exists (create or return existing) ── */
async function ensureUser(
  def: { email: string; password: string; first_name: string; last_name: string },
  results: { usersCreated: string[]; usersUpdated: string[]; errors: string[] }
): Promise<string | null> {
  const { rows } = await query(`SELECT id FROM users WHERE email = $1`, [
    def.email,
  ]);

  if (rows.length > 0) {
    results.usersUpdated.push(`${def.first_name} ${def.last_name} (${def.email})`);
    return rows[0].id;
  }

  try {
    const passwordHash = await hashPassword(def.password);
    const { rows: newUser } = await query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [def.email, passwordHash]
    );
    results.usersCreated.push(`${def.first_name} ${def.last_name} (${def.email})`);
    return newUser[0].id;
  } catch (err: any) {
    results.errors.push(`${def.email}: ${err.message}`);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   DATA DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */

const GUIDE_DEFS = [
  {
    email: "thandiwe@wandermate.demo",
    password: "demo1234",
    first_name: "Thandiwe",
    last_name: "Mokoena",
    phone: "+27821234501",
    category_slug: "cultural-historical",
    guide: {
      bio: "Born and raised in Langa, I share authentic stories of Cape Town's townships beyond the stereotypes. 12 years experience.",
      tagline: "Township & Cultural Specialist",
      hourly_rate: 18000,
      languages: ["English", "isiXhosa", "Afrikaans"],
      certifications: ["First Aid Level 2", "SATSA Registered"],
      specialisations: ["Township Tours", "Cultural History", "Storytelling"],
      years_experience: 12,
      is_available_hourly: true,
      avatar_url: "/images/guides/thandiwe/profile.jpg",
      gallery_images: ["/images/guides/thandiwe/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Langa Township Walking Tour",
        slug: "langa-township-walking-tour",
        description:
          "An authentic walking tour through Langa, Cape Town's oldest township. Visit a local shebeen, meet artists at the community centre, and hear stories that go far beyond the stereotypes. This is a respectful, immersive experience that supports local businesses directly.",
        short_description:
          "Authentic township walk through Langa with local stories and community visits.",
        duration_hours: 3,
        price: 45000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 8,
        included_items: ["Local lunch", "Donation to community project", "Bottle of water"],
        pickup_address: "V&A Waterfront or CBD hotels",
        images: null,
      },
      {
        title: "Bo-Kaap Cultural & Cooking Experience",
        slug: "bo-kaap-cultural-cooking",
        description:
          "Walk the colourful streets of Bo-Kaap while learning about Cape Malay heritage. Then step into a local kitchen and cook a traditional curry from scratch. You'll leave with a full belly, a recipe card, and a deeper understanding of one of Cape Town's most vibrant communities.",
        short_description:
          "Colourful walking tour + hands-on Cape Malay cooking class in Bo-Kaap.",
        duration_hours: 4,
        price: 65000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 6,
        included_items: ["Ingredients", "Recipe card", "Full meal", "Spice pack to take home"],
        pickup_address: "Bo-Kaap (or hotel transfer)",
        images: null,
      },
    ],
  },
  {
    email: "james@wandermate.demo",
    password: "demo1234",
    first_name: "James",
    last_name: "van der Merwe",
    phone: "+27821234502",
    category_slug: "wine-tours",
    guide: {
      bio: "Third-generation Stellenbosch local. I know every vineyard worth visiting and the stories behind them. Wine judge certified.",
      tagline: "Wine & Nature Expert",
      hourly_rate: 25000,
      languages: ["English", "Afrikaans"],
      certifications: ["WSET Level 3", "First Aid"],
      specialisations: ["Wine Tours", "Nature Walks", "History"],
      years_experience: 8,
      is_available_hourly: true,
      avatar_url: "/images/guides/james/profile.jpg",
      gallery_images: ["/images/guides/james/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Stellenbosch Premium Wine Route",
        slug: "stellenbosch-premium-wine-route",
        description:
          "A curated day through four boutique wineries in the Stellenbosch valley. Enjoy private tastings, a behind-the-scenes cellar tour, and a farm-to-table lunch paired with estate wines. I grew up here — I know the winemakers personally.",
        short_description:
          "4 boutique wineries, private tastings, cellar tour and lunch pairing in Stellenbosch.",
        duration_hours: 6,
        price: 120000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 6,
        included_items: ["All tastings", "Lunch pairing", "Transport coordination", "Cellar tour"],
        pickup_address: "Cape Town CBD",
        images: null,
      },
      {
        title: "Kirstenbosch Botanical Gardens Walk",
        slug: "kirstenbosch-botanical-walk",
        description:
          "A relaxed guided walk through the world-famous Kirstenbosch National Botanical Garden. Learn about indigenous fynbos, medicinal plants, and the ecology of Table Mountain. Perfect for nature lovers and photographers.",
        short_description:
          "Guided walk through Kirstenbosch focusing on indigenous flora and Table Mountain ecology.",
        duration_hours: 2.5,
        price: 35000,
        price_type: "per_person" as const,
        min_group_size: 1,
        max_group_size: 10,
        included_items: ["Garden entry fee", "Guided walk", "Plant checklist"],
        pickup_address: "Kirstenbosch gates",
        images: null,
      },
    ],
  },
  {
    email: "sarah@wandermate.demo",
    password: "demo1234",
    first_name: "Sarah",
    last_name: "Chen",
    phone: "+27821234503",
    category_slug: "photography",
    guide: {
      bio: "Professional photographer and hiking guide. I help you capture Cape Town's most Instagram-worthy spots while keeping you safe on the trails.",
      tagline: "Adventure & Photography",
      hourly_rate: 20000,
      languages: ["English", "Mandarin"],
      certifications: ["Wilderness First Responder", "Drone Pilot License"],
      specialisations: ["Photography", "Hiking", "Adventure Tours"],
      years_experience: 5,
      is_available_hourly: true,
      avatar_url: "/images/guides/sarah/profile.jpg",
      gallery_images: ["/images/guides/sarah/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Table Mountain Sunrise Photography Hike",
        slug: "table-mountain-sunrise-photo-hike",
        description:
          "Hike Platteklip Gorge in the dark to catch golden hour from the summit of Table Mountain. I teach composition, exposure, and drone techniques while we wait for the light. A moderate fitness level is required.",
        short_description:
          "Sunrise hike up Platteklip Gorge with photography coaching at the summit.",
        duration_hours: 4,
        price: 55000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 5,
        difficulty_level: "moderate" as const,
        included_items: ["Snacks", "Photography tips booklet", "Safety briefing"],
        pickup_address: "Lower Cable Station",
        images: null,
      },
      {
        title: "Cape Point & Chapmans Peak Photo Safari",
        slug: "cape-point-chapmans-photo-safari",
        description:
          "A full-day scenic drive with multiple photo stops along Chapmans Peak Drive, Cape Point Nature Reserve, and the Boulders Beach penguin colony. Includes park entry fees and a seaside lunch.",
        short_description:
          "Full-day scenic drive and photo safari to Cape Point and Chapmans Peak.",
        duration_hours: 8,
        price: 85000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 4,
        included_items: ["Park entry fees", "Lunch", "Photography coaching", "Transport coordination"],
        pickup_address: "Cape Town CBD",
        images: null,
      },
    ],
  },
  {
    email: "david@wandermate.demo",
    password: "demo1234",
    first_name: "David",
    last_name: "Nkosi",
    phone: "+27821234504",
    category_slug: "wildlife-safari",
    guide: {
      bio: "Former game ranger turned specialist guide. I know where the wildlife is and how to find it.",
      tagline: "Wildlife & Safari Specialist",
      hourly_rate: 22000,
      languages: ["English", "isiZulu", "Afrikaans"],
      certifications: ["FGASA Level 2", "Wilderness First Aid"],
      specialisations: ["Wildlife", "Safari", "Birding"],
      years_experience: 15,
      is_available_hourly: false,
      avatar_url: "/images/guides/david/profile.jpg",
      gallery_images: ["/images/guides/david/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Aquila Private Game Reserve Day Safari",
        slug: "aquila-day-safari",
        description:
          "A full-day Big 5 safari at Aquila Private Game Reserve, just two hours from Cape Town. Includes two game drives, a buffet lunch, and time to relax by the pool. An unforgettable wildlife experience without the flight to Kruger.",
        short_description:
          "Full-day Big 5 safari at Aquila with game drives, lunch and return transport.",
        duration_hours: 10,
        price: 220000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 6,
        included_items: ["Return transport", "Reserve entry", "Buffet lunch", "Two game drives", "Pool access"],
        pickup_address: "Cape Town CBD (05:30 AM)",
        images: null,
      },
      {
        title: "Birding at Rondevlei Nature Reserve",
        slug: "rondevlei-birding",
        description:
          "A peaceful morning of birdwatching at Rondevlei Nature Reserve, home to flamingos, pelicans, and over 200 bird species. Binoculars and a bird checklist are provided. Great for beginners and experienced birders alike.",
        short_description:
          "Morning birdwatching at Rondevlei with 200+ species including flamingos and pelicans.",
        duration_hours: 3,
        price: 40000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 8,
        included_items: ["Reserve entry", "Binoculars", "Bird checklist", "Guide fee"],
        pickup_address: "Grassy Park or CBD",
        images: null,
      },
    ],
  },
  {
    email: "emma@wandermate.demo",
    password: "demo1234",
    first_name: "Emma",
    last_name: "Ross",
    phone: "+27821234505",
    category_slug: "food-culinary",
    guide: {
      bio: "Chef, food writer, and market obsessive. I'll show you where Capetonians actually eat — from township braais to fine dining.",
      tagline: "Food & Lifestyle",
      hourly_rate: 20000,
      languages: ["English", "French"],
      certifications: ["Professional Chef Diploma"],
      specialisations: ["Food Tours", "Markets", "Cooking"],
      years_experience: 7,
      is_available_hourly: true,
      avatar_url: "/images/guides/emma/profile.jpg",
      gallery_images: ["/images/guides/emma/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Old Biscuit Mill Saturday Market Food Tour",
        slug: "old-biscuit-mill-food-tour",
        description:
          "A curated tasting tour through Cape Town's most famous Saturday market. Meet the producers, sample artisanal cheeses, charcuterie, and baked goods, and finish with a hands-on sourdough workshop.",
        short_description:
          "Curated tasting tour and sourdough workshop at the Old Biscuit Mill market.",
        duration_hours: 3,
        price: 50000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 6,
        included_items: ["All tastings", "Coffee", "Recipe cards", "Sourdough workshop"],
        pickup_address: "Woodstock (or CBD transfer)",
        images: null,
      },
      {
        title: "Cape Malay Cooking Class in Bo-Kaap",
        slug: "cape-malay-cooking-class",
        description:
          "Shop for spices at the historic Atlas Trading Company, then cook three traditional Cape Malay dishes in a colourful Bo-Kaap kitchen. Eat together at a long table and take home a spice pack to recreate the flavours.",
        short_description:
          "Spice shopping + hands-on cooking of 3 Cape Malay dishes in Bo-Kaap.",
        duration_hours: 4,
        price: 75000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 6,
        included_items: ["All ingredients", "Spice pack to take home", "Recipe booklet", "Full meal"],
        pickup_address: "Bo-Kaap",
        images: null,
      },
    ],
  },
];

const DRIVER_DEFS = [
  {
    email: "pieter@wandermate.demo",
    password: "demo1234",
    first_name: "Pieter",
    last_name: "de Klerk",
    phone: "+27822345601",
    driver: {
      bio: "Professional chauffeur with 20 years experience. Specialist in wine route driving — I know the back roads and the best lunch stops.",
      tagline: "Luxury sedan & wine specialist",
      hourly_rate: 35000,
      distance_rate: 12,
      languages: ["English", "Afrikaans"],
      has_own_vehicle: true,
      vehicle_make: "Mercedes-Benz",
      vehicle_model: "E-Class",
      vehicle_year: 2021,
      vehicle_seats: 4,
      is_available_hourly: true,
      is_available_distance: true,
      vehicle_images: ["/images/drivers/pieter/vehicle.jpg"],
    },
  },
  {
    email: "bongani@wandermate.demo",
    password: "demo1234",
    first_name: "Bongani",
    last_name: "Mthembu",
    phone: "+27822345602",
    driver: {
      bio: "Experienced overland driver. My Toyota Land Cruiser can go anywhere — beaches, mountains, game reserves. Perfect for families and groups.",
      tagline: "Safari vehicle & large groups",
      hourly_rate: 40000,
      distance_rate: 15,
      languages: ["English", "isiXhosa", "isiZulu"],
      has_own_vehicle: true,
      vehicle_make: "Toyota",
      vehicle_model: "Land Cruiser 79",
      vehicle_year: 2019,
      vehicle_seats: 9,
      is_available_hourly: true,
      is_available_distance: true,
      vehicle_images: ["/images/drivers/bongani/vehicle.jpg"],
    },
  },
  {
    email: "fatima@wandermate.demo",
    password: "demo1234",
    first_name: "Fatima",
    last_name: "Hassen",
    phone: "+27822345603",
    driver: {
      bio: "City driving specialist. I navigate Cape Town's traffic so you don't have to. Also available to drive your rental car if you're nervous on our roads.",
      tagline: "City specialist & own-car driver",
      hourly_rate: 28000,
      distance_rate: 10,
      languages: ["English", "Afrikaans"],
      has_own_vehicle: true,
      vehicle_make: "Hyundai",
      vehicle_model: "Tucson",
      vehicle_year: 2022,
      vehicle_seats: 5,
      is_available_hourly: true,
      is_available_distance: true,
      vehicle_images: ["/images/drivers/fatima/vehicle.jpg"],
    },
  },
];
