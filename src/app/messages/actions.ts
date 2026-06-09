"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { sendMessageSchema } from "@/lib/validation";

export async function sendMessage(formData: FormData) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const parsed = sendMessageSchema.safeParse({
    bookingId: formData.get("bookingId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    const bookingId = formData.get("bookingId") as string;
    redirect(`/messages?bookingId=${bookingId}&error=` + encodeURIComponent(error));
  }

  const { bookingId, content } = parsed.data;

  try {
    const { rows: bookingRows } = await query(
      `SELECT tourist_id, guide_id, driver_id FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (bookingRows.length === 0) {
      throw new Error("Booking not found");
    }

    const booking = bookingRows[0];

    const { rows: guideRows } = await query(
      `SELECT id FROM guides WHERE profile_id = $1`,
      [session.userId]
    );
    const { rows: driverRows } = await query(
      `SELECT id FROM drivers WHERE profile_id = $1`,
      [session.userId]
    );
    const guideId = guideRows[0]?.id;
    const driverId = driverRows[0]?.id;

    const isTourist = booking.tourist_id === session.userId;
    const isGuide = booking.guide_id === guideId;
    const isDriver = booking.driver_id === driverId;

    if (!isTourist && !isGuide && !isDriver) {
      throw new Error("You are not part of this booking");
    }

    let recipientId: string;
    if (isTourist) {
      const { rows: providerRows } = await query(
        `SELECT profile_id FROM guides WHERE id = $1
         UNION
         SELECT profile_id FROM drivers WHERE id = $2`,
        [booking.guide_id, booking.driver_id]
      );
      if (providerRows.length === 0) {
        throw new Error("No provider assigned to this booking");
      }
      recipientId = providerRows[0].profile_id;
    } else {
      recipientId = booking.tourist_id;
    }

    await query(
      `INSERT INTO messages (booking_id, sender_id, recipient_id, content)
       VALUES ($1, $2, $3, $4)`,
      [bookingId, session.userId, recipientId, content]
    );

    revalidatePath("/messages", "page");
    redirect(`/messages?bookingId=${bookingId}`);
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect(`/messages?bookingId=${bookingId}&error=` + encodeURIComponent(err.message || "Failed to send message"));
  }
}
