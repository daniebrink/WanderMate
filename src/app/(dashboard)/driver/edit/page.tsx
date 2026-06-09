import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { updateDriverProfile } from "@/app/profile/actions";
import { AvatarUpload } from "../../guide/edit/avatar-upload";

export default async function DriverEditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { error } = await searchParams;

  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const { rows: profileRows } = await query(
    `SELECT first_name, last_name, phone, avatar_url, avatar_data IS NOT NULL as has_avatar_data FROM profiles WHERE id = $1`,
    [session.userId]
  );

  const { rows: driverRows } = await query(
    `SELECT id, bio, tagline, hourly_rate, distance_rate, languages, vehicle_make, vehicle_model, vehicle_year, vehicle_seats, is_available_hourly, is_available_distance, vehicle_images, vehicle_image_data IS NOT NULL as has_vehicle_image_data
     FROM drivers WHERE profile_id = $1`,
    [session.userId]
  );

  if (driverRows.length === 0) {
    redirect("/driver?error=" + encodeURIComponent("Driver record not found"));
  }

  const profile = profileRows[0] || {};
  const driver = driverRows[0];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl">Edit Profile</h1>
          <Link
            href="/driver"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        <form action={updateDriverProfile} className="bg-card rounded-lg border p-6 space-y-5">
          <div className="flex items-center justify-center gap-8">
            <AvatarUpload
              currentSrc={profile.has_avatar_data ? `/api/avatar/${session.userId}` : profile.avatar_url || null}
              label="profile photo"
            />
            <AvatarUpload
              currentSrc={driver.has_vehicle_image_data ? `/api/vehicle-image/${driver.id}` : driver.vehicle_images?.[0] || null}
              name="vehicleImageFile"
              label="vehicle photo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" defaultValue={profile.first_name || ""} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" defaultValue={profile.last_name || ""} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={profile.phone || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="tagline">Tagline</label>
            <input id="tagline" name="tagline" defaultValue={driver.tagline || ""} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" rows={4} defaultValue={driver.bio || ""} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="hourlyRate">Hourly rate (cents)</label>
              <input id="hourlyRate" name="hourlyRate" type="number" min={0}
                defaultValue={driver.hourly_rate || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="distanceRate">Distance rate (cents/km)</label>
              <input id="distanceRate" name="distanceRate" type="number" min={0}
                defaultValue={driver.distance_rate || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="languages">Languages (comma separated)</label>
            <input id="languages" name="languages"
              defaultValue={Array.isArray(driver.languages) ? driver.languages.join(", ") : ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="vehicleMake">Vehicle make</label>
              <input id="vehicleMake" name="vehicleMake" defaultValue={driver.vehicle_make || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="vehicleModel">Vehicle model</label>
              <input id="vehicleModel" name="vehicleModel" defaultValue={driver.vehicle_model || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="vehicleYear">Vehicle year</label>
              <input id="vehicleYear" name="vehicleYear" type="number" min={1900}
                defaultValue={driver.vehicle_year || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="vehicleSeats">Seats</label>
              <input id="vehicleSeats" name="vehicleSeats" type="number" min={1}
                defaultValue={driver.vehicle_seats || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isAvailableHourly" defaultChecked={driver.is_available_hourly}
                className="rounded border-input" />
              Hourly bookings
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isAvailableDistance" defaultChecked={driver.is_available_distance}
                className="rounded border-input" />
              Distance bookings
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
              Save changes
            </button>
            <Link href="/driver"
              className="rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
