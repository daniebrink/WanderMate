import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getPackagesByCity,
} from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";
import { createPackageBooking } from "@/app/bookings/actions";
import { getSession } from "@/lib/auth/session";

export default async function PackagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { city } = await params;
  const { error } = await searchParams;

  const cityData = await getCityBySlug(city);
  if (!cityData) {
    notFound();
  }

  const packages = await getPackagesByCity(cityData.id);
  const session = await getSession();
  const isLoggedIn = !!session.userId;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/${city}`} className="hover:text-foreground">
          {cityData.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Packages</span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">Packages in {cityData.name}</h1>
      <p className="text-muted-foreground mb-8">
        Curated experiences combining guides, drivers, and top activities.
      </p>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-6 max-w-xl">
          {error}
        </div>
      )}

      {packages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No packages available yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {packages.map((pkg: any) => (
            <div
              key={pkg.id}
              className="rounded-lg border bg-card overflow-hidden flex flex-col"
            >
              {/* Image */}
              <div className="aspect-video bg-muted relative">
                {pkg.images?.[0] ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${pkg.images[0]})` }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    No image
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div>
                  <h2 className="text-xl font-bold">{pkg.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pkg.description}
                  </p>
                </div>

                {pkg.itinerary && Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Itinerary</h3>
                    <div className="space-y-2">
                      {pkg.itinerary.slice(0, 3).map((step: any, i: number) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-muted-foreground w-12 flex-shrink-0">
                            {step.time}
                          </span>
                          <span>{step.title}</span>
                        </div>
                      ))}
                      {pkg.itinerary.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          + {pkg.itinerary.length - 3} more stops
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {pkg.whats_included?.map((item: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t mt-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold">
                        {formatPrice(pkg.total_price, cityData.currency_symbol)}
                      </span>
                      <span className="text-sm text-muted-foreground"> / person</span>
                    </div>
                    {pkg.duration_hours && (
                      <span className="text-sm text-muted-foreground">
                        {pkg.duration_hours} hours
                      </span>
                    )}
                  </div>

                  {isLoggedIn ? (
                    <form action={createPackageBooking} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                      <input type="hidden" name="cityId" value={cityData.id} />
                      <input type="hidden" name="packageId" value={pkg.id} />
                      <input type="hidden" name="guideId" value={pkg.guide_id || ""} />
                      <input type="hidden" name="driverId" value={pkg.driver_id || ""} />
                      <input type="hidden" name="citySlug" value={city} />

                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium" htmlFor={`date-${pkg.id}`}>
                          Date
                        </label>
                        <input
                          id={`date-${pkg.id}`}
                          name="travelDate"
                          type="date"
                          required
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="w-full sm:w-24 space-y-1">
                        <label className="text-xs font-medium" htmlFor={`people-${pkg.id}`}>
                          People
                        </label>
                        <input
                          id={`people-${pkg.id}`}
                          name="groupSize"
                          type="number"
                          required
                          min={1}
                          max={pkg.max_group_size || 20}
                          defaultValue={1}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                      >
                        Book
                      </button>
                    </form>
                  ) : (
                    <Link
                      href="/login"
                      className="block w-full text-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                    >
                      Sign in to Book
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
