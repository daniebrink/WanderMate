"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, withTransaction } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { submitReviewSchema } from "@/lib/validation";

export async function submitReview(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const parsed = submitReviewSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating"),
    text: formData.get("text"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    const bookingId = formData.get("bookingId") as string;
    redirect("/tourist/review?bookingId=" + bookingId + "&error=" + encodeURIComponent(error));
  }

  const { bookingId, rating, text } = parsed.data;

  try {
    await withTransaction(async (client) => {
      const { rows: bookingRows } = await client.query(
        `SELECT
          b.id, b.status, b.tourist_id, b.guide_id, b.driver_id, b.activity_id
        FROM bookings b
        WHERE b.id = $1
        FOR UPDATE`,
        [bookingId]
      );

      if (bookingRows.length === 0) {
        throw new Error("Booking not found");
      }

      const booking = bookingRows[0];

      if (booking.tourist_id !== session.userId) {
        throw new Error("You can only review your own bookings");
      }

      if (booking.status !== "completed") {
        throw new Error("You can only review completed bookings");
      }

      const { rows: existingReview } = await client.query(
        `SELECT id FROM reviews WHERE booking_id = $1`,
        [bookingId]
      );
      if (existingReview.length > 0) {
        throw new Error("You have already reviewed this booking");
      }

      const revieweeId = booking.guide_id || booking.driver_id;
      const revieweeType = booking.guide_id ? "guide" : "driver";

      if (!revieweeId) {
        throw new Error("No guide or driver assigned to this booking");
      }

      await client.query(
        `INSERT INTO reviews (
          booking_id, reviewer_id, reviewee_id, reviewee_type,
          activity_id, rating, text, is_approved
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [bookingId, session.userId, revieweeId, revieweeType, booking.activity_id, rating, text]
      );

      await client.query(
        `UPDATE bookings SET status = 'reviewed', updated_at = NOW() WHERE id = $1`,
        [bookingId]
      );

      await client.query(
        `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, "completed", "reviewed", session.userId, "Tourist submitted review"]
      );
    });

    revalidatePath("/tourist", "page");
    redirect("/tourist?message=" + encodeURIComponent("Review submitted! Thank you."));
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect(
      "/tourist/review?bookingId=" + bookingId + "&error=" + encodeURIComponent(err.message || "Failed to submit review")
    );
  }
}
