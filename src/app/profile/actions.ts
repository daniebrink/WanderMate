"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import {
  updateGuideProfileSchema,
  updateDriverProfileSchema,
} from "@/lib/validation";
import sharp from "sharp";

export async function updateGuideProfile(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  // Handle avatar file upload
  const avatarFile = formData.get("avatarFile") as File | null;
  let avatarData: Buffer | null = null;
  let avatarMimeType = "image/jpeg";

  if (avatarFile && avatarFile.size > 0) {
    const bytes = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize with Sharp: max 400x400, JPEG quality 80
    avatarData = await sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    avatarMimeType = "image/jpeg";
  }

  const parsed = updateGuideProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    bio: formData.get("bio"),
    tagline: formData.get("tagline"),
    hourlyRate: formData.get("hourlyRate"),
    languages: formData.get("languages"),
    certifications: formData.get("certifications"),
    specialisations: formData.get("specialisations"),
    yearsExperience: formData.get("yearsExperience"),
    isAvailableHourly: formData.get("isAvailableHourly") === "on",
    galleryImages: formData.get("galleryImages"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect("/guide/edit?error=" + encodeURIComponent(error));
  }

  const data = parsed.data;

  try {
    const { rows: guideRows } = await query(
      `SELECT id FROM guides WHERE profile_id = $1`,
      [session.userId]
    );
    if (guideRows.length === 0) {
      redirect("/guide/edit?error=" + encodeURIComponent("Guide record not found"));
    }
    const guideId = guideRows[0].id;

    if (avatarData) {
      await query(
        `UPDATE profiles SET first_name = $1, last_name = $2, phone = $3, avatar_url = NULL, avatar_data = $4, avatar_mime_type = $5 WHERE id = $6`,
        [data.firstName, data.lastName, data.phone || null, avatarData, avatarMimeType, session.userId]
      );
    } else {
      await query(
        `UPDATE profiles SET first_name = $1, last_name = $2, phone = $3 WHERE id = $4`,
        [data.firstName, data.lastName, data.phone || null, session.userId]
      );
    }

    await query(
      `UPDATE guides SET
        bio = $1,
        tagline = $2,
        hourly_rate = $3,
        languages = $4,
        certifications = $5,
        specialisations = $6,
        years_experience = $7,
        is_available_hourly = $8,
        gallery_images = $9,
        updated_at = NOW()
      WHERE id = $10`,
      [
        data.bio,
        data.tagline,
        data.hourlyRate || null,
        data.languages ? data.languages.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        data.certifications ? data.certifications.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        data.specialisations ? data.specialisations.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        data.yearsExperience || null,
        data.isAvailableHourly,
        data.galleryImages ? data.galleryImages.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        guideId,
      ]
    );

    revalidatePath("/guide", "page");
    redirect("/guide?message=" + encodeURIComponent("Profile updated"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/guide/edit?error=" + encodeURIComponent(err.message || "Update failed"));
  }
}

export async function updateDriverProfile(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  // Handle avatar file upload
  const avatarFile = formData.get("avatarFile") as File | null;
  let avatarData: Buffer | null = null;
  let avatarMimeType = "image/jpeg";

  if (avatarFile && avatarFile.size > 0) {
    const bytes = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize with Sharp: max 400x400, JPEG quality 80
    avatarData = await sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    avatarMimeType = "image/jpeg";
  }

  // Handle vehicle image file upload
  const vehicleImageFile = formData.get("vehicleImageFile") as File | null;
  let vehicleImageData: Buffer | null = null;
  let vehicleImageMimeType = "image/jpeg";

  if (vehicleImageFile && vehicleImageFile.size > 0) {
    const bytes = await vehicleImageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize with Sharp: max 800x600, JPEG quality 80
    vehicleImageData = await sharp(buffer)
      .resize(800, 600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    vehicleImageMimeType = "image/jpeg";
  }

  const parsed = updateDriverProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    bio: formData.get("bio"),
    tagline: formData.get("tagline"),
    hourlyRate: formData.get("hourlyRate"),
    distanceRate: formData.get("distanceRate"),
    languages: formData.get("languages"),
    vehicleMake: formData.get("vehicleMake"),
    vehicleModel: formData.get("vehicleModel"),
    vehicleYear: formData.get("vehicleYear"),
    vehicleSeats: formData.get("vehicleSeats"),
    isAvailableHourly: formData.get("isAvailableHourly") === "on",
    isAvailableDistance: formData.get("isAvailableDistance") === "on",
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect("/driver/edit?error=" + encodeURIComponent(error));
  }

  const data = parsed.data;

  try {
    const { rows: driverRows } = await query(
      `SELECT id FROM drivers WHERE profile_id = $1`,
      [session.userId]
    );
    if (driverRows.length === 0) {
      redirect("/driver/edit?error=" + encodeURIComponent("Driver record not found"));
    }
    const driverId = driverRows[0].id;

    if (avatarData) {
      await query(
        `UPDATE profiles SET first_name = $1, last_name = $2, phone = $3, avatar_url = NULL, avatar_data = $4, avatar_mime_type = $5 WHERE id = $6`,
        [data.firstName, data.lastName, data.phone || null, avatarData, avatarMimeType, session.userId]
      );
    } else {
      await query(
        `UPDATE profiles SET first_name = $1, last_name = $2, phone = $3 WHERE id = $4`,
        [data.firstName, data.lastName, data.phone || null, session.userId]
      );
    }

    const driverUpdateParams: any[] = [
      data.bio,
      data.tagline,
      data.hourlyRate || null,
      data.distanceRate || null,
      data.languages ? data.languages.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      data.vehicleMake || null,
      data.vehicleModel || null,
      data.vehicleYear || null,
      data.vehicleSeats || null,
      data.isAvailableHourly,
      data.isAvailableDistance,
    ];

    if (vehicleImageData) {
      await query(
        `UPDATE drivers SET
          bio = $1,
          tagline = $2,
          hourly_rate = $3,
          distance_rate = $4,
          languages = $5,
          vehicle_make = $6,
          vehicle_model = $7,
          vehicle_year = $8,
          vehicle_seats = $9,
          is_available_hourly = $10,
          is_available_distance = $11,
          vehicle_images = NULL,
          vehicle_image_data = $12,
          vehicle_image_mime_type = $13,
          updated_at = NOW()
        WHERE id = $14`,
        [...driverUpdateParams, vehicleImageData, vehicleImageMimeType, driverId]
      );
    } else {
      await query(
        `UPDATE drivers SET
          bio = $1,
          tagline = $2,
          hourly_rate = $3,
          distance_rate = $4,
          languages = $5,
          vehicle_make = $6,
          vehicle_model = $7,
          vehicle_year = $8,
          vehicle_seats = $9,
          is_available_hourly = $10,
          is_available_distance = $11,
          updated_at = NOW()
        WHERE id = $12`,
        [...driverUpdateParams, driverId]
      );
    }

    revalidatePath("/driver", "page");
    redirect("/driver?message=" + encodeURIComponent("Profile updated"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/driver/edit?error=" + encodeURIComponent(err.message || "Update failed"));
  }
}
