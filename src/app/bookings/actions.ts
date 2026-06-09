"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, withTransaction } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import {
  createBookingSchema,
  createGuideHourlyBookingSchema,
  createDriverBookingSchema,
  createPackageBookingSchema,
  bookingTransitionSchema,
  declineBookingSchema,
  cancelBookingSchema,
} from "@/lib/validation";

// ── Create Activity Booking ────────────────────────────────

export async function createBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in to book"));
  }

  const parsed = createBookingSchema.safeParse({
    cityId: formData.get("cityId"),
    activityId: formData.get("activityId"),
    guideId: formData.get("guideId"),
    travelDate: formData.get("travelDate"),
    groupSize: formData.get("groupSize"),
    specialRequests: formData.get("specialRequests"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect(
      `/${formData.get("citySlug")}/activities/${formData.get("activitySlug")}?error=` +
        encodeURIComponent(error)
    );
  }

  const { cityId, activityId, guideId, travelDate, groupSize, specialRequests } = parsed.data;

  const { rows: profileRows } = await query(
    `SELECT id FROM profiles WHERE id = $1`,
    [session.userId]
  );

  if (profileRows.length === 0) {
    redirect("/login?error=" + encodeURIComponent("Profile not found"));
  }

  const touristId = profileRows[0].id;

  const { rows: actRows } = await query(
    `SELECT price FROM activities WHERE id = $1`,
    [activityId]
  );

  const totalPrice = actRows[0]?.price * groupSize || 0;

  try {
    await query(
      `INSERT INTO bookings (
        city_id, tourist_id, booking_type, activity_id, guide_id,
        status, travel_date, group_size, total_price, special_requests
      ) VALUES ($1, $2, 'activity', $3, $4, 'pending', $5, $6, $7, $8)`,
      [cityId, touristId, activityId, guideId, travelDate, groupSize, totalPrice, specialRequests || null]
    );

    revalidatePath("/", "layout");
    redirect("/tourist?message=" + encodeURIComponent("Booking request sent!"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect(
      `/${formData.get("citySlug")}/activities/${formData.get("activitySlug")}?error=` +
        encodeURIComponent(err.message || "Booking failed")
    );
  }
}

// ── Create Guide Hourly Booking ────────────────────────────

export async function createGuideHourlyBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in to book"));
  }

  const parsed = createGuideHourlyBookingSchema.safeParse({
    cityId: formData.get("cityId"),
    guideId: formData.get("guideId"),
    travelDate: formData.get("travelDate"),
    startTime: formData.get("startTime"),
    durationHours: formData.get("durationHours"),
    groupSize: formData.get("groupSize"),
    specialRequests: formData.get("specialRequests"),
    interests: formData.get("interests"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect(`/cape-town/guides/${formData.get("guideId")}?error=` + encodeURIComponent(error));
  }

  const { cityId, guideId, travelDate, startTime, durationHours, groupSize, specialRequests, interests } = parsed.data;

  try {
    const { rows: profileRows } = await query(
      `SELECT id FROM profiles WHERE id = $1`,
      [session.userId]
    );
    if (profileRows.length === 0) {
      throw new Error("Profile not found");
    }
    const touristId = profileRows[0].id;

    const { rows: guideRows } = await query(
      `SELECT hourly_rate FROM guides WHERE id = $1`,
      [guideId]
    );
    const hourlyRate = guideRows[0]?.hourly_rate || 0;
    const totalPrice = Math.round(hourlyRate * durationHours);

    await query(
      `INSERT INTO bookings (
        city_id, tourist_id, booking_type, guide_id,
        status, travel_date, start_time, duration_hours, group_size, total_price, special_requests, interests
      ) VALUES ($1, $2, 'guide_hourly', $3, 'pending', $4, $5, $6, $7, $8, $9, $10)`,
      [cityId, touristId, guideId, travelDate, startTime || null, durationHours, groupSize, totalPrice, specialRequests || null, interests ? [interests] : null]
    );

    revalidatePath("/", "layout");
    redirect("/tourist?message=" + encodeURIComponent("Guide booking request sent!"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect(`/cape-town/guides/${guideId}?error=` + encodeURIComponent(err.message || "Booking failed"));
  }
}

// ── Create Driver Booking ──────────────────────────────────

export async function createDriverBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in to book"));
  }

  const parsed = createDriverBookingSchema.safeParse({
    cityId: formData.get("cityId"),
    driverId: formData.get("driverId"),
    bookingType: formData.get("bookingType"),
    travelDate: formData.get("travelDate"),
    startTime: formData.get("startTime"),
    durationHours: formData.get("durationHours"),
    distanceRadiusKm: formData.get("distanceRadiusKm"),
    groupSize: formData.get("groupSize"),
    specialRequests: formData.get("specialRequests"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect(`/${formData.get("citySlug")}/drivers/${formData.get("driverId")}?error=` + encodeURIComponent(error));
  }

  const { cityId, driverId, bookingType, travelDate, startTime, durationHours, distanceRadiusKm, groupSize, specialRequests } = parsed.data;

  try {
    const { rows: profileRows } = await query(
      `SELECT id FROM profiles WHERE id = $1`,
      [session.userId]
    );
    if (profileRows.length === 0) {
      throw new Error("Profile not found");
    }
    const touristId = profileRows[0].id;

    const { rows: driverRows } = await query(
      `SELECT hourly_rate, distance_rate FROM drivers WHERE id = $1`,
      [driverId]
    );
    const driver = driverRows[0];
    let totalPrice = 0;

    if (bookingType === "driver_hourly") {
      if (!durationHours || durationHours < 2) {
        throw new Error("Minimum booking is 2 hours");
      }
      totalPrice = Math.round((driver?.hourly_rate || 0) * durationHours);
    } else if (bookingType === "driver_distance") {
      if (!distanceRadiusKm) {
        throw new Error("Please select a distance radius");
      }
      totalPrice = Math.round((driver?.distance_rate || 0) * distanceRadiusKm);
    } else if (bookingType === "driver_own_car") {
      totalPrice = Math.round((driver?.hourly_rate || 0) * (durationHours || 4));
    }

    await query(
      `INSERT INTO bookings (
        city_id, tourist_id, booking_type, driver_id,
        status, travel_date, start_time, duration_hours, distance_radius_km,
        tourist_has_vehicle, group_size, total_price, special_requests
      ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        cityId, touristId, bookingType, driverId, travelDate,
        startTime || null,
        bookingType === "driver_distance" ? null : (durationHours || null),
        bookingType === "driver_distance" ? distanceRadiusKm : null,
        bookingType === "driver_own_car",
        groupSize,
        totalPrice,
        specialRequests || null,
      ]
    );

    revalidatePath("/", "layout");
    redirect("/tourist?message=" + encodeURIComponent("Driver booking request sent!"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect(`/${formData.get("citySlug")}/drivers/${driverId}?error=` + encodeURIComponent(err.message || "Booking failed"));
  }
}

// ── Create Package Booking ─────────────────────────────────

export async function createPackageBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in to book"));
  }

  const parsed = createPackageBookingSchema.safeParse({
    cityId: formData.get("cityId"),
    packageId: formData.get("packageId"),
    guideId: formData.get("guideId"),
    driverId: formData.get("driverId"),
    travelDate: formData.get("travelDate"),
    groupSize: formData.get("groupSize"),
    specialRequests: formData.get("specialRequests"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect(`/${formData.get("citySlug")}/packages?error=` + encodeURIComponent(error));
  }

  const { cityId, packageId, guideId, driverId, travelDate, groupSize, specialRequests } = parsed.data;

  try {
    const { rows: profileRows } = await query(
      `SELECT id FROM profiles WHERE id = $1`,
      [session.userId]
    );
    if (profileRows.length === 0) {
      throw new Error("Profile not found");
    }
    const touristId = profileRows[0].id;

    const { rows: pkgRows } = await query(
      `SELECT total_price FROM packages WHERE id = $1`,
      [packageId]
    );
    const totalPrice = (pkgRows[0]?.total_price || 0) * groupSize;

    await query(
      `INSERT INTO bookings (
        city_id, tourist_id, booking_type, package_id, guide_id, driver_id,
        status, travel_date, group_size, total_price, special_requests
      ) VALUES ($1, $2, 'package', $3, $4, $5, 'pending', $6, $7, $8, $9)`,
      [cityId, touristId, packageId, guideId || null, driverId || null, travelDate, groupSize, totalPrice, specialRequests || null]
    );

    revalidatePath("/", "layout");
    redirect("/tourist?message=" + encodeURIComponent("Package booking request sent!"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect(`/${formData.get("citySlug")}/packages?error=` + encodeURIComponent(err.message || "Booking failed"));
  }
}

// ── Accept Booking (guide only) ────────────────────────────

export async function acceptBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const parsed = bookingTransitionSchema.safeParse({
    bookingId: formData.get("bookingId"),
  });

  if (!parsed.success) {
    redirect("/guide?error=" + encodeURIComponent(parsed.error.issues[0]?.message || "Invalid input"));
  }

  const { bookingId } = parsed.data;

  try {
    await withTransaction(async (client) => {
      const { rows: guideRows } = await client.query(
        `SELECT g.id FROM guides g WHERE g.profile_id = $1`,
        [session.userId]
      );
      if (guideRows.length === 0) {
        throw new Error("You are not a registered guide");
      }
      const guideId = guideRows[0].id;

      const { rows: bookingRows } = await client.query(
        `SELECT id, status, guide_id FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId]
      );
      if (bookingRows.length === 0) {
        throw new Error("Booking not found");
      }
      const booking = bookingRows[0];

      if (booking.guide_id !== guideId) {
        throw new Error("You are not assigned to this booking");
      }
      if (booking.status !== "pending") {
        throw new Error(`Cannot accept a booking that is ${booking.status}`);
      }

      await client.query(
        `UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
        [bookingId]
      );

      await client.query(
        `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, booking.status, "confirmed", session.userId, "Guide accepted the booking"]
      );
    });

    revalidatePath("/guide", "page");
    revalidatePath("/tourist", "page");
    redirect("/guide?message=" + encodeURIComponent("Booking accepted!"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/guide?error=" + encodeURIComponent(err.message || "Failed to accept booking"));
  }
}

// ── Decline Booking (guide only) ───────────────────────────

export async function declineBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const parsed = declineBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect("/guide?error=" + encodeURIComponent(parsed.error.issues[0]?.message || "Invalid input"));
  }

  const { bookingId, reason } = parsed.data;

  try {
    await withTransaction(async (client) => {
      const { rows: guideRows } = await client.query(
        `SELECT g.id FROM guides g WHERE g.profile_id = $1`,
        [session.userId]
      );
      if (guideRows.length === 0) {
        throw new Error("You are not a registered guide");
      }
      const guideId = guideRows[0].id;

      const { rows: bookingRows } = await client.query(
        `SELECT id, status, guide_id FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId]
      );
      if (bookingRows.length === 0) {
        throw new Error("Booking not found");
      }
      const booking = bookingRows[0];

      if (booking.guide_id !== guideId) {
        throw new Error("You are not assigned to this booking");
      }
      if (booking.status !== "pending") {
        throw new Error(`Cannot decline a booking that is ${booking.status}`);
      }

      await client.query(
        `UPDATE bookings SET status = 'declined', updated_at = NOW() WHERE id = $1`,
        [bookingId]
      );

      await client.query(
        `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, booking.status, "declined", session.userId, reason || "Guide declined the booking"]
      );
    });

    revalidatePath("/guide", "page");
    revalidatePath("/tourist", "page");
    redirect("/guide?message=" + encodeURIComponent("Booking declined"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/guide?error=" + encodeURIComponent(err.message || "Failed to decline booking"));
  }
}

// ── Cancel Booking (tourist, guide, or driver) ─────────────

export async function cancelBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const parsed = cancelBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect("/tourist?error=" + encodeURIComponent(parsed.error.issues[0]?.message || "Invalid input"));
  }

  const { bookingId, reason } = parsed.data;

  try {
    await withTransaction(async (client) => {
      const { rows: bookingRows } = await client.query(
        `SELECT id, status, tourist_id, guide_id, driver_id FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId]
      );
      if (bookingRows.length === 0) {
        throw new Error("Booking not found");
      }
      const booking = bookingRows[0];

      const { rows: guideRows } = await client.query(
        `SELECT id FROM guides WHERE profile_id = $1`,
        [session.userId]
      );
      const { rows: driverRows } = await client.query(
        `SELECT id FROM drivers WHERE profile_id = $1`,
        [session.userId]
      );
      const guideId = guideRows[0]?.id;
      const driverId = driverRows[0]?.id;

      const isTourist = booking.tourist_id === session.userId;
      const isGuide = booking.guide_id === guideId;
      const isDriver = booking.driver_id === driverId;

      if (!isTourist && !isGuide && !isDriver) {
        throw new Error("You do not have permission to cancel this booking");
      }

      if (!["pending", "confirmed"].includes(booking.status)) {
        throw new Error(`Cannot cancel a booking that is ${booking.status}`);
      }

      if (isTourist && booking.status === "confirmed") {
        const { rows: dateCheck } = await client.query(
          `SELECT travel_date FROM bookings WHERE id = $1 AND travel_date > CURRENT_DATE + INTERVAL '24 hours'`,
          [bookingId]
        );
        if (dateCheck.length === 0) {
          throw new Error("Bookings can only be cancelled more than 24 hours before the travel date");
        }
      }

      await client.query(
        `UPDATE bookings SET status = 'cancelled', updated_at = NOW(),
         cancelled_by = $2, cancellation_reason = $3
         WHERE id = $1`,
        [bookingId, session.userId, reason || "Cancelled by user"]
      );

      await client.query(
        `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, booking.status, "cancelled", session.userId, reason || "Booking cancelled"]
      );
    });

    revalidatePath("/guide", "page");
    revalidatePath("/driver", "page");
    revalidatePath("/tourist", "page");
    redirect("/tourist?message=" + encodeURIComponent("Booking cancelled"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/tourist?error=" + encodeURIComponent(err.message || "Failed to cancel booking"));
  }
}

// ── Delete Booking (tourist only, cancelled/declined) ───────

export async function deleteBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const parsed = bookingTransitionSchema.safeParse({
    bookingId: formData.get("bookingId"),
  });

  if (!parsed.success) {
    redirect("/tourist?error=" + encodeURIComponent(parsed.error.issues[0]?.message || "Invalid input"));
  }

  const { bookingId } = parsed.data;

  try {
    const { rows: bookingRows } = await query(
      `SELECT tourist_id, status FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingRows.length === 0) {
      redirect("/tourist?error=" + encodeURIComponent("Booking not found"));
    }

    const booking = bookingRows[0];

    if (booking.tourist_id !== session.userId) {
      redirect("/tourist?error=" + encodeURIComponent("Not your booking"));
    }

    if (booking.status !== "cancelled" && booking.status !== "declined") {
      redirect("/tourist?error=" + encodeURIComponent("Only cancelled or declined bookings can be removed"));
    }

    await query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);

    revalidatePath("/tourist", "page");
    redirect("/tourist?message=" + encodeURIComponent("Booking removed"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/tourist?error=" + encodeURIComponent(err.message || "Failed to remove booking"));
  }
}

// ── Complete Booking (guide or driver) ─────────────────────

export async function completeBooking(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const parsed = bookingTransitionSchema.safeParse({
    bookingId: formData.get("bookingId"),
  });

  if (!parsed.success) {
    redirect("/guide?error=" + encodeURIComponent(parsed.error.issues[0]?.message || "Invalid input"));
  }

  const { bookingId } = parsed.data;

  try {
    await withTransaction(async (client) => {
      const { rows: guideRows } = await client.query(
        `SELECT id FROM guides WHERE profile_id = $1`,
        [session.userId]
      );
      const { rows: driverRows } = await client.query(
        `SELECT id FROM drivers WHERE profile_id = $1`,
        [session.userId]
      );
      const guideId = guideRows[0]?.id;
      const driverId = driverRows[0]?.id;

      const { rows: bookingRows } = await client.query(
        `SELECT id, status, guide_id, driver_id FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId]
      );
      if (bookingRows.length === 0) {
        throw new Error("Booking not found");
      }
      const booking = bookingRows[0];

      const isGuide = booking.guide_id === guideId;
      const isDriver = booking.driver_id === driverId;

      if (!isGuide && !isDriver) {
        throw new Error("You are not assigned to this booking");
      }
      if (booking.status !== "confirmed" && booking.status !== "in_progress") {
        throw new Error(`Cannot complete a booking that is ${booking.status}`);
      }

      await client.query(
        `UPDATE bookings SET status = 'completed', updated_at = NOW(), completed_at = NOW() WHERE id = $1`,
        [bookingId]
      );

      await client.query(
        `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, booking.status, "completed", session.userId, "Experience completed"]
      );
    });

    revalidatePath("/guide", "page");
    revalidatePath("/driver", "page");
    revalidatePath("/tourist", "page");
    redirect("/guide?message=" + encodeURIComponent("Booking marked as completed"));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/guide?error=" + encodeURIComponent(err.message || "Failed to complete booking"));
  }
}
