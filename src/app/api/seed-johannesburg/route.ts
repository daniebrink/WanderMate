import { NextResponse } from "next/server";
import { query } from "@/lib/db";
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
    packagesCreated: [] as string[],
    packagesUpdated: [] as string[],
    errors: [] as string[],
  };

  try {
    /* ── Ensure Johannesburg exists ── */
    const { rows: cityRows } = await query(
      `SELECT id FROM cities WHERE slug = 'johannesburg'`
    );
    let cityId: string;
    if (cityRows.length > 0) {
      cityId = cityRows[0].id;
      // City images are now stored in city_images table (BYTEA)
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
          'johannesburg', 'Johannesburg', 'South Africa', 'ZAR', 'R',
          -26.2041, 28.0473, 'Africa/Johannesburg', '+27',
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

    /* ── Distance options for Johannesburg ── */
    const distanceOptions = [
      { radius_km: 15, label: "CBD & Northern Suburbs", description: "Sandton, Rosebank, Melville, Braamfontein", sort_order: 1 },
      { radius_km: 40, label: "Soweto & Cradle of Humankind", description: "Soweto township, Sterkfontein Caves, Maropeng", sort_order: 2 },
      { radius_km: 80, label: "Magaliesberg & Hartbeespoort", description: "Mountain hiking, Harties dam, elephant sanctuary", sort_order: 3 },
      { radius_km: 150, label: "Pilanesberg & Sun City", description: "Big 5 safari, Sun City resort, Lost City", sort_order: 4 },
      { radius_km: 300, label: "Kruger Park Gateway", description: "Mpumalanga, Blyde River Canyon, Kruger access", sort_order: 5 },
    ];

    for (const opt of distanceOptions) {
      await query(
        `INSERT INTO distance_options (city_id, radius_km, label, description, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [cityId, opt.radius_km, opt.label, opt.description, opt.sort_order]
      );
    }

    /* ═══════════════════════════════════════════════════════════
       1. GUIDES
       ═══════════════════════════════════════════════════════════ */
    for (const def of GUIDE_DEFS) {
      const userId = await ensureUser(def, results);
      if (!userId) continue;

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

      await query(
        `INSERT INTO guide_cities (guide_id, city_id, areas_covered, is_primary)
         VALUES ($1, $2, ARRAY['Sandton','Rosebank','Melville','Soweto','Cradle of Humankind'], true)
         ON CONFLICT (guide_id, city_id) DO NOTHING`,
        [guideId, cityId]
      );

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
         VALUES ($1, $2, ARRAY['Sandton','Rosebank','Soweto','Pilanesberg','Magaliesberg'], true)
         ON CONFLICT (driver_id, city_id) DO NOTHING`,
        [driverId, cityId]
      );
    }

    /* ═══════════════════════════════════════════════════════════
       3. PACKAGES
       ═══════════════════════════════════════════════════════════ */
    for (const pkg of PACKAGE_DEFS) {
      const { rows: beforePkg } = await query(
        `SELECT id FROM packages WHERE city_id = $1 AND slug = $2`,
        [cityId, pkg.slug]
      );

      await query(
        `INSERT INTO packages (
          city_id, title, slug, description, itinerary,
          total_price, duration_hours, max_group_size,
          whats_included, whats_not_included, pickup_address,
          is_active, is_featured, images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, true, $12)
        ON CONFLICT (city_id, slug) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          itinerary = EXCLUDED.itinerary,
          total_price = EXCLUDED.total_price,
          duration_hours = EXCLUDED.duration_hours,
          max_group_size = EXCLUDED.max_group_size,
          whats_included = EXCLUDED.whats_included,
          whats_not_included = EXCLUDED.whats_not_included,
          pickup_address = EXCLUDED.pickup_address,
          is_active = EXCLUDED.is_active,
          is_featured = EXCLUDED.is_featured,
          images = EXCLUDED.images`,
        [
          cityId,
          pkg.title,
          pkg.slug,
          pkg.description,
          JSON.stringify(pkg.itinerary),
          pkg.total_price,
          pkg.duration_hours,
          pkg.max_group_size,
          pkg.whats_included,
          pkg.whats_not_included,
          pkg.pickup_address,
          pkg.images,
        ]
      );

      if (beforePkg.length > 0) {
        results.packagesUpdated.push(pkg.title);
      } else {
        results.packagesCreated.push(pkg.title);
      }
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
   DATA DEFINITIONS — JOHANNESBURG
   ═══════════════════════════════════════════════════════════════ */

const GUIDE_DEFS = [
  {
    email: "nomsa@wandermate.demo",
    password: "demo1234",
    first_name: "Nomsa",
    last_name: "Dlamini",
    phone: "+27831234501",
    category_slug: "cultural-historical",
    guide: {
      bio: "Born in Soweto and raised in its streets, I bring alive the stories of Johannesburg's past and present. From apartheid history to today's vibrant art scene — I show you the real Jozi.",
      tagline: "History & Heritage Specialist",
      hourly_rate: 20000,
      languages: ["English", "isiZulu", "Sesotho"],
      certifications: ["First Aid Level 2", "SATSA Registered", "Apartheid Museum Certified"],
      specialisations: ["Township Tours", "Apartheid History", "Urban Culture"],
      years_experience: 14,
      is_available_hourly: true,
      avatar_url: "/images/guides/nomsa/profile.jpg",
      gallery_images: ["/images/guides/nomsa/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Soweto Township & Vilakazi Street Tour",
        slug: "soweto-vilakazi-street-tour",
        description:
          "Walk in the footsteps of Nelson Mandela and Desmond Tutu on Vilakazi Street — the only street in the world home to two Nobel Peace Prize winners. Visit the Hector Pieterson Memorial, enjoy a traditional shisa nyama lunch, and meet local artisans in the Kliptown market. A powerful, uplifting journey through South Africa's most famous township.",
        short_description:
          "Walk Vilakazi Street, visit Hector Pieterson Memorial, and enjoy shisa nyama in Soweto.",
        duration_hours: 5,
        price: 65000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 10,
        included_items: ["Traditional lunch", "Memorial entry", "Local guide", "Bottled water"],
        pickup_address: "Sandton City or Rosebank Gautrain",
        images: null,
      },
      {
        title: "Apartheid Museum & Constitutional Hill",
        slug: "apartheid-museum-constitutional-hill",
        description:
          "A deeply moving half-day exploring South Africa's struggle for freedom. At the Apartheid Museum, walk through interactive exhibitions that bring the apartheid era to life. Then visit Constitutional Hill — the former prison complex that now houses the country's highest court. Hear stories of resilience from those who were imprisoned here, including Nelson Mandela and Mahatma Gandhi.",
        short_description:
          "Interactive Apartheid Museum tour followed by Constitutional Hill and the Old Fort.",
        duration_hours: 4,
        price: 55000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 8,
        included_items: ["Museum entry", "Constitutional Hill tour", "Audio guide", "Transport coordination"],
        pickup_address: "Johannesburg CBD or Sandton",
        images: null,
      },
    ],
  },
  {
    email: "johan@wandermate.demo",
    password: "demo1234",
    first_name: "Johan",
    last_name: "Pretorius",
    phone: "+27831234502",
    category_slug: "wildlife-safari",
    guide: {
      bio: "Former ranger at Pilanesberg National Park with 18 years of bush experience. I know exactly where the lions sleep, where the elephants bathe, and how to track a leopard.",
      tagline: "Bushveld & Safari Expert",
      hourly_rate: 28000,
      languages: ["English", "Afrikaans"],
      certifications: ["FGASA Level 3", "Advanced Rifle Handling", "Wilderness First Aid"],
      specialisations: ["Big 5 Safaris", "Birding", "Bushwalks"],
      years_experience: 18,
      is_available_hourly: false,
      avatar_url: "/images/guides/johan/profile.jpg",
      gallery_images: ["/images/guides/johan/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Pilanesberg Big 5 Full-Day Safari",
        slug: "pilanesberg-big-5-safari",
        description:
          "A full-day open-vehicle safari in Pilanesberg National Park, one of South Africa's most accessible Big 5 reserves. With an ex-ranger guide, enjoy morning and afternoon game drives, a bush brunch, and incredible wildlife photography opportunities. Lions, elephants, rhinos, buffalo, and leopards — all in a malaria-free zone just 2.5 hours from Johannesburg.",
        short_description:
          "Full-day open-vehicle Big 5 safari in Pilanesberg with an ex-ranger guide.",
        duration_hours: 10,
        price: 280000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 6,
        included_items: ["Return transport", "Park entry", "Open safari vehicle", "Bush brunch", "Game drives"],
        pickup_address: "Johannesburg or Pretoria (05:00 AM)",
        images: null,
      },
      {
        title: "Lion & Safari Park Interactive Tour",
        slug: "lion-safari-park-interactive",
        description:
          "Get up close with lions, cheetahs, giraffes, and wild dogs at the renowned Lion & Safari Park just outside Johannesburg. Enjoy a guided game drive, walk with cheetahs, and feed giraffes by hand. A fantastic option for families or those short on time who still want an authentic wildlife encounter.",
        short_description:
          "Up-close wildlife encounters with lions, cheetahs and giraffes near Johannesburg.",
        duration_hours: 4,
        price: 120000,
        price_type: "per_person" as const,
        min_group_size: 1,
        max_group_size: 8,
        included_items: ["Park entry", "Guided game drive", "Cheetah walk", "Giraffe feeding"],
        pickup_address: "Sandton or Fourways",
        images: null,
      },
    ],
  },

  {
    email: "lerato@wandermate.demo",
    password: "demo1234",
    first_name: "Lerato",
    last_name: "Molefe",
    phone: "+27831234503",
    category_slug: "photography",
    guide: {
      bio: "Street photographer and urban culture curator. I know every mural, every gallery, and every hidden rooftop view in Maboneng and the inner city. Let me show you the creative side of Johannesburg.",
      tagline: "Street Art & Urban Culture",
      hourly_rate: 18000,
      languages: ["English", "isiZulu"],
      certifications: ["First Aid Level 1", "Street Art SA Member"],
      specialisations: ["Street Photography", "Urban Art", "Creative Tours"],
      years_experience: 6,
      is_available_hourly: true,
      avatar_url: "/images/guides/lerato/profile.jpg",
      gallery_images: ["/images/guides/lerato/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Maboneng Street Art & Photography Walk",
        slug: "maboneng-street-art-photo-walk",
        description:
          "Explore Johannesburg's most creative neighbourhood — Maboneng Precinct. Wander through ever-changing street art alleys, visit independent galleries, and capture the city's industrial-chic aesthetic. I'll teach you urban photography techniques while sharing stories about the artists who transformed this once-abandoned district into a cultural hub.",
        short_description:
          "Street art walking tour and photography workshop in Maboneng Precinct.",
        duration_hours: 3,
        price: 45000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 8,
        included_items: ["Photography tips booklet", "Gallery entries", "Coffee at a local roastery"],
        pickup_address: "Maboneng (or hotel transfer)",
        images: null,
      },
      {
        title: "Johannesburg Skyline Sunset Rooftop Tour",
        slug: "johannesburg-skyline-sunset-rooftop",
        description:
          "Experience Johannesburg's dramatic skyline from the best rooftop vantage points. Visit three iconic rooftops in the CBD and Braamfontein, enjoy sundowners with panoramic views, and capture golden hour shots of the City of Gold. A stylish evening tour perfect for photography enthusiasts and urban explorers.",
        short_description:
          "Rooftop hopping at sunset with panoramic views and photography coaching.",
        duration_hours: 4,
        price: 60000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 6,
        included_items: ["Sundowner drinks", "Photography coaching", "Rooftop access fees"],
        pickup_address: "Sandton or Rosebank",
        images: null,
      },
    ],
  },
  {
    email: "michael@wandermate.demo",
    password: "demo1234",
    first_name: "Michael",
    last_name: "O'Brien",
    phone: "+27831234504",
    category_slug: "hiking-nature",
    guide: {
      bio: "Geologist, caver, and nature enthusiast. I've spent 20 years exploring the Cradle of Humankind and the Magaliesberg. Let me take you underground and into the wild.",
      tagline: "Caves & Nature Specialist",
      hourly_rate: 22000,
      languages: ["English"],
      certifications: ["Cave Guide Certification", "FGASA Level 1", "First Aid Level 2"],
      specialisations: ["Caving", "Geology", "Hiking", "Fossil Tours"],
      years_experience: 20,
      is_available_hourly: true,
      avatar_url: "/images/guides/michael/profile.jpg",
      gallery_images: ["/images/guides/michael/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Cradle of Humankind & Sterkfontein Caves",
        slug: "cradle-of-humankind-sterkfontein-caves",
        description:
          "Journey back 2.5 million years at the Cradle of Humankind UNESCO World Heritage Site. Descend into the Sterkfontein Caves where Mrs. Ples and Little Foot were discovered, then explore the interactive Maropeng museum. A fascinating half-day for anyone curious about human origins.",
        short_description:
          "Explore Sterkfontein Caves and Maropeng museum at the Cradle of Humankind.",
        duration_hours: 5,
        price: 75000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 8,
        included_items: ["Cave entry", "Maropeng entry", "Guided tour", "Transport coordination"],
        pickup_address: "Johannesburg or Pretoria",
        images: null,
      },
      {
        title: "Magaliesberg Mountain Hike & Waterfalls",
        slug: "magaliesberg-mountain-hike-waterfalls",
        description:
          "A refreshing full-day hike through the Magaliesberg mountain range, one of the oldest mountain ranges in the world. Trek through indigenous forest, swim in natural rock pools beneath waterfalls, and enjoy a packed lunch with panoramic valley views. Moderate fitness required.",
        short_description:
          "Full-day Magaliesberg hike with waterfalls, rock pools and valley views.",
        duration_hours: 7,
        price: 55000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 8,
        difficulty_level: "moderate" as const,
        included_items: ["Packed lunch", "Trail permits", "Safety briefing", "First aid kit"],
        pickup_address: "Johannesburg (06:30 AM)",
        images: null,
      },
    ],
  },
  {
    email: "amina@wandermate.demo",
    password: "demo1234",
    first_name: "Amina",
    last_name: "Patel",
    phone: "+27831234505",
    category_slug: "food-culinary",
    guide: {
      bio: "Third-generation restaurateur from Fordsburg. I grew up in the kitchen of my family's Indian restaurant and now run food tours through Johannesburg's most flavourful neighbourhoods.",
      tagline: "Indian Cuisine & Market Tours",
      hourly_rate: 19000,
      languages: ["English", "Hindi", "Urdu"],
      certifications: ["Professional Chef Diploma", "Food Safety Certified"],
      specialisations: ["Indian Cuisine", "Market Tours", "Cooking Classes"],
      years_experience: 9,
      is_available_hourly: true,
      avatar_url: "/images/guides/amina/profile.jpg",
      gallery_images: ["/images/guides/amina/gallery-01.jpg"],
    },
    activities: [
      {
        title: "Fordsburg Spice Market & Indian Cooking Class",
        slug: "fordsburg-spice-market-indian-cooking",
        description:
          "Start at the bustling Fordsburg spice market where you'll learn to identify and select the perfect masalas, saffron, and fresh curry leaves. Then head to a family kitchen to cook three traditional Indian dishes — butter chicken, biryani, and freshly baked naan. Eat together and take home a spice box to recreate the magic.",
        short_description:
          "Spice market tour followed by hands-on Indian cooking class in Fordsburg.",
        duration_hours: 4,
        price: 70000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 6,
        included_items: ["All ingredients", "Spice box to take home", "Recipe booklet", "Full meal"],
        pickup_address: "Fordsburg (or hotel transfer)",
        images: null,
      },
      {
        title: "Neighbourgoods Market Braamfontein Food Tour",
        slug: "neighbourgoods-market-food-tour",
        description:
          "A curated tasting tour through Johannesburg's iconic Saturday market. Sample artisanal cheeses, freshly baked sourdough, gourmet boerewors rolls, craft gin, and handcrafted chocolates. Meet the producers behind the stalls and learn about South Africa's booming artisanal food scene.",
        short_description:
          "Curated tasting tour through Neighbourgoods Market with artisan producers.",
        duration_hours: 3,
        price: 50000,
        price_type: "per_person" as const,
        min_group_size: 2,
        max_group_size: 8,
        included_items: ["All tastings", "Craft gin sample", "Market guide booklet"],
        pickup_address: "Braamfontein (or hotel transfer)",
        images: null,
      },
    ],
  },
];

const DRIVER_DEFS = [
  {
    email: "sipho@wandermate.demo",
    password: "demo1234",
    first_name: "Sipho",
    last_name: "Ndlovu",
    phone: "+27832345601",
    driver: {
      bio: "Professional chauffeur with 15 years of experience driving executives, celebrities, and discerning tourists. Specialist in airport transfers, Sandton business district, and long-distance comfort travel.",
      tagline: "Luxury SUV & Executive Transfers",
      hourly_rate: 40000,
      distance_rate: 14,
      languages: ["English", "isiZulu"],
      has_own_vehicle: true,
      vehicle_make: "BMW",
      vehicle_model: "X5",
      vehicle_year: 2022,
      vehicle_seats: 5,
      is_available_hourly: true,
      is_available_distance: true,
      vehicle_images: ["/images/drivers/sipho/vehicle.jpg"],
    },
  },
  {
    email: "greta@wandermate.demo",
    password: "demo1234",
    first_name: "Greta",
    last_name: "van Wyk",
    phone: "+27832345602",
    driver: {
      bio: "Family-oriented driver with a spacious SUV perfect for groups heading to Pilanesberg, Sun City, or the Magaliesberg. I keep the kids entertained and the adults relaxed on every journey.",
      tagline: "Family Vehicle & Safari Transfers",
      hourly_rate: 38000,
      distance_rate: 13,
      languages: ["English", "Afrikaans"],
      has_own_vehicle: true,
      vehicle_make: "Toyota",
      vehicle_model: "Fortuner",
      vehicle_year: 2021,
      vehicle_seats: 7,
      is_available_hourly: true,
      is_available_distance: true,
      vehicle_images: ["/images/drivers/greta/vehicle.jpg"],
    },
  },
  {
    email: "thabo@wandermate.demo",
    password: "demo1234",
    first_name: "Thabo",
    last_name: "Mokoena",
    phone: "+27832345603",
    driver: {
      bio: "Experienced minibus driver for large groups, events, and corporate outings. Whether it's a Soweto township tour or a team-building trip to Hartbeespoort, I get your group there safely and on time.",
      tagline: "Minibus & Group Transport",
      hourly_rate: 45000,
      distance_rate: 16,
      languages: ["English", "isiZulu", "Sesotho"],
      has_own_vehicle: true,
      vehicle_make: "Mercedes-Benz",
      vehicle_model: "Sprinter",
      vehicle_year: 2020,
      vehicle_seats: 16,
      is_available_hourly: true,
      is_available_distance: true,
      vehicle_images: ["/images/drivers/thabo/vehicle.jpg"],
    },
  },
];

const PACKAGE_DEFS = [
  {
    title: "Johannesburg Heritage Weekend",
    slug: "johannesburg-heritage-weekend",
    description:
      "A curated two-day journey through Johannesburg's most powerful historical and cultural landmarks. Day one explores Soweto and Vilakazi Street. Day two visits the Apartheid Museum and Constitutional Hill. Includes all entries, lunches, and a driver for the weekend.",
    itinerary: [
      { time: "Day 1 — 09:00", title: "Pickup from Sandton hotel" },
      { time: "Day 1 — 10:00", title: "Soweto township tour & Vilakazi Street" },
      { time: "Day 1 — 13:00", title: "Traditional shisa nyama lunch" },
      { time: "Day 1 — 15:00", title: "Hector Pieterson Memorial & Kliptown" },
      { time: "Day 2 — 09:00", title: "Apartheid Museum guided tour" },
      { time: "Day 2 — 13:00", title: "Lunch at Constitution Hill" },
      { time: "Day 2 — 14:30", title: "Constitutional Hill & Old Fort tour" },
      { time: "Day 2 — 17:00", title: "Return to hotel" },
    ],
    total_price: 350000,
    duration_hours: 16,
    max_group_size: 6,
    whats_included: ["Two-day private guide", "Driver & vehicle", "All museum entries", "Two lunches", "Bottled water"],
    whats_not_included: ["Hotel accommodation", "Dinners", "Gratuities"],
    pickup_address: "Any Sandton or Rosebank hotel",
    images: ["/images/packages/johannesburg-heritage-weekend/01.jpg"],
  },
  {
    title: "Pilanesberg Safari Day Trip",
    slug: "pilanesberg-safari-day-trip",
    description:
      "The ultimate day safari from Johannesburg. A private driver takes you to Pilanesberg National Park where an expert ranger guide leads open-vehicle game drives. Spot the Big 5 in a malaria-free reserve and return to Johannesburg the same evening.",
    itinerary: [
      { time: "05:00", title: "Early pickup from Johannesburg" },
      { time: "07:30", title: "Arrive at Pilanesberg, morning game drive" },
      { time: "10:30", title: "Bush brunch at lodge" },
      { time: "12:00", title: "Afternoon game drive" },
      { time: "15:00", title: "Depart for Johannesburg" },
      { time: "17:30", title: "Drop-off at hotel" },
    ],
    total_price: 420000,
    duration_hours: 12,
    max_group_size: 6,
    whats_included: ["Return private transfer", "Park entry fees", "Open safari vehicle", "Expert ranger guide", "Bush brunch"],
    whats_not_included: ["Dinner", "Alcoholic drinks", "Gratuities"],
    pickup_address: "Johannesburg or Pretoria",
    images: ["/images/packages/pilanesberg-safari-day-trip/01.jpg"],
  },
  {
    title: "Jozi Creative & Culinary Day",
    slug: "jozi-creative-culinary-day",
    description:
      "A vibrant one-day tour combining Johannesburg's best street art, markets, and food. Explore Maboneng's murals, shop for spices in Fordsburg, and cook a meal with a local chef. Perfect for creative travellers and food lovers.",
    itinerary: [
      { time: "09:00", title: "Maboneng street art walking tour" },
      { time: "12:00", title: "Coffee & light lunch at a local roastery" },
      { time: "14:00", title: "Fordsburg spice market tour" },
      { time: "15:30", title: "Hands-on Indian cooking class" },
      { time: "18:00", title: "Sunset drinks at a rooftop bar" },
    ],
    total_price: 280000,
    duration_hours: 10,
    max_group_size: 6,
    whats_included: ["Street art guide", "Cooking class", "All ingredients", "Spice box", "Market tastings"],
    whats_not_included: ["Dinner", "Alcoholic drinks beyond sunset round"],
    pickup_address: "Sandton, Rosebank or Melville",
    images: ["/images/packages/jozi-creative-culinary-day/01.jpg"],
  },
];
