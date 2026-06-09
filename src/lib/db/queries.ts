"use server";

import { query } from "../db";
import type { City, Category, DistanceOption, Activity, Guide, Driver, Package, Message } from "@/types";

/* ── Cities ── */

export async function getAllActiveCities(): Promise<Pick<City, "slug" | "name" | "country">[]> {
  const { rows } = await query(
    `SELECT slug, name, country FROM cities WHERE is_active = true ORDER BY name ASC`
  );
  return rows;
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  const { rows } = await query(
    `SELECT * FROM cities WHERE slug = $1 AND is_active = true`,
    [slug]
  );
  const city = rows[0] ?? null;
  if (!city) return null;

  const { rows: imageRows } = await query(
    `SELECT id FROM city_images WHERE city_id = $1 ORDER BY sort_order`,
    [city.id]
  );

  if (imageRows.length > 0) {
    city.hero_images = imageRows.map((img: any) => `/api/city-image/${img.id}`);
  }

  return city;
}

/* ── Categories ── */

export async function getCategoriesByCity(cityId: string | null): Promise<Category[]> {
  const { rows } = await query(
    `SELECT * FROM categories
     WHERE (city_id = $1 OR city_id IS NULL)
       AND is_active = true
     ORDER BY sort_order ASC`,
    [cityId]
  );
  return rows;
}

/* ── Distance Options ── */

export async function getDistanceOptionsByCity(cityId: string): Promise<DistanceOption[]> {
  const { rows } = await query(
    `SELECT * FROM distance_options
     WHERE city_id = $1
     ORDER BY sort_order ASC`,
    [cityId]
  );
  return rows;
}

/* ── Activities ── */

export async function getActivitiesByCity(
  cityId: string,
  options?: { categoryId?: string; limit?: number; featuredOnly?: boolean }
): Promise<Activity[]> {
  let sql = `
    SELECT
      a.*,
      g.id AS guide__id,
      g.tagline AS guide__tagline,
      g.hourly_rate AS guide__hourly_rate,
      g.profile_id AS guide__profile_id,
      c.name AS category__name,
      c.slug AS category__slug
    FROM activities a
    LEFT JOIN guides g ON a.guide_id = g.id
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.city_id = $1 AND a.is_active = true
  `;
  const params: any[] = [cityId];

  if (options?.categoryId) {
    sql += ` AND a.category_id = $${params.length + 1}`;
    params.push(options.categoryId);
  }

  if (options?.featuredOnly) {
    sql += ` AND a.is_featured = true`;
  }

  sql += ` ORDER BY a.created_at DESC`;

  if (options?.limit) {
    sql += ` LIMIT $${params.length + 1}`;
    params.push(options.limit);
  }

  const { rows } = await query(sql, params);
  const activities = rows.map(flatToNested);
  return await attachActivityImages(activities);
}

export async function getActivityBySlug(cityId: string, slug: string): Promise<Activity | null> {
  const { rows } = await query(
    `SELECT
      a.*,
      g.id AS guide__id,
      g.tagline AS guide__tagline,
      g.hourly_rate AS guide__hourly_rate,
      g.bio AS guide__bio,
      g.languages AS guide__languages,
      g.certifications AS guide__certifications,
      g.specialisations AS guide__specialisations,
      g.years_experience AS guide__years_experience,
      g.gallery_images AS guide__gallery_images,
      g.is_available_hourly AS guide__is_available_hourly,
      g.is_active AS guide__is_active,
      g.is_verified AS guide__is_verified,
      g.verified_at AS guide__verified_at,
      c.name AS category__name,
      c.slug AS category__slug
    FROM activities a
    LEFT JOIN guides g ON a.guide_id = g.id
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.city_id = $1 AND a.slug = $2 AND a.is_active = true`,
    [cityId, slug]
  );
  const activity = rows[0] ? flatToNested(rows[0]) : null;
  return activity ? (await attachActivityImages([activity]))[0] : null;
}

/* ── Guides ── */

