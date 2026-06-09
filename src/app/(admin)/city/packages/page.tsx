import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";
import { DeletePackageButton } from "./delete-button";

export default async function AdminPackagesPage() {
  const session = await getSession();
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

  if (!session.adminCityId) {
    redirect("/city/select");
  }
  const cityId = session.adminCityId;

  const { rows: packages } = await query(
    `SELECT
      p.id, p.title, p.slug, p.total_price, p.duration_hours,
      p.is_active, p.is_featured,
      c.name AS city_name, c.slug AS city_slug
    FROM packages p
    LEFT JOIN cities c ON p.city_id = c.id
    WHERE p.city_id = $1
    ORDER BY p.created_at DESC`,
    [cityId]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Packages</h2>
        <Link
          href="/city/packages/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          + Add Package
        </Link>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No packages yet.</p>
          <Link
            href="/city/packages/new"
            className="text-primary text-sm font-medium hover:underline mt-2 inline-block"
          >
            Create the first package
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">City</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Duration</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {packages.map((pkg: any) => (
                <tr key={pkg.id}>
                  <td className="px-4 py-3 font-medium">{pkg.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{pkg.city_name}</td>
                  <td className="px-4 py-3">{formatPrice(pkg.total_price, "R")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{pkg.duration_hours ? `${pkg.duration_hours}h` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {pkg.is_active ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                      {pkg.is_featured && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/city/packages/${pkg.id}/edit`}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                      >
                        Edit
                      </Link>
                      <DeletePackageButton packageId={pkg.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
