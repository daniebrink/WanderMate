import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { getMessagesByBooking } from "@/lib/db/queries";
import { sendMessage } from "./actions";

export default async function MessagesPage({
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
    redirect("/tourist?error=" + encodeURIComponent("No booking selected"));
  }

  // Verify user is part of this booking and fetch booking details
  const { rows: bookingRows } = await query(
    `SELECT
      b.id,
      b.status,
      b.tourist_id,
      b.guide_id,
      b.driver_id,
      a.title AS activity_title,
      c.name AS city_name
    FROM bookings b
    LEFT JOIN activities a ON b.activity_id = a.id
    LEFT JOIN cities c ON b.city_id = c.id
    WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRows.length === 0) {
    redirect("/tourist?error=" + encodeURIComponent("Booking not found"));
  }

  const booking = bookingRows[0];

  // Check permissions
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
    redirect("/tourist?error=" + encodeURIComponent("Not your booking"));
  }

  const messages = await getMessagesByBooking(bookingId);

  // Mark unread messages as read
  await query(
    `UPDATE messages SET is_read = true, read_at = NOW()
     WHERE booking_id = $1 AND recipient_id = $2 AND is_read = false`,
    [bookingId, session.userId]
  );

  const dashboardLink = isTourist
    ? "/tourist"
    : isGuide
    ? "/guide"
    : "/driver";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={dashboardLink}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </Link>
            <div>
              <h1 className="font-bold text-lg">Messages</h1>
              <p className="text-xs text-muted-foreground">
                {booking.activity_title || "Booking"} · {booking.city_name}
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
              booking.status === "pending"
                ? "bg-amber-100 text-amber-800"
                : booking.status === "confirmed"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {booking.status}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4 mb-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.sender_id === session.userId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border"
                    }`}
                  >
                    <p className="text-xs opacity-70 mb-1">
                      {msg.sender_first_name} {msg.sender_last_name?.[0]}.
                    </p>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Send form */}
        <form
          action={sendMessage}
          className="sticky bottom-4 bg-background rounded-lg border p-3 flex gap-3"
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <input
            type="text"
            name="content"
            placeholder="Type a message..."
            required
            autoComplete="off"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