export async function getGuidesByCity(cityId: string): Promise<Guide[]> {
  const { rows } = await query(
    `SELECT
      gc.areas_covered,
      g.*,
      p.id AS profile__id,
      p.first_name AS profile__first_name,
      p.last_name AS profile__last_name,
      p.avatar_url AS profile__avatar_url,
      p.avatar_data IS NOT NULL AS profile__has_avatar_data
    FROM guide_cities gc
    JOIN guides g ON gc.guide_id = g.id
    LEFT JOIN profiles p ON g.profile_id = p.id
    WHERE gc.city_id = $1 AND gc.is_active = true`,
    [cityId]
  );
  return rows.map((row: any) => ({
    ...row,
    profile: row.profile__first_name
      ? {
          id: row.profile__id,
          first_name: row.profile__first_name,
          last_name: row.profile__last_name,
          avatar_url: row.profile__avatar_url,
          has_avatar_data: row.profile__has_avatar_data,
        }
      : null,
  }));
}

/* ── Drivers ── */

export async function getDriversByCity(cityId: string): Promise<Driver[]> {
  const { rows } = await query(
    `SELECT
      dc.areas_covered,
      d.*,
      d.vehicle_image_data IS NOT NULL AS vehicle__has_image_data,
      p.id AS profile__id,
      p.first_name AS profile__first_name,
      p.last_name AS profile__last_name,
      p.avatar_url AS profile__avatar_url,
      p.avatar_data IS NOT NULL AS profile__has_avatar_data
    FROM driver_cities dc
    JOIN drivers d ON dc.driver_id = d.id
    LEFT JOIN profiles p ON d.profile_id = p.id
    WHERE dc.city_id = $1 AND dc.is_active = true`,
    [cityId]
  );
  return rows.map((row: any) => ({
    ...row,
    profile: row.profile__first_name
      ? {
          id: row.profile__id,
          first_name: row.profile__first_name,
          last_name: row.profile__last_name,
          avatar_url: row.profile__avatar_url,
          has_avatar_data: row.profile__has_avatar_data,
        }
      : null,
    has_vehicle_image_data: row.vehicle__has_image_data,
  }));
}

/* ── Single Guide / Driver ── */

export async function getGuideById(guideId: string): Promise<Guide | null> {
  const { rows } = await query(
    `SELECT
      g.*,
      p.id AS profile__id,
      p.first_name AS profile__first_name,
      p.last_name AS profile__last_name,
      p.avatar_url AS profile__avatar_url,
      p.avatar_data IS NOT NULL AS profile__has_avatar_data,
      p.bio AS profile__bio
    FROM guides g
    LEFT JOIN profiles p ON g.profile_id = p.id
    WHERE g.id = $1`,
    [guideId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...row,
    profile: row.profile__first_name
      ? {
          id: row.profile__id,
          first_name: row.profile__first_name,
          last_name: row.profile__last_name,
          avatar_url: row.profile__avatar_url,
          has_avatar_data: row.profile__has_avatar_data,
          bio: row.profile__bio,
        }
      : null,
  };
}

export async function getDriverById(driverId: string): Promise<Driver | null> {
  const { rows } = await query(
    `SELECT
      d.*,
      d.vehicle_image_data IS NOT NULL AS vehicle__has_image_data,
      p.id AS profile__id,
      p.first_name AS profile__first_name,
      p.last_name AS profile__last_name,
      p.avatar_url AS profile__avatar_url,
      p.avatar_data IS NOT NULL AS profile__has_avatar_data,
      p.bio AS profile__bio
    FROM drivers d
    LEFT JOIN profiles p ON d.profile_id = p.id
    WHERE d.id = $1`,
    [driverId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...row,
    profile: row.profile__first_name
      ? {
          id: row.profile__id,
          first_name: row.profile__first_name,
          last_name: row.profile__last_name,
          avatar_url: row.profile__avatar_url,
          has_avatar_data: row.profile__has_avatar_data,
          bio: row.profile__bio,
        }
      : null,
    has_vehicle_image_data: row.vehicle__has_image_data,
  };
}

export async function getActivitiesByGuide(guideId: string, cityId: string): Promise<Activity[]> {
  const { rows } = await query(
    `SELECT
      a.*,
      c.name AS category__name,
      c.slug AS category__slug
    FROM activities a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.guide_id = $1 AND a.city_id = $2 AND a.is_active = true
    ORDER BY a.created_at DESC`,
    [guideId, cityId]
  );
  const activities = rows.map((row: any) => {
    const activity: any = {};
    const category: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith("category__")) {
        const subKey = key.slice(10);
        if (value !== null && value !== undefined) category[subKey] = value;
      } else {
        activity[key] = value;
      }
    }
    return {
      ...activity,
      category: Object.keys(category).length > 0 ? category : null,
    };
  });
  return await attachActivityImages(activities);
}

