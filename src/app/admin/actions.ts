"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import {
  verifyGuideSchema,
  verifyDriverSchema,
  createActivitySchema,
  updateActivitySchema,
  createPackageSchema,
  updatePackageSchema,
  createCitySchema,
} from "@/lib/validation";
import sharp from "sharp";

async function checkAdmin() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }
  const { rows } = await query(
    `SELECT user_type FROM profiles WHERE id = $1`,
    [session.userId]
  );
  const userType = rows[0]?.user_type;
  if (userType !== "city_admin" && userType !== "super_admin") {
    throw new Error("Access denied");
  }
  return session.userId;
}

export async function verifyGuide(formData: FormData) {
  try {
    await checkAdmin();
    const parsed = verifyGuideSchema.safeParse({
      guideId: formData.get("guideId"),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    await query(
      `UPDATE guides SET is_verified = true, verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [parsed.data.guideId]
    );

    revalidatePath("/city", "page");
    redirect("/city?message=" + encodeURIComponent("Guide verified"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city?error=" + encodeURIComponent(err.message));
  }
}

export async function unverifyGuide(formData: FormData) {
  try {
    await checkAdmin();
    const parsed = verifyGuideSchema.safeParse({
      guideId: formData.get("guideId"),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    await query(
      `UPDATE guides SET is_verified = false, verified_at = NULL, updated_at = NOW() WHERE id = $1`,
      [parsed.data.guideId]
    );

    revalidatePath("/city", "page");
    redirect("/city?message=" + encodeURIComponent("Guide unverified"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city?error=" + encodeURIComponent(err.message));
  }
}

export async function verifyDriver(formData: FormData) {
  try {
    await checkAdmin();
    const parsed = verifyDriverSchema.safeParse({
      driverId: formData.get("driverId"),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    await query(
      `UPDATE drivers SET is_verified = true, verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [parsed.data.driverId]
    );

    revalidatePath("/city", "page");
    redirect("/city?message=" + encodeURIComponent("Driver verified"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city?error=" + encodeURIComponent(err.message));
  }
}

export async function unverifyDriver(formData: FormData) {
  try {
    await checkAdmin();
    const parsed = verifyDriverSchema.safeParse({
      driverId: formData.get("driverId"),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    await query(
      `UPDATE drivers SET is_verified = false, verified_at = NULL, updated_at = NOW() WHERE id = $1`,
      [parsed.data.driverId]
    );

    revalidatePath("/city", "page");
    redirect("/city?message=" + encodeURIComponent("Driver unverified"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city?error=" + encodeURIComponent(err.message));
  }
}
export async function deleteActivity(formData: FormData) {
  try {
    await checkAdmin();
    const activityId = formData.get("activityId") as string;
    if (!activityId) throw new Error("Activity ID required");

    await query(`DELETE FROM activities WHERE id = $1`, [activityId]);

    revalidatePath("/city/activities", "page");
    redirect("/city/activities?message=" + encodeURIComponent("Activity deleted"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city/activities?error=" + encodeURIComponent(err.message));
  }
}

async function processActivityImages(formData: FormData): Promise<{ data: Buffer; mimeType: string }[]> {
  const files = formData.getAll("activityImages") as File[];
  const images: { data: Buffer; mimeType: string }[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const resized = await sharp(buffer)
      .resize(1200, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    images.push({ data: resized, mimeType: "image/jpeg" });
  }

  return images;
}

async function processPackageImages(formData: FormData): Promise<{ data: Buffer; mimeType: string }[]> {
  const files = formData.getAll("packageImages") as File[];
  const images: { data: Buffer; mimeType: string }[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const resized = await sharp(buffer)
      .resize(1200, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    images.push({ data: resized, mimeType: "image/jpeg" });
  }

  return images;
}

function splitCommaList(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function createActivity(formData: FormData) {
  try {
    await checkAdmin();

    const images = await processActivityImages(formData);

    const parsed = createActivitySchema.safeParse({
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      shortDescription: formData.get("shortDescription"),
      price: formData.get("price"),
      priceType: formData.get("priceType"),
      durationHours: formData.get("durationHours"),
      cityId: formData.get("cityId"),
      categoryId: formData.get("categoryId") || undefined,
      guideId: formData.get("guideId"),
      minGroupSize: formData.get("minGroupSize"),
      maxGroupSize: formData.get("maxGroupSize"),
      pickupAddress: formData.get("pickupAddress"),
      includedItems: formData.get("includedItems"),
      excludedItems: formData.get("excludedItems"),
      languagesOffered: formData.get("languagesOffered"),
      isActive: formData.get("isActive") === "on",
      isFeatured: formData.get("isFeatured") === "on",
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    const data = parsed.data;

    const { rows } = await query(
      `INSERT INTO activities (
        title, slug, description, short_description, duration_hours, price, price_type,
        min_group_size, max_group_size, city_id, category_id, guide_id,
        included_items, excluded_items, pickup_address, languages_offered,
        is_active, is_featured
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id`,
      [
        data.title,
        data.slug,
        data.description,
        data.shortDescription || null,
        data.durationHours || null,
        data.price,
        data.priceType,
        data.minGroupSize || 1,
        data.maxGroupSize || null,
        data.cityId,
        data.categoryId || null,
        data.guideId,
        splitCommaList(data.includedItems || null),
        splitCommaList(data.excludedItems || null),
        data.pickupAddress || null,
        splitCommaList(data.languagesOffered || null),
        data.isActive ?? true,
        data.isFeatured ?? false,
      ]
    );

    const activityId = rows[0].id;

    // Insert images
    for (let i = 0; i < images.length; i++) {
      await query(
        `INSERT INTO activity_images (activity_id, image_data, image_mime_type, sort_order) VALUES ($1, $2, $3, $4)`,
        [activityId, images[i].data, images[i].mimeType, i]
      );
    }

    revalidatePath("/city/activities", "page");
    redirect("/city/activities?message=" + encodeURIComponent("Activity created"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city/activities/new?error=" + encodeURIComponent(err.message));
  }
}

export async function updateActivity(formData: FormData) {
  try {
    await checkAdmin();

    const images = await processActivityImages(formData);

    const parsed = updateActivitySchema.safeParse({
      activityId: formData.get("activityId"),
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      shortDescription: formData.get("shortDescription"),
      price: formData.get("price"),
      priceType: formData.get("priceType"),
      durationHours: formData.get("durationHours"),
      cityId: formData.get("cityId"),
      categoryId: formData.get("categoryId") || undefined,
      guideId: formData.get("guideId"),
      minGroupSize: formData.get("minGroupSize"),
      maxGroupSize: formData.get("maxGroupSize"),
      pickupAddress: formData.get("pickupAddress"),
      includedItems: formData.get("includedItems"),
      excludedItems: formData.get("excludedItems"),
      languagesOffered: formData.get("languagesOffered"),
      isActive: formData.get("isActive") === "on",
      isFeatured: formData.get("isFeatured") === "on",
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    const data = parsed.data;

    await query(
      `UPDATE activities SET
        title = $1, slug = $2, description = $3, short_description = $4,
        duration_hours = $5, price = $6, price_type = $7,
        min_group_size = $8, max_group_size = $9, city_id = $10,
        category_id = $11, guide_id = $12, included_items = $13,
        excluded_items = $14, pickup_address = $15, languages_offered = $16,
        is_active = $17, is_featured = $18, updated_at = NOW()
      WHERE id = $19`,
      [
        data.title,
        data.slug,
        data.description,
        data.shortDescription || null,
        data.durationHours || null,
        data.price,
        data.priceType,
        data.minGroupSize || 1,
        data.maxGroupSize || null,
        data.cityId,
        data.categoryId || null,
        data.guideId,
        splitCommaList(data.includedItems || null),
        splitCommaList(data.excludedItems || null),
        data.pickupAddress || null,
        splitCommaList(data.languagesOffered || null),
        data.isActive ?? true,
        data.isFeatured ?? false,
        data.activityId,
      ]
    );

    // Replace images if new ones uploaded
    if (images.length > 0) {
      await query(`DELETE FROM activity_images WHERE activity_id = $1`, [data.activityId]);
      for (let i = 0; i < images.length; i++) {
        await query(
          `INSERT INTO activity_images (activity_id, image_data, image_mime_type, sort_order) VALUES ($1, $2, $3, $4)`,
          [data.activityId, images[i].data, images[i].mimeType, i]
        );
      }
    }

    revalidatePath("/city/activities", "page");
    redirect("/city/activities?message=" + encodeURIComponent("Activity updated"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect(`/city/activities/${formData.get("activityId")}/edit?error=` + encodeURIComponent(err.message));
  }
}

// ── Packages ──

export async function deletePackage(formData: FormData) {
  try {
    await checkAdmin();
    const packageId = formData.get("packageId") as string;
    if (!packageId) throw new Error("Package ID required");

    await query(`DELETE FROM packages WHERE id = $1`, [packageId]);

    revalidatePath("/city/packages", "page");
    redirect("/city/packages?message=" + encodeURIComponent("Package deleted"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city/packages?error=" + encodeURIComponent(err.message));
  }
}

function parseItinerary(value: string | null): string {
  if (!value) return "[]";
  const items = value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => ({ description: item }));
  return JSON.stringify(items);
}

export async function createPackage(formData: FormData) {
  try {
    await checkAdmin();

    const images = await processPackageImages(formData);

    const parsed = createPackageSchema.safeParse({
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      itinerary: formData.get("itinerary"),
      totalPrice: formData.get("totalPrice"),
      durationHours: formData.get("durationHours"),
      maxGroupSize: formData.get("maxGroupSize"),
      cityId: formData.get("cityId"),
      guideId: formData.get("guideId") || undefined,
      driverId: formData.get("driverId") || undefined,
      whatsIncluded: formData.get("whatsIncluded"),
      whatsNotIncluded: formData.get("whatsNotIncluded"),
      pickupAddress: formData.get("pickupAddress"),
      isActive: formData.get("isActive") === "on",
      isFeatured: formData.get("isFeatured") === "on",
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    const data = parsed.data;

    const { rows } = await query(
      `INSERT INTO packages (
        title, slug, description, itinerary, total_price, duration_hours,
        max_group_size, city_id, guide_id, driver_id, whats_included,
        whats_not_included, pickup_address, is_active, is_featured
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id`,
      [
        data.title,
        data.slug,
        data.description,
        parseItinerary(data.itinerary || null),
        data.totalPrice,
        data.durationHours || null,
        data.maxGroupSize || null,
        data.cityId,
        data.guideId || null,
        data.driverId || null,
        splitCommaList(data.whatsIncluded || null),
        splitCommaList(data.whatsNotIncluded || null),
        data.pickupAddress || null,
        data.isActive ?? true,
        data.isFeatured ?? false,
      ]
    );

    const packageId = rows[0].id;

    // Insert images
    for (let i = 0; i < images.length; i++) {
      await query(
        `INSERT INTO package_images (package_id, image_data, image_mime_type, sort_order) VALUES ($1, $2, $3, $4)`,
        [packageId, images[i].data, images[i].mimeType, i]
      );
    }

    revalidatePath("/city/packages", "page");
    const { rows: cityRows } = await query(`SELECT slug FROM cities WHERE id = $1`, [data.cityId]);
    if (cityRows[0]?.slug) {
      revalidatePath(`/${cityRows[0].slug}/packages`, "page");
    }
    redirect("/city/packages?message=" + encodeURIComponent("Package created"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city/packages/new?error=" + encodeURIComponent(err.message));
  }
}

export async function updatePackage(formData: FormData) {
  try {
    await checkAdmin();

    const images = await processPackageImages(formData);

    const parsed = updatePackageSchema.safeParse({
      packageId: formData.get("packageId"),
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      itinerary: formData.get("itinerary"),
      totalPrice: formData.get("totalPrice"),
      durationHours: formData.get("durationHours"),
      maxGroupSize: formData.get("maxGroupSize"),
      cityId: formData.get("cityId"),
      guideId: formData.get("guideId") || undefined,
      driverId: formData.get("driverId") || undefined,
      whatsIncluded: formData.get("whatsIncluded"),
      whatsNotIncluded: formData.get("whatsNotIncluded"),
      pickupAddress: formData.get("pickupAddress"),
      isActive: formData.get("isActive") === "on",
      isFeatured: formData.get("isFeatured") === "on",
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    const data = parsed.data;

    await query(
      `UPDATE packages SET
        title = $1, slug = $2, description = $3, itinerary = $4,
        total_price = $5, duration_hours = $6, max_group_size = $7,
        city_id = $8, guide_id = $9, driver_id = $10, whats_included = $11,
        whats_not_included = $12, pickup_address = $13, is_active = $14,
        is_featured = $15, updated_at = NOW()
      WHERE id = $16`,
      [
        data.title,
        data.slug,
        data.description,
        parseItinerary(data.itinerary || null),
        data.totalPrice,
        data.durationHours || null,
        data.maxGroupSize || null,
        data.cityId,
        data.guideId || null,
        data.driverId || null,
        splitCommaList(data.whatsIncluded || null),
        splitCommaList(data.whatsNotIncluded || null),
        data.pickupAddress || null,
        data.isActive ?? true,
        data.isFeatured ?? false,
        data.packageId,
      ]
    );

    // Replace images if new ones uploaded
    if (images.length > 0) {
      await query(`DELETE FROM package_images WHERE package_id = $1`, [data.packageId]);
      for (let i = 0; i < images.length; i++) {
        await query(
          `INSERT INTO package_images (package_id, image_data, image_mime_type, sort_order) VALUES ($1, $2, $3, $4)`,
          [data.packageId, images[i].data, images[i].mimeType, i]
        );
      }
    }

    revalidatePath("/city/packages", "page");
    const { rows: cityRows } = await query(`SELECT slug FROM cities WHERE id = $1`, [data.cityId]);
    if (cityRows[0]?.slug) {
      revalidatePath(`/${cityRows[0].slug}/packages`, "page");
    }
    redirect("/city/packages?message=" + encodeURIComponent("Package updated"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect(`/city/packages/${formData.get("packageId")}/edit?error=` + encodeURIComponent(err.message));
  }
}


// ── Admin City Selection ──

export async function setAdminCity(formData: FormData) {
  try {
    await checkAdmin();
    const cityId = formData.get("cityId") as string;
    if (!cityId) throw new Error("City ID required");

    const session = await getSession();
    session.adminCityId = cityId;
    await session.save();

    redirect("/city");
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city/select?error=" + encodeURIComponent(err.message));
  }
}

export async function clearAdminCity() {
  try {
    await checkAdmin();
    const session = await getSession();
    session.adminCityId = undefined;
    await session.save();

    redirect("/city/select");
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city?error=" + encodeURIComponent(err.message));
  }
}

export async function createCity(formData: FormData) {
  try {
    await checkAdmin();

    const parsed = createCitySchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      country: formData.get("country"),
      currencyCode: formData.get("currencyCode"),
      currencySymbol: formData.get("currencySymbol"),
      mapCenterLat: formData.get("mapCenterLat"),
      mapCenterLng: formData.get("mapCenterLng"),
      timezone: formData.get("timezone"),
      whatsappCountryCode: formData.get("whatsappCountryCode"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input");
    }

    const data = parsed.data;

    const { rows } = await query(
      `INSERT INTO cities (
        slug, name, country, currency_code, currency_symbol,
        map_center_lat, map_center_lng, timezone, whatsapp_country_code,
        is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
      RETURNING id`,
      [
        data.slug,
        data.name,
        data.country,
        data.currencyCode,
        data.currencySymbol,
        data.mapCenterLat,
        data.mapCenterLng,
        data.timezone,
        data.whatsappCountryCode,
      ]
    );

    const cityId = rows[0].id;

    const session = await getSession();
    session.adminCityId = cityId;
    await session.save();

    redirect("/city");
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/city/select?error=" + encodeURIComponent(err.message));
  }
}
