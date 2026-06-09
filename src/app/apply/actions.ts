"use server";

import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { applyAsGuideSchema, applyAsDriverSchema } from "@/lib/validation";

export async function applyAsGuide(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in to apply"));
  }

  const parsed = applyAsGuideSchema.safeParse({
    bio: formData.get("bio"),
    tagline: formData.get("tagline"),
    hourlyRate: formData.get("hourlyRate"),
    languages: formData.get("languages"),
    certifications: formData.get("certifications"),
    specialisations: formData.get("specialisations"),
    yearsExperience: formData.get("yearsExperience"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect("/apply/guide?error=" + encodeURIComponent(error));
  }

  const { bio, tagline, hourlyRate, languages, certifications, specialisations, yearsExperience } = parsed.data;

  try {
    const { rows: existing } = await query(
      `SELECT id FROM guides WHERE profile_id = $1`,
      [session.userId]
    );
    if (existing.length > 0) {
      throw new Error("You have already applied as a guide");
    }

    await query(
      `INSERT INTO guides (
        profile_id, bio, tagline, hourly_rate, languages,
        certifications, specialisations, years_experience,
        is_available_hourly, is_active, is_verified, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, false, NOW())`,
      [
        session.userId, bio, tagline, hourlyRate || null,
        languages?.split(",").map((s) => s.trim()).filter(Boolean),
        certifications?.split(",").map((s) => s.trim()).filter(Boolean),
        specialisations?.split(",").map((s) => s.trim()).filter(Boolean),
        yearsExperience,
      ]
    );

    await query(
      `UPDATE profiles SET user_type = 'guide', updated_at = NOW() WHERE id = $1`,
      [session.userId]
    );

    redirect("/guide?message=" + encodeURIComponent("Application submitted! Awaiting admin verification."));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/apply/guide?error=" + encodeURIComponent(err.message || "Application failed"));
  }
}

export async function applyAsDriver(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in to apply"));
  }

  const parsed = applyAsDriverSchema.safeParse({
    bio: formData.get("bio"),
    tagline: formData.get("tagline"),
    hourlyRate: formData.get("hourlyRate"),
    distanceRate: formData.get("distanceRate"),
    languages: formData.get("languages"),
    vehicleMake: formData.get("vehicleMake"),
    vehicleModel: formData.get("vehicleModel"),
    vehicleYear: formData.get("vehicleYear"),
    vehicleSeats: formData.get("vehicleSeats"),
    hasOwnVehicle: formData.get("hasOwnVehicle") === "on",
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect("/apply/driver?error=" + encodeURIComponent(error));
  }

  const { bio, tagline, hourlyRate, distanceRate, languages, vehicleMake, vehicleModel, vehicleYear, vehicleSeats, hasOwnVehicle } = parsed.data;

  try {
    const { rows: existing } = await query(
      `SELECT id FROM drivers WHERE profile_id = $1`,
      [session.userId]
    );
    if (existing.length > 0) {
      throw new Error("You have already applied as a driver");
    }

    await query(
      `INSERT INTO drivers (
        profile_id, bio, tagline, hourly_rate, distance_rate, languages,
        has_own_vehicle, vehicle_make, vehicle_model, vehicle_year, vehicle_seats,
        is_available_hourly, is_available_distance, is_active, is_verified, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, true, true, false, NOW())`,
      [
        session.userId, bio, tagline, hourlyRate || null, distanceRate || null,
        languages?.split(",").map((s) => s.trim()).filter(Boolean),
        hasOwnVehicle, vehicleMake, vehicleModel, vehicleYear, vehicleSeats,
      ]
    );

    await query(
      `UPDATE profiles SET user_type = 'driver', updated_at = NOW() WHERE id = $1`,
      [session.userId]
    );

    redirect("/driver?message=" + encodeURIComponent("Application submitted! Awaiting admin verification."));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/apply/driver?error=" + encodeURIComponent(err.message || "Application failed"));
  }
}
