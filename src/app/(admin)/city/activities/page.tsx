import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";
import { DeleteActivityButton } from "./delete-button";

export default async function AdminActivitiesPage() {
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

  const { rows: activities } = await query(
    `SELECT
      a.id, a.title, a.slug, a.price, a.price_type, a.duration_hours,
      a.is_active, a.is_featured,
      c.name AS city_name, c.slug AS city_slug,
      cat.name AS category_name,
      p.first_name AS guide_first_name, p.last_name AS guide_last_name
    FROM activities a
    LEFT JOIN cities c ON a.city_id = c.id
    LEFT JOIN categories cat ON a.category_id = cat.id
    LEFT JOIN guides g ON a.guide_id = g.id
    LEFT JOIN profiles p ON g.profile_id = p.id
    WHERE a.city_id = $1
    ORDER BY a.created_at DESC`,
    [cityId]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activities</h2>
        <Link
          href="/city/activities/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          + Add Activity
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No activities yet.</p>
          <Link
            href="/city/activities/new"
            className="text-primary text-sm font-medium hover:underline mt-2 inline-block"
          >
            Create the first activity
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">City</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Guide</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activities.map((a: any) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${a.city_slug}/activities/${a.slug}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.city_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.category_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.guide_first_name ? `${a.guide_first_name} ${a.guide_last_name}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(a.price, "R")}
                    <span className="text-xs text-muted-foreground"> / {a.price_type === "per_person" ? "pp" : "fixed"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {a.is_active ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                      {a.is_featured && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/city/activities/${a.id}/edit`}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                      >
                        Edit
                      </Link>
                      <DeleteActivityButton activityId={a.id} />
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
