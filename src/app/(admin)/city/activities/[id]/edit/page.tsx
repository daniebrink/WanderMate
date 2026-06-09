import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { updateActivity } from "@/app/admin/actions";
import { ImageUpload } from "../../../image-upload";

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

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

  const { rows: activityRows } = await query(
    `SELECT * FROM activities WHERE id = $1`,
    [id]
  );
  if (activityRows.length === 0) notFound();
  const activity = activityRows[0];

  // Prevent editing activities from other cities
  if (activity.city_id !== cityId) {
    redirect("/city/activities?error=" + encodeURIComponent("You can only edit activities for your selected city"));
  }

  const { rows: cities } = await query(
    `SELECT id, name, slug FROM cities WHERE is_active = true ORDER BY name`
  );
  const { rows: categories } = await query(
    `SELECT id, name FROM categories WHERE is_active = true ORDER BY name`
  );
  const { rows: guides } = await query(
    `SELECT g.id, p.first_name, p.last_name
     FROM guides g
     JOIN profiles p ON g.profile_id = p.id
     JOIN guide_cities gc ON g.id = gc.guide_id
     WHERE g.is_active = true AND gc.city_id = $1
     ORDER BY p.first_name`,
    [cityId]
  );

  const { rows: imageRows } = await query(
    `SELECT id FROM activity_images WHERE activity_id = $1 ORDER BY sort_order`,
    [id]
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/city/activities" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to activities
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-6">Edit Activity</h2>

      <form action={updateActivity} className="bg-card rounded-lg border p-6 space-y-5">
        <input type="hidden" name="activityId" value={id} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={activity.title} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="slug">Slug</label>
            <input id="slug" name="slug" defaultValue={activity.slug} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="shortDescription">Short Description</label>
          <input id="shortDescription" name="shortDescription" defaultValue={activity.short_description || ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="description">Full Description</label>
          <textarea id="description" name="description" rows={5} required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue={activity.description} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="price">Price (cents)</label>
            <input id="price" name="price" type="number" min={0} required defaultValue={activity.price}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="priceType">Price Type</label>
            <select id="priceType" name="priceType" defaultValue={activity.price_type}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="fixed">Fixed</option>
              <option value="per_person">Per Person</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="durationHours">Duration (hours)</label>
            <input id="durationHours" name="durationHours" type="number" min={0} step={0.5} defaultValue={activity.duration_hours || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="cityId">City</label>
            <select id="cityId" name="cityId" required defaultValue={activity.city_id}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {cities.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId" defaultValue={activity.category_id || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="guideId">Guide</label>
            <select id="guideId" name="guideId" required defaultValue={activity.guide_id}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {guides.map((g: any) => (
                <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="minGroupSize">Min Group Size</label>
            <input id="minGroupSize" name="minGroupSize" type="number" min={1} defaultValue={activity.min_group_size || 1}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="maxGroupSize">Max Group Size</label>
            <input id="maxGroupSize" name="maxGroupSize" type="number" min={1} defaultValue={activity.max_group_size || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pickupAddress">Pickup Address</label>
          <input id="pickupAddress" name="pickupAddress" defaultValue={activity.pickup_address || ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="includedItems">Included Items</label>
            <input id="includedItems" name="includedItems"
              defaultValue={activity.included_items?.join(", ") || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="excludedItems">Excluded Items</label>
            <input id="excludedItems" name="excludedItems"
              defaultValue={activity.excluded_items?.join(", ") || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="languagesOffered">Languages Offered</label>
          <input id="languagesOffered" name="languagesOffered"
            defaultValue={activity.languages_offered?.join(", ") || ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={activity.is_active}
              className="rounded border-input" />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={activity.is_featured}
              className="rounded border-input" />
            Featured
          </label>
        </div>

        {imageRows.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Images</label>
            <div className="flex flex-wrap gap-3">
              {imageRows.map((img: any) => (
                <div key={img.id} className="w-20 h-20 rounded-md bg-muted overflow-hidden border">
                  <img src={`/api/activity-image/${img.id}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Upload new images below to replace existing ones.</p>
          </div>
        )}

        <ImageUpload label="New Images (replaces existing)" name="activityImages" />

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            Save Changes
          </button>
          <Link href="/city/activities"
            className="rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
