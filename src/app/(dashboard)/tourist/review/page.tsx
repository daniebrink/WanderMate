import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { submitReview } from "@/app/reviews/actions";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; error?: string }>;
}) {
  const session = await getSession();
  const { bookingId, error } = await searchParams;

  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  if (!bookingId) {
    redirect("/tourist?error=" + encodeURIComponent("No booking specified"));
  }

  // Fetch booking details
  const { rows: bookingRows } = await query(
    `SELECT
      b.id,
      b.status,
      b.tourist_id,
      a.title AS activity_title,
      p.first_name AS guide_first_name,
      p.last_name AS guide_last_name
    FROM bookings b
    LEFT JOIN activities a ON b.activity_id = a.id
    LEFT JOIN guides g ON b.guide_id = g.id
    LEFT JOIN profiles p ON g.profile_id = p.id
    WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRows.length === 0) {
    redirect("/tourist?error=" + encodeURIComponent("Booking not found"));
  }

  const booking = bookingRows[0];

  if (booking.tourist_id !== session.userId) {
    redirect("/tourist?error=" + encodeURIComponent("Not your booking"));
  }

  if (booking.status !== "completed") {
    redirect("/tourist?error=" + encodeURIComponent("Can only review completed bookings"));
  }

  // Check if already reviewed
  const { rows: reviewRows } = await query(
    `SELECT id FROM reviews WHERE booking_id = $1`,
    [bookingId]
  );
  if (reviewRows.length > 0) {
    redirect("/tourist?error=" + encodeURIComponent("You have already reviewed this booking"));
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl">Leave a Review</h1>
          <Link
            href="/tourist"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to bookings
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        <div className="bg-card rounded-lg border p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">{booking.activity_title || "Your Experience"}</h2>
            {booking.guide_first_name && (
              <p className="text-sm text-muted-foreground">
                with {booking.guide_first_name} {booking.guide_last_name}
              </p>
            )}
          </div>

          <form action={submitReview} className="space-y-6">
            <input type="hidden" name="bookingId" value={bookingId} />

            <div className="space-y-2">
              <label className="text-sm font-medium">How was your experience?</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <label key={star} className="cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      value={star}
                      required
                      className="sr-only peer"
                    />
                    <span className="text-3xl text-muted-foreground peer-checked:text-yellow-500 hover:text-yellow-400 transition-colors">
                      ★
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Click a star to rate
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="text">
                Tell us more (optional)
              </label>
              <textarea
                id="text"
                name="text"
                rows={4}
                placeholder="What did you enjoy? What could be improved?"
                maxLength={2000}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Submit Review
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
