import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityBySlug, getDriversByCity } from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";

export default async function DriversPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  const cityData = await getCityBySlug(city);
  if (!cityData) {
    notFound();
  }

  const drivers = await getDriversByCity(cityData.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Drivers in {cityData.name}</h1>
      <p className="text-muted-foreground mb-8">
        Trusted local drivers with verified vehicles for your {cityData.name} adventures.
      </p>

      {drivers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No drivers available yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver: any) => (
            <Link
              key={driver.id}
              href={`/${city}/drivers/${driver.id}`}
              className="group rounded-lg border overflow-hidden hover:shadow-md transition-shadow block"
            >
              {/* Vehicle photo with driver avatar overlay */}
              <div className="aspect-[4/3] bg-muted relative">
                {driver.has_vehicle_image_data || driver.vehicle_images?.[0] ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${driver.has_vehicle_image_data ? `/api/vehicle-image/${driver.id}` : driver.vehicle_images?.[0]})`,
                    }}
                  />
                ) : driver.profile?.has_avatar_data || driver.profile?.avatar_url ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${driver.profile?.has_avatar_data ? `/api/avatar/${driver.profile.id}` : driver.profile?.avatar_url})`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    No photo
                  </div>
                )}

                {/* Driver avatar overlay */}
                {(driver.profile?.has_avatar_data || driver.profile?.avatar_url) && (
                  <div className="absolute top-3 left-3">
                    <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-white shadow-md bg-muted">
                      <img
                        src={driver.profile?.has_avatar_data ? `/api/avatar/${driver.profile.id}` : driver.profile?.avatar_url || ""}
                        alt={`${driver.profile?.first_name} ${driver.profile?.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {driver.is_verified && (
                  <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    Verified
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {driver.profile?.first_name} {driver.profile?.last_name}
                  </h3>
                  <p className="text-sm text-primary font-medium">
                    {driver.tagline}
                  </p>
                </div>

                {driver.vehicle_make && (
                  <p className="text-sm text-muted-foreground">
                    {driver.vehicle_make} {driver.vehicle_model} ({driver.vehicle_year}) · {driver.vehicle_seats} seats
                  </p>
                )}

                {driver.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {driver.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {driver.languages?.slice(0, 3).map((lang: string) => (
                    <span
                      key={lang}
                      className="text-xs bg-muted px-2 py-1 rounded"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-medium">
                    {driver.hourly_rate
                      ? `${formatPrice(driver.hourly_rate, cityData.currency_symbol)}/hour`
                      : "Contact for rates"}
                  </span>
                  {driver.has_own_vehicle && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      Own vehicle
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
