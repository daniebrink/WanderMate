import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getDriverById,
  getDistanceOptionsByCity,
} from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";
import { createDriverBooking } from "@/app/bookings/actions";
import { getSession } from "@/lib/auth/session";

export default async function DriverDetailPage({
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

  const driver = await getDriverById(id);
  if (!driver) {
    notFound();
  }

  const distanceOptions = await getDistanceOptionsByCity(cityData.id);
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
        <Link href={`/${city}/drivers`} className="hover:text-foreground">
          Drivers
        </Link>
        <span>/</span>
        <span className="text-foreground">
          {driver.profile?.first_name} {driver.profile?.last_name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile header */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex-shrink-0 overflow-hidden">
              {driver.profile?.has_avatar_data || driver.profile?.avatar_url ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${driver.profile?.has_avatar_data ? `/api/avatar/${driver.profile.id}` : driver.profile?.avatar_url})`,
                  }}
                />
              ) : driver.has_vehicle_image_data || driver.vehicle_images?.[0] ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${driver.has_vehicle_image_data ? `/api/vehicle-image/${driver.id}` : driver.vehicle_images?.[0]})`,
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
                {driver.profile?.first_name} {driver.profile?.last_name}
              </h1>
              <p className="text-primary font-medium">{driver.tagline}</p>
              {driver.is_verified && (
                <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Vehicle */}
          {driver.vehicle_make && (
            <div className="rounded-lg border p-4 space-y-2">
              <h2 className="text-lg font-semibold">Vehicle</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Make</p>
                  <p className="font-medium">{driver.vehicle_make}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-medium">{driver.vehicle_model}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Year</p>
                  <p className="font-medium">{driver.vehicle_year}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Seats</p>
                  <p className="font-medium">{driver.vehicle_seats}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bio */}
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-semibold mb-3">About</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {driver.bio || driver.profile?.bio || "No bio available."}
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {driver.languages && driver.languages.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Languages</p>
                <p className="font-medium">{driver.languages.join(", ")}</p>
              </div>
            )}
            {driver.has_own_vehicle && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium">Own vehicle provided</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4 sticky top-24">
            <div className="space-y-2">
              {driver.is_available_hourly && driver.hourly_rate && (
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold">
                    {formatPrice(driver.hourly_rate, cityData.currency_symbol)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ hour</span>
                </div>
              )}
              {driver.is_available_distance && driver.distance_rate && (
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold">
                    {formatPrice(driver.distance_rate, cityData.currency_symbol)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ km</span>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {isLoggedIn ? (
              <form action={createDriverBooking} className="space-y-3">
                <input type="hidden" name="cityId" value={cityData.id} />
                <input type="hidden" name="driverId" value={driver.id} />
                <input type="hidden" name="citySlug" value={city} />

                {/* Booking type */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Booking type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {driver.is_available_hourly && (
                      <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="radio"
                          name="bookingType"
                          value="driver_hourly"
                          required
                          defaultChecked
                          className="text-primary"
                        />
                        <span className="text-sm">By the hour</span>
                      </label>
                    )}
                    {driver.is_available_distance && (
                      <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="radio"
                          name="bookingType"
                          value="driver_distance"
                          required
                          className="text-primary"
                        />
                        <span className="text-sm">By distance</span>
                      </label>
                    )}
                    {driver.has_own_vehicle && (
                      <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="radio"
                          name="bookingType"
                          value="driver_own_car"
                          required
                          className="text-primary"
                        />
                        <span className="text-sm">I have my own car</span>
                      </label>
                    )}
                  </div>
                </div>

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
                    min={2}
                    max={12}
                    step={0.5}
                    defaultValue={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">For hourly and own-car bookings</p>
                </div>

                {distanceOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="distanceRadiusKm">
                      Distance radius
                    </label>
                    <select
                      id="distanceRadiusKm"
                      name="distanceRadiusKm"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select radius...</option>
                      {distanceOptions.map((opt: any) => (
                        <option key={opt.id} value={opt.radius_km}>
                          {opt.radius_km}km — {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">For distance-based bookings</p>
                  </div>
                )}

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
                    max={driver.vehicle_seats || 20}
                    defaultValue={1}
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
                    placeholder="Pickup location, luggage, child seats, etc."
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
              You won&apos;t be charged yet. The driver will confirm availability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
