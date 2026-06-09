import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createActivity } from "@/app/admin/actions";
import { ImageUpload } from "../../image-upload";

export default async function NewActivityPage() {
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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/city/activities" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to activities
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-6">Add New Activity</h2>

      <form action={createActivity} className="bg-card rounded-lg border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="title">Title</label>
            <input id="title" name="title" required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="slug">Slug</label>
            <input id="slug" name="slug" required placeholder="my-activity-name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="shortDescription">Short Description</label>
          <input id="shortDescription" name="shortDescription"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="description">Full Description</label>
          <textarea id="description" name="description" rows={5} required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="price">Price (cents)</label>
            <input id="price" name="price" type="number" min={0} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="priceType">Price Type</label>
            <select id="priceType" name="priceType"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="fixed">Fixed</option>
              <option value="per_person">Per Person</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="durationHours">Duration (hours)</label>
            <input id="durationHours" name="durationHours" type="number" min={0} step={0.5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="cityId">City</label>
            <select id="cityId" name="cityId" required defaultValue={cityId}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {cities.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select category</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="guideId">Guide</label>
            <select id="guideId" name="guideId" required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select guide</option>
              {guides.map((g: any) => (
                <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="minGroupSize">Min Group Size</label>
            <input id="minGroupSize" name="minGroupSize" type="number" min={1} defaultValue={1}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="maxGroupSize">Max Group Size</label>
            <input id="maxGroupSize" name="maxGroupSize" type="number" min={1}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pickupAddress">Pickup Address</label>
          <input id="pickupAddress" name="pickupAddress"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="includedItems">Included Items (comma separated)</label>
            <input id="includedItems" name="includedItems" placeholder="Lunch, Water, Transport"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="excludedItems">Excluded Items (comma separated)</label>
            <input id="excludedItems" name="excludedItems" placeholder="Gratuities, Alcohol"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="languagesOffered">Languages Offered (comma separated)</label>
          <input id="languagesOffered" name="languagesOffered" placeholder="English, Afrikaans"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked
              className="rounded border-input" />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured"
              className="rounded border-input" />
            Featured
          </label>
        </div>

        <ImageUpload label="Activity Images" name="activityImages" />

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            Create Activity
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
