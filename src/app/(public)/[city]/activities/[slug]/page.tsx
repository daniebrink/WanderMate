import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getActivityBySlug,
} from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";
import { createBooking } from "@/app/bookings/actions";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { city, slug } = await params;
  const { error } = await searchParams;

  const cityData = await getCityBySlug(city);
  if (!cityData) {
    notFound();
  }

  const activity = await getActivityBySlug(cityData.id, slug);
  if (!activity) {
    notFound();
  }

  const session = await getSession();
  const isLoggedIn = !!session.userId;

  // Fetch reviews for this activity
  const { rows: reviews } = await query(
    `SELECT
      r.id,
      r.rating,
      r.text,
      r.created_at,
      p.first_name,
      p.last_name
    FROM reviews r
    JOIN profiles p ON r.reviewer_id = p.id
    WHERE r.activity_id = $1 AND r.is_approved = true
    ORDER BY r.created_at DESC`,
    [activity.id]
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/${city}`} className="hover:text-foreground">
          {cityData.name}
        </Link>
        <span>/</span>
        <Link href={`/${city}/activities`} className="hover:text-foreground">
          Activities
        </Link>
        <span>/</span>
        <span className="text-foreground">{activity.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image gallery */}
          <div className="rounded-lg overflow-hidden bg-muted aspect-video relative">
            {activity.images?.[0] ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${activity.images[0]})` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                No images yet
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {activity.images && activity.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {activity.images.map((img: string, i: number) => (
                <div
                  key={i}
                  className="w-24 h-16 rounded-md bg-cover bg-center flex-shrink-0 border"
                  style={{ backgroundImage: `url(${img})` }}
                />
              ))}
            </div>
          )}

          {/* Title & meta */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                {activity.category?.name || "Experience"}
              </span>
              {activity.duration_hours && (
                <span className="text-sm text-muted-foreground">
                  {activity.duration_hours} hours
                </span>
              )}
              {activity.difficulty_level && (
                <span className="text-sm text-muted-foreground capitalize">
                  {activity.difficulty_level}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold">{activity.title}</h1>
            {activity.review_count > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-500">★</span>
                <span className="font-medium">{activity.avg_rating}</span>
                <span className="text-muted-foreground">
                  ({activity.review_count} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-semibold mb-3">About this experience</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {activity.description}
            </p>
          </div>

          {/* What's included */}
          {activity.included_items && activity.included_items.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">What&apos;s included</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activity.included_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What's not included */}
          {activity.excluded_items && activity.excluded_items.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">What&apos;s not included</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activity.excluded_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">−</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pickup */}
          {activity.pickup_address && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Pickup location</h2>
              <p className="text-sm text-muted-foreground">
                {activity.pickup_address}
              </p>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reviews yet. Be the first to book this experience!
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div key={review.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${i < review.rating ? "text-yellow-500" : "text-gray-300"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {review.first_name} {review.last_name?.[0]}.
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.text && (
                      <p className="text-sm text-muted-foreground">{review.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Booking card */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4 sticky top-24">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {formatPrice(activity.price, cityData.currency_symbol)}
              </span>
              {activity.price_type === "per_person" && (
                <span className="text-sm text-muted-foreground">/ person</span>
              )}
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              {activity.min_group_size && (
                <p>Min group size: {activity.min_group_size}</p>
              )}
              {activity.max_group_size && (
                <p>Max group size: {activity.max_group_size}</p>
              )}
              {activity.duration_hours && (
                <p>Duration: {activity.duration_hours} hours</p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {isLoggedIn ? (
              <form action={createBooking} className="space-y-3">
                <input type="hidden" name="cityId" value={cityData.id} />
                <input type="hidden" name="activityId" value={activity.id} />
                <input type="hidden" name="guideId" value={activity.guide_id} />
                <input type="hidden" name="citySlug" value={city} />
                <input type="hidden" name="activitySlug" value={slug} />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="travelDate">
                    Date
                  </label>
                  <input
                    id="travelDate"
                    name="travelDate"
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="groupSize">
                    Group size
                  </label>
                  <input
                    id="groupSize"
                    name="groupSize"
                    type="number"
                    required
                    min={activity.min_group_size || 1}
                    max={activity.max_group_size || 20}
                    defaultValue={activity.min_group_size || 1}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="specialRequests">
                    Special requests (optional)
                  </label>
                  <textarea
                    id="specialRequests"
                    name="specialRequests"
                    rows={3}
                    placeholder="Dietary requirements, accessibility needs, etc."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                  Request to Book
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full text-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                  Sign in to Book
                </Link>
                <p className="text-xs text-center text-muted-foreground">
                  You need an account to send a booking request.
                </p>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              You won&apos;t be charged yet. The guide will confirm availability.
            </p>
          </div>

          {/* Guide card */}
          {activity.guide && (
            <div className="rounded-lg border p-6 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                Your Guide
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div>
                  <p className="font-medium">{activity.guide.tagline || "Local Guide"}</p>
                  {activity.guide.hourly_rate && (
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(activity.guide.hourly_rate, cityData.currency_symbol)}/hour
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
