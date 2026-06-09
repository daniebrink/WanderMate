import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getGuideById,
  getActivitiesByGuide,
} from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";
import { createGuideHourlyBooking } from "@/app/bookings/actions";
import { getSession } from "@/lib/auth/session";

export default async function GuideDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { city, id } = await params;
  const { error } = await searchParams;

  const cityData = await getCityBySlug(city);
  if (!cityData) {
    notFound();
  }

  const guide = await getGuideById(id);
  if (!guide) {
    notFound();
  }

  const activities = await getActivitiesByGuide(id, cityData.id);
  const session = await getSession();
  const isLoggedIn = !!session.userId;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/${city}`} className="hover:text-foreground">
          {cityData.name}
        </Link>
        <span>/</span>
        <Link href={`/${city}/guides`} className="hover:text-foreground">
          Guides
        </Link>
        <span>/</span>
        <span className="text-foreground">
          {guide.profile?.first_name} {guide.profile?.last_name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile header */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex-shrink-0 overflow-hidden">
              {guide.profile?.has_avatar_data || guide.profile?.avatar_url ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${guide.profile?.has_avatar_data ? `/api/avatar/${guide.profile.id}` : guide.profile?.avatar_url})`,
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  No photo
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">
                {guide.profile?.first_name} {guide.profile?.last_name}
              </h1>
              <p className="text-primary font-medium">{guide.tagline}</p>
              {guide.is_verified && (
                <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-semibold mb-3">About</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {guide.bio || guide.profile?.bio || "No bio available."}
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {guide.years_experience && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Experience</p>
                <p className="font-medium">{guide.years_experience} years</p>
              </div>
            )}
            {guide.languages && guide.languages.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Languages</p>
                <p className="font-medium">{guide.languages.join(", ")}</p>
              </div>
            )}
            {guide.certifications && guide.certifications.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Certifications</p>
                <p className="font-medium">{guide.certifications.join(", ")}</p>
              </div>
            )}
            {guide.specialisations && guide.specialisations.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Specialisations</p>
                <p className="font-medium">{guide.specialisations.join(", ")}</p>
              </div>
            )}
          </div>

          {/* Activities */}
          {activities.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Experiences</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activities.map((activity: any) => (
                  <Link
                    key={activity.id}
                    href={`/${city}/activities/${activity.slug}`}
                    className="group rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video bg-muted relative">
                      {activity.images?.[0] ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${activity.images[0]})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {activity.category?.name || "Experience"}
                      </span>
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {activity.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(activity.price, cityData.currency_symbol)}
                        {activity.price_type === "per_person" ? " / person" : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Hourly booking card */}
          {guide.is_available_hourly && (
            <div className="rounded-lg border p-6 space-y-4 sticky top-24">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">
                  {formatPrice(guide.hourly_rate ?? 0, cityData.currency_symbol)}
                </span>
                <span className="text-sm text-muted-foreground">/ hour</span>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {isLoggedIn ? (
                <form action={createGuideHourlyBooking} className="space-y-3">
                  <input type="hidden" name="cityId" value={cityData.id} />
                  <input type="hidden" name="guideId" value={guide.id} />

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
                    <label className="text-sm font-medium" htmlFor="startTime">
                      Start time
                    </label>
                    <input
                      id="startTime"
                      name="startTime"
                      type="time"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="durationHours">
                      Duration (hours)
                    </label>
                    <input
                      id="durationHours"
                      name="durationHours"
                      type="number"
                      required
                      min={2}
                      max={12}
                      step={0.5}
                      defaultValue={4}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Minimum 2 hours</p>
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
                      min={1}
                      max={20}
                      defaultValue={1}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="interests">
                      Interests (optional)
                    </label>
                    <input
                      id="interests"
                      name="interests"
                      type="text"
                      placeholder="e.g. wine, photography, history"
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
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                You won&apos;t be charged yet. The guide will confirm availability.
              </p>
            </div>
          )}

          {!guide.is_available_hourly && (
            <div className="rounded-lg border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                This guide is only available for pre-planned experiences.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse their activities to book.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
