import { query } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  verifyGuide,
  unverifyGuide,
  verifyDriver,
  unverifyDriver,
} from "@/app/admin/actions";

export default async function CityAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const session = await getSession();
  if (!session.adminCityId) {
    redirect("/city/select");
  }
  const cityId = session.adminCityId;

  const { error, message } = await searchParams;

  // Fetch city-scoped data
  const { rows: allGuides } = await query(
    `SELECT
      g.id, g.tagline, g.hourly_rate, g.is_verified, g.verified_at, g.submitted_at,
      p.first_name, p.last_name, p.phone,
      u.email
    FROM guides g
    JOIN profiles p ON g.profile_id = p.id
    JOIN users u ON p.id = u.id
    JOIN guide_cities gc ON g.id = gc.guide_id
    WHERE gc.city_id = $1
    ORDER BY g.is_verified ASC, g.submitted_at DESC`,
    [cityId]
  );

  const { rows: allDrivers } = await query(
    `SELECT
      d.id, d.tagline, d.hourly_rate, d.vehicle_make, d.vehicle_model, d.is_verified, d.verified_at, d.submitted_at,
      p.first_name, p.last_name, p.phone,
      u.email
    FROM drivers d
    JOIN profiles p ON d.profile_id = p.id
    JOIN users u ON p.id = u.id
    JOIN driver_cities dc ON d.id = dc.driver_id
    WHERE dc.city_id = $1
    ORDER BY d.is_verified ASC, d.submitted_at DESC`,
    [cityId]
  );

  const { rows: recentBookings } = await query(
    `SELECT
      b.id, b.status, b.booking_type, b.travel_date, b.group_size, b.total_price, b.created_at,
      c.name AS city_name, c.currency_symbol,
      pt.first_name AS tourist_first_name, pt.last_name AS tourist_last_name,
      pg.first_name AS guide_first_name, pg.last_name AS guide_last_name,
      pd.first_name AS driver_first_name, pd.last_name AS driver_last_name
    FROM bookings b
    LEFT JOIN cities c ON b.city_id = c.id
    LEFT JOIN profiles pt ON b.tourist_id = pt.id
    LEFT JOIN guides g ON b.guide_id = g.id
    LEFT JOIN profiles pg ON g.profile_id = pg.id
    LEFT JOIN drivers d ON b.driver_id = d.id
    LEFT JOIN profiles pd ON d.profile_id = pd.id
    WHERE b.city_id = $1
    ORDER BY b.created_at DESC
    LIMIT 20`,
    [cityId]
  );

  const pendingGuides = allGuides.filter((g: any) => !g.is_verified);
  const pendingDrivers = allDrivers.filter((d: any) => !d.is_verified);
  const totalGuides = allGuides.length;
  const totalDrivers = allDrivers.length;
  const totalBookings = recentBookings.length;

  return (
    <div className="space-y-10">
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
        <StatCard label="Total Guides" value={totalGuides} />
        <StatCard label="Total Drivers" value={totalDrivers} />
        <StatCard label="Pending Verifications" value={pendingGuides.length + pendingDrivers.length} />
        <StatCard label="Recent Bookings" value={totalBookings} />
      </div>

      {/* Pending Guides */}
      {pendingGuides.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Pending Guide Verifications</h2>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Tagline</th>
                  <th className="text-left px-4 py-3 font-medium">Rate</th>
                  <th className="text-left px-4 py-3 font-medium">Contact</th>
                  <th className="text-left px-4 py-3 font-medium">Applied</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingGuides.map((g: any) => (
                  <tr key={g.id}>
                    <td className="px-4 py-3">
                      {g.first_name} {g.last_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{g.tagline}</td>
                    <td className="px-4 py-3">
                      {g.hourly_rate ? formatPrice(g.hourly_rate, "R") + "/hr" : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {g.email}
                      {g.phone && <span className="block text-xs">{g.phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {g.submitted_at ? new Date(g.submitted_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={verifyGuide} className="inline">
                        <input type="hidden" name="guideId" value={g.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Verify
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Pending Drivers */}
      {pendingDrivers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Pending Driver Verifications</h2>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Tagline</th>
                  <th className="text-left px-4 py-3 font-medium">Vehicle</th>
                  <th className="text-left px-4 py-3 font-medium">Contact</th>
                  <th className="text-left px-4 py-3 font-medium">Applied</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingDrivers.map((d: any) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3">
                      {d.first_name} {d.last_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.tagline}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.vehicle_make} {d.vehicle_model}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.email}
                      {d.phone && <span className="block text-xs">{d.phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.submitted_at ? new Date(d.submitted_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={verifyDriver} className="inline">
                        <input type="hidden" name="driverId" value={d.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Verify
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* All Guides */}
      <section>
        <h2 className="text-lg font-semibold mb-4">All Guides</h2>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Tagline</th>
                <th className="text-left px-4 py-3 font-medium">Rate</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allGuides.map((g: any) => (
                <tr key={g.id}>
                  <td className="px-4 py-3">
                    {g.first_name} {g.last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{g.tagline}</td>
                  <td className="px-4 py-3">
                    {g.hourly_rate ? formatPrice(g.hourly_rate, "R") + "/hr" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge verified={g.is_verified} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {g.is_verified ? (
                      <form action={unverifyGuide} className="inline">
                        <input type="hidden" name="guideId" value={g.id} />
                        <button
                          type="submit"
                          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          Unverify
                        </button>
                      </form>
                    ) : (
                      <form action={verifyGuide} className="inline">
                        <input type="hidden" name="guideId" value={g.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Verify
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* All Drivers */}
      <section>
        <h2 className="text-lg font-semibold mb-4">All Drivers</h2>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Tagline</th>
                <th className="text-left px-4 py-3 font-medium">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allDrivers.map((d: any) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    {d.first_name} {d.last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.tagline}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.vehicle_make} {d.vehicle_model}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge verified={d.is_verified} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.is_verified ? (
                      <form action={unverifyDriver} className="inline">
                        <input type="hidden" name="driverId" value={d.id} />
                        <button
                          type="submit"
                          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          Unverify
                        </button>
                      </form>
                    ) : (
                      <form action={verifyDriver} className="inline">
                        <input type="hidden" name="driverId" value={d.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Verify
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Bookings */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Bookings</h2>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Tourist</th>
                <th className="text-left px-4 py-3 font-medium">Guide/Driver</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentBookings.map((b: any) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-mono text-xs">{b.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 capitalize">{b.booking_type.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    {b.tourist_first_name} {b.tourist_last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.guide_first_name && `${b.guide_first_name} ${b.guide_last_name}`}
                    {b.driver_first_name && `${b.driver_first_name} ${b.driver_last_name}`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.travel_date ? new Date(b.travel_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge verified={b.status === "confirmed" || b.status === "completed" || b.status === "reviewed"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatPrice(b.total_price, b.currency_symbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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

function StatusBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
      Pending
    </span>
  );
}
