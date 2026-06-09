import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { setAdminCity, createCity } from "@/app/admin/actions";

export default async function CitySelectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const session = await getSession();
  const { error, message } = await searchParams;

  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const { rows: profileRows } = await query(
    `SELECT user_type FROM profiles WHERE id = $1`,
    [session.userId]
  );
  const userType = profileRows[0]?.user_type;
  if (userType !== "city_admin" && userType !== "super_admin") {
    redirect("/?error=" + encodeURIComponent("Access denied"));
  }

  // If already has a city selected, redirect to dashboard
  if (session.adminCityId) {
    redirect("/city");
  }

  const { rows: cities } = await query(
    `SELECT id, name, country, slug FROM cities WHERE is_active = true ORDER BY name`
  );

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Select a City</h1>
          <p className="text-muted-foreground mt-2">
            Choose which city you want to manage, or add a new one.
          </p>
        </div>

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

        {/* Existing cities */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Existing Cities</h2>
          {cities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cities yet.</p>
          ) : (
            <div className="space-y-2">
              {cities.map((city: any) => (
                <form key={city.id} action={setAdminCity} className="flex items-center justify-between gap-4 p-3 rounded-md border hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{city.name}</p>
                    <p className="text-xs text-muted-foreground">{city.country}</p>
                  </div>
                  <input type="hidden" name="cityId" value={city.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Manage
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>

        {/* Add new city */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Add New City</h2>
          <form action={createCity} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="name">City Name</label>
                <input id="name" name="name" required placeholder="e.g. Durban"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="slug">Slug</label>
                <input id="slug" name="slug" required placeholder="e.g. durban"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="country">Country</label>
                <input id="country" name="country" required defaultValue="South Africa"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="currencyCode">Currency Code</label>
                <input id="currencyCode" name="currencyCode" required defaultValue="ZAR"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="currencySymbol">Currency Symbol</label>
                <input id="currencySymbol" name="currencySymbol" required defaultValue="R"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="whatsappCountryCode">WhatsApp Code</label>
                <input id="whatsappCountryCode" name="whatsappCountryCode" required defaultValue="+27"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="mapCenterLat">Latitude</label>
                <input id="mapCenterLat" name="mapCenterLat" type="number" step="any" required defaultValue="-29.8587"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="mapCenterLng">Longitude</label>
                <input id="mapCenterLng" name="mapCenterLng" type="number" step="any" required defaultValue="31.0218"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="timezone">Timezone</label>
              <input id="timezone" name="timezone" required defaultValue="Africa/Johannesburg"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <button type="submit"
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
              Create City & Manage
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