/* ── Messages ── */

export async function getMessagesByBooking(bookingId: string): Promise<Message[]> {
  const { rows } = await query(
    `SELECT
      m.id,
      m.sender_id,
      m.content,
      m.is_read,
      m.created_at,
      p.first_name AS sender_first_name,
      p.last_name AS sender_last_name
    FROM messages m
    JOIN profiles p ON m.sender_id = p.id
    WHERE m.booking_id = $1
    ORDER BY m.created_at ASC`,
    [bookingId]
  );
  return rows;
}

/* ── Packages ── */

export async function getPackagesByCity(cityId: string): Promise<Package[]> {
  const { rows } = await query(
    `SELECT
      p.*,
      g.id AS guide__id,
      g.tagline AS guide__tagline,
      d.id AS driver__id,
      d.tagline AS driver__tagline
    FROM packages p
    LEFT JOIN guides g ON p.guide_id = g.id
    LEFT JOIN drivers d ON p.driver_id = d.id
    WHERE p.city_id = $1 AND p.is_active = true`,
    [cityId]
  );
  const packages = rows.map((row: any) => ({
    ...row,
    guide: row.guide__id ? { id: row.guide__id, tagline: row.guide__tagline } : null,
    driver: row.driver__id ? { id: row.driver__id, tagline: row.driver__tagline } : null,
  }));
  return attachPackageImages(packages);
}

/* ── Helpers ── */

async function attachPackageImages(packages: any[]): Promise<any[]> {
  if (packages.length === 0) return packages;

  const packageIds = packages.map((p) => p.id);
  const { rows: imageRows } = await query(
    `SELECT package_id, id FROM package_images WHERE package_id = ANY($1) ORDER BY sort_order`,
    [packageIds]
  );

  const imagesByPackage: Record<string, string[]> = {};
  for (const img of imageRows) {
    if (!imagesByPackage[img.package_id]) imagesByPackage[img.package_id] = [];
    imagesByPackage[img.package_id].push(`/api/package-image/${img.id}`);
  }

  for (const p of packages) {
    p.images = imagesByPackage[p.id] || null;
  }

  return packages;
}

async function attachActivityImages(activities: any[]): Promise<any[]> {
  if (activities.length === 0) return activities;

  const activityIds = activities.map((a) => a.id);
  const { rows: imageRows } = await query(
    `SELECT activity_id, id FROM activity_images WHERE activity_id = ANY($1) ORDER BY sort_order`,
    [activityIds]
  );

  const imagesByActivity: Record<string, string[]> = {};
  for (const img of imageRows) {
    if (!imagesByActivity[img.activity_id]) imagesByActivity[img.activity_id] = [];
    imagesByActivity[img.activity_id].push(`/api/activity-image/${img.id}`);
  }

  for (const a of activities) {
    a.images = imagesByActivity[a.id] || null;
  }

  return activities;
}

function flatToNested(row: any) {
  const activity: any = {};
  const guide: any = {};
  const category: any = {};

  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith("guide__")) {
      const subKey = key.slice(7);
      if (value !== null && value !== undefined) guide[subKey] = value;
    } else if (key.startsWith("category__")) {
      const subKey = key.slice(10);
      if (value !== null && value !== undefined) category[subKey] = value;
    } else {
      activity[key] = value;
    }
  }

  return {
    ...activity,
    guide: Object.keys(guide).length > 0 ? guide : null,
    category: Object.keys(category).length > 0 ? category : null,
  };
}
