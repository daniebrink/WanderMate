import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import { applyAsDriver } from "../actions";

export default async function ApplyDriverPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { error } = await searchParams;

  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in to apply"));
  }

  // Check if already a driver
  const { rows } = await query(
    `SELECT id, is_verified FROM drivers WHERE profile_id = $1`,
    [session.userId]
  );
  const existingDriver = rows[0];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl">Apply as a Driver</h1>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        {existingDriver ? (
          <div className="bg-card rounded-lg border p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold">
              {existingDriver.is_verified
                ? "You are a verified driver!"
                : "Your application is pending review"}
            </h2>
            <p className="text-muted-foreground">
              {existingDriver.is_verified
                ? "You can access your dashboard to manage bookings."
                : "An admin will review your application shortly. You'll be notified once approved."}
            </p>
            <Link
              href={existingDriver.is_verified ? "/driver" : "/tourist"}
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {existingDriver.is_verified ? "Go to Dashboard" : "Back to My Bookings"}
            </Link>
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Become a Driver</h2>
              <p className="text-sm text-muted-foreground">
                Drive tourists to unforgettable experiences with your own vehicle.
              </p>
            </div>

            <form action={applyAsDriver} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="tagline">
                  Tagline *
                </label>
                <input
                  id="tagline"
                  name="tagline"
                  type="text"
                  required
                  placeholder="e.g. Luxury sedan with panoramic views"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="bio">
                  Bio *
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  required
                  placeholder="Tell us about your driving experience, knowledge of the area, and your vehicle..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="hourlyRate">
                    Hourly rate
                  </label>
                  <input
                    id="hourlyRate"
                    name="hourlyRate"
                    type="number"
                    min={0}
                    step={100}
                    placeholder="cents"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="distanceRate">
                    Distance rate
                  </label>
                  <input
                    id="distanceRate"
                    name="distanceRate"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="cents/km"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="languages">
                  Languages
                </label>
                <input
                  id="languages"
                  name="languages"
                  type="text"
                  placeholder="English, Afrikaans"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="text-sm font-semibold">Vehicle Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="vehicleMake">
                      Make
                    </label>
                    <input
                      id="vehicleMake"
                      name="vehicleMake"
                      type="text"
                      placeholder="Toyota"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="vehicleModel">
                      Model
                    </label>
                    <input
                      id="vehicleModel"
                      name="vehicleModel"
                      type="text"
                      placeholder="Land Cruiser"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="vehicleYear">
                      Year
                    </label>
                    <input
                      id="vehicleYear"
                      name="vehicleYear"
                      type="number"
                      placeholder="2020"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="vehicleSeats">
                      Seats
                    </label>
                    <input
                      id="vehicleSeats"
                      name="vehicleSeats"
                      type="number"
                      placeholder="Including driver"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="hasOwnVehicle"
                    defaultChecked
                    className="rounded border-input"
                  />
                  I have my own vehicle
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Submit Application
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
