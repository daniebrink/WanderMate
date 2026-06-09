import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";
import {
  acceptBooking,
  declineBooking,
  completeBooking,
} from "@/app/bookings/actions";

export default async function DriverDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const session = await getSession();
  const { error, message } = await searchParams;

  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  // Get driver record and profile for this user
  const { rows: driverRows } = await query(
    `SELECT id, tagline FROM drivers WHERE profile_id = $1`,
    [session.userId]
  );

  const { rows: profileRows } = await query(
    `SELECT first_name, last_name, avatar_url, avatar_data IS NOT NULL as has_avatar_data FROM profiles WHERE id = $1`,
    [session.userId]
  );

  if (driverRows.length === 0) {
    redirect("/");
  }

  const driver = driverRows[0];
  const profile = profileRows[0] || {};

  // Get bookings for this driver
  const { rows: bookings } = await query(
    `SELECT
      b.id,
      b.status,
      b.travel_date,
      b.group_size,
      b.total_price,
      b.special_requests,
      b.created_at,
      a.title AS activity_title,
      c.name AS city_name,
      c.currency_symbol,
      p.first_name AS tourist_first_name,
      p.last_name AS tourist_last_name,
      u.email AS tourist_email
    FROM bookings b
    LEFT JOIN activities a ON b.activity_id = a.id
    LEFT JOIN cities c ON b.city_id = c.id
    LEFT JOIN profiles p ON b.tourist_id = p.id
    LEFT JOIN users u ON p.id = u.id
    WHERE b.driver_id = $1
    ORDER BY
      CASE b.status
        WHEN 'pending' THEN 1
        WHEN 'confirmed' THEN 2
        WHEN 'in_progress' THEN 3
        ELSE 4
      END,
      b.travel_date ASC`,
    [driver.id]
  );

  const pending = bookings.filter((b: any) => b.status === "pending");
  const confirmed = bookings.filter(
    (b: any) => b.status === "confirmed" || b.status === "in_progress"
  );
  const history = bookings.filter(
    (b: any) =>
      ["completed", "reviewed", "cancelled", "declined"].includes(b.status)
  );

  const totalEarnings = history
    .filter((b: any) => b.status === "completed" || b.status === "reviewed")
    .reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
              {(profile.has_avatar_data || profile.avatar_url) ? (
                <img
                  src={profile.has_avatar_data ? `/api/avatar/${session.userId}` : profile.avatar_url}
                  alt="Driver"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  No photo
                </div>
              )}
            </div>
            <div>
              <h1 className="font-bold text-xl">Driver Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {driver.tagline || "Driver"}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Alerts */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="New Leads" value={pending.length} />
          <StatCard label="Confirmed" value={confirmed.length} />
          <StatCard label="Completed" value={history.filter((b: any) => ["completed", "reviewed"].includes(b.status)).length} />
          <StatCard label="Earnings" value={formatPrice(totalEarnings, "R")} />
        </div>

        {/* Pending requests */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Pending Requests</h2>
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                No pending booking requests.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((b: any) => (
                <PendingBookingRow key={b.id} booking={b} />
              ))}
            </div>
          )}
        </section>

        {/* Confirmed */}
        {confirmed.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
            <div className="space-y-3">
              {confirmed.map((b: any) => (
                <ConfirmedBookingRow key={b.id} booking={b} />
              ))}
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">History</h2>
            <div className="space-y-3">
              {history.map((b: any) => (
                <HistoryBookingRow key={b.id} booking={b} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="font-semibold mb-2 text-sm text-muted-foreground">{label}</h2>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function BookingInfo({ booking }: { booking: any }) {
  return (
    <div className="min-w-0 flex-1">
      <h3 className="font-semibold truncate">
        {booking.activity_title || "Booking"}
      </h3>
      <p className="text-sm text-muted-foreground">
        {booking.city_name} ·{" "}
        {booking.travel_date
          ? new Date(booking.travel_date).toLocaleDateString()
          : "TBD"}{" "}
        · {booking.group_size} people
      </p>
      {booking.tourist_first_name && (
        <p className="text-sm text-muted-foreground">
          Requested by {booking.tourist_first_name} {booking.tourist_last_name}{" "}
          · {booking.tourist_email}
        </p>
      )}
      {booking.special_requests && (
        <p className="text-sm text-muted-foreground truncate mt-1">
          &ldquo;{booking.special_requests}&rdquo;
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-800",
    reviewed: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800",
    declined: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colors[status] || "bg-gray-100"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function MessageLink({ bookingId }: { bookingId: string }) {
  return (
    <Link
      href={`/messages?bookingId=${bookingId}`}
      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
    >
      Message
    </Link>
  );
}

function PendingBookingRow({ booking }: { booking: any }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <BookingInfo booking={booking} />
      <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
        <span className="font-medium">
          {formatPrice(booking.total_price, booking.currency_symbol)}
        </span>
        <StatusBadge status={booking.status} />
        <MessageLink bookingId={booking.id} />
        <div className="flex items-center gap-2">
          <form action={acceptBooking}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <button
              type="submit"
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
            >
              Accept
            </button>
          </form>
          <form action={declineBooking}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <button
              type="submit"
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
            >
              Decline
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConfirmedBookingRow({ booking }: { booking: any }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <BookingInfo booking={booking} />
      <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
        <span className="font-medium">
          {formatPrice(booking.total_price, booking.currency_symbol)}
        </span>
        <StatusBadge status={booking.status} />
        <MessageLink bookingId={booking.id} />
        <form action={completeBooking}>
          <input type="hidden" name="bookingId" value={booking.id} />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Mark Complete
          </button>
        </form>
      </div>
    </div>
  );
}

function HistoryBookingRow({ booking }: { booking: any }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <BookingInfo booking={booking} />
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-medium">
          {formatPrice(booking.total_price, booking.currency_symbol)}
        </span>
        <StatusBadge status={booking.status} />
        <MessageLink bookingId={booking.id} />
      </div>
    </div>
  );
}
