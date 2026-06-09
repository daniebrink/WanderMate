import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { getAllActiveCities } from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";
import { cancelBooking, deleteBooking } from "@/app/bookings/actions";
import { RemoveBookingButton } from "./remove-booking-button";
import { logout } from "@/app/login/actions";

export default async function TouristDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const session = await getSession();
  const { error, message } = await searchParams;

  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const { rows: bookings } = await query(
    `SELECT
      b.id,
      b.status,
      b.booking_type,
      b.travel_date,
      b.start_time,
      b.duration_hours,
      b.distance_radius_km,
      b.group_size,
      b.total_price,
      b.special_requests,
      b.created_at,
      a.title AS activity_title,
      a.slug AS activity_slug,
      (SELECT COALESCE(array_agg('/api/activity-image/' || ai.id ORDER BY ai.sort_order), ARRAY[]::text[])
       FROM activity_images ai WHERE ai.activity_id = a.id) AS activity_images,
      c.slug AS city_slug,
      c.name AS city_name,
      c.currency_symbol,
      g.tagline AS guide_tagline,
      g.gallery_images AS guide_gallery_images,
      gp.id AS guide_profile_id,
      gp.first_name AS guide_first_name,
      gp.last_name AS guide_last_name,
      gp.avatar_url AS guide_avatar_url,
      gp.avatar_data IS NOT NULL AS guide_has_avatar_data,
      d.id AS driver_id,
      d.vehicle_make AS driver_vehicle_make,
      d.vehicle_model AS driver_vehicle_model,
      d.vehicle_images AS driver_vehicle_images,
      d.vehicle_image_data IS NOT NULL AS driver_has_vehicle_image_data,
      dp.first_name AS driver_first_name,
      dp.last_name AS driver_last_name
    FROM bookings b
    LEFT JOIN activities a ON b.activity_id = a.id
    LEFT JOIN cities c ON b.city_id = c.id
    LEFT JOIN guides g ON b.guide_id = g.id
    LEFT JOIN profiles gp ON g.profile_id = gp.id
    LEFT JOIN drivers d ON b.driver_id = d.id
    LEFT JOIN profiles dp ON d.profile_id = dp.id
    WHERE b.tourist_id = $1
    ORDER BY b.created_at DESC`,
    [session.userId]
  );

  const allCities = await getAllActiveCities();
  const defaultCitySlug = bookings.find((b: any) => b.city_slug)?.city_slug ?? allCities[0]?.slug ?? "cape-town";

  const upcoming = bookings.filter(
    (b: any) =>
      ["pending", "confirmed", "in_progress"].includes(b.status)
  );
  const past = bookings.filter(
    (b: any) =>
      ["completed", "reviewed", "cancelled", "declined"].includes(b.status)
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-xl hover:opacity-80 transition-opacity">
              WanderMate
            </Link>
            {allCities.length > 0 && (
              <div className="relative group hidden sm:block">
                <button className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
                  Explore
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 rounded-md border bg-background shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      Switch city
                    </p>
                    {allCities.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/${c.slug}`}
                        className="block px-3 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        {c.name}, {c.country}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[200px]">
              {session.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-10">
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

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${defaultCitySlug}/activities`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Browse Activities
          </Link>
          <Link
            href={`/${defaultCitySlug}/guides`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Find a Guide
          </Link>
          <Link
            href={`/${defaultCitySlug}/drivers`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Find a Driver
          </Link>
          <Link
            href={`/${defaultCitySlug}/packages`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Browse Packages
          </Link>
        </div>

        {/* Upcoming */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
          {upcoming.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground mb-2">No upcoming bookings.</p>
              <p className="text-sm text-muted-foreground">
                Use the buttons above to book your next experience.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((b: any) => (
                <UpcomingBookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Past</h2>
            <div className="space-y-4">
              {past.map((b: any) => (
                <PastBookingCard key={b.id} booking={b} />
              ))}
            </div>
          </section>
        )}
      </main>
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
      className={`text-xs font-medium px-2 py-1 rounded-full capitalize flex-shrink-0 ${colors[status] || "bg-gray-100"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function BookingTitle({ booking }: { booking: any }) {
  if (booking.activity_title) return booking.activity_title;
  if (booking.driver_first_name) return `Driver booking — ${booking.driver_first_name} ${booking.driver_last_name}`;
  if (booking.guide_first_name) return `Guide booking — ${booking.guide_first_name} ${booking.guide_last_name}`;
  return "Booking";
}

function BookingImage({ booking }: { booking: any }) {
  const guideAvatar = booking.guide_has_avatar_data
    ? `/api/avatar/${booking.guide_profile_id}`
    : booking.guide_avatar_url;
  const driverVehicle = booking.driver_has_vehicle_image_data
    ? `/api/vehicle-image/${booking.driver_id}`
    : booking.driver_vehicle_images?.[0];
  const img = booking.activity_images?.[0] || guideAvatar || booking.guide_gallery_images?.[0] || driverVehicle;
  if (img) {
    return (
      <div
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${img})` }}
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
      No image
    </div>
  );
}

function BookingMeta({ booking }: { booking: any }) {
  const parts: string[] = [];
  parts.push(`${booking.group_size} ${booking.group_size === 1 ? "passenger" : "passengers"}`);
  parts.push(formatPrice(booking.total_price, booking.currency_symbol));
  if (booking.guide_first_name) {
    parts.push(`Guide: ${booking.guide_first_name} ${booking.guide_last_name}`);
  }
  if (booking.guide_tagline) {
    parts.push(booking.guide_tagline);
  }
  if (booking.driver_first_name) {
    parts.push(`Driver: ${booking.driver_first_name} ${booking.driver_last_name}`);
  }
  if (booking.driver_vehicle_make) {
    parts.push(`${booking.driver_vehicle_make} ${booking.driver_vehicle_model}`);
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {parts.map((p, i) => (
        <span key={i} className="truncate">{p}</span>
      ))}
    </div>
  );
}

function BookingDetails({ booking }: { booking: any }) {
  const details: string[] = [];
  if (booking.start_time) details.push(`Pickup: ${booking.start_time}`);
  if (booking.duration_hours) details.push(`Duration: ${booking.duration_hours}h`);
  if (booking.distance_radius_km) details.push(`Radius: ${booking.distance_radius_km}km`);
  if (booking.booking_type) {
    const typeLabel: Record<string, string> = {
      activity: "Activity",
      guide_hourly: "Guide hourly",
      driver_hourly: "Driver hourly",
      driver_distance: "Driver by distance",
      driver_own_car: "Drive your car",
      package: "Package",
    };
    details.push(`Type: ${typeLabel[booking.booking_type] || booking.booking_type}`);
  }
  if (details.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      {details.map((d, i) => (
        <span key={i}>{d}</span>
      ))}
    </div>
  );
}

function UpcomingBookingCard({ booking }: { booking: any }) {
  const canCancel = ["pending", "confirmed"].includes(booking.status);

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-24 h-40 sm:h-24 rounded-md bg-muted flex-shrink-0 overflow-hidden">
        <BookingImage booking={booking} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">
              <BookingTitle booking={booking} />
            </h3>
            <p className="text-sm text-muted-foreground">
              {booking.city_name} ·{" "}
              {booking.travel_date
                ? new Date(booking.travel_date).toLocaleDateString()
                : "TBD"}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <BookingMeta booking={booking} />
        <BookingDetails booking={booking} />
        {booking.special_requests && (
          <p className="mt-1 text-sm text-muted-foreground truncate">
            &ldquo;{booking.special_requests}&rdquo;
          </p>
        )}
        <div className="mt-3 flex items-center gap-4">
          <Link
            href={`/messages?bookingId=${booking.id}`}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Message
          </Link>
          {canCancel && (
            <form action={cancelBooking}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button
                type="submit"
                className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
              >
                Cancel booking
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PastBookingCard({ booking }: { booking: any }) {
  const needsReview = booking.status === "completed";

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-24 h-40 sm:h-24 rounded-md bg-muted flex-shrink-0 overflow-hidden">
        <BookingImage booking={booking} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">
              <BookingTitle booking={booking} />
            </h3>
            <p className="text-sm text-muted-foreground">
              {booking.city_name} ·{" "}
              {booking.travel_date
                ? new Date(booking.travel_date).toLocaleDateString()
                : "TBD"}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <BookingMeta booking={booking} />
        <BookingDetails booking={booking} />
        <div className="mt-3 flex items-center gap-4">
          <Link
            href={`/messages?bookingId=${booking.id}`}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Message
          </Link>
          {needsReview && (
            <Link
              href={`/tourist/review?bookingId=${booking.id}`}
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Leave a review
            </Link>
          )}
          {(booking.status === "cancelled" || booking.status === "declined") && (
            <form action={deleteBooking}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <RemoveBookingButton />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
