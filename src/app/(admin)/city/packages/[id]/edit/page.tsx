import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { updatePackage } from "@/app/admin/actions";
import { ImageUpload } from "../../../image-upload";

function formatItinerary(itinerary: any[] | null): string {
  if (!Array.isArray(itinerary)) return "";
  return itinerary
    .map((item) => {
      if (typeof item === "string") return item;
      if (item.time && item.title) return `${item.time} - ${item.title}`;
      if (item.time && item.description) return `${item.time} - ${item.description}`;
      if (item.title) return item.title;
      if (item.description) return item.description;
      return JSON.stringify(item);
    })
    .join("\n");
}

export default async function EditPackagePage({
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

  const { rows: packageRows } = await query(
    `SELECT * FROM packages WHERE id = $1`,
    [id]
  );
  if (packageRows.length === 0) notFound();
  const pkg = packageRows[0];

  const { rows: imageRows } = await query(
    `SELECT id FROM package_images WHERE package_id = $1 ORDER BY sort_order`,
    [id]
  );

  // Prevent editing packages from other cities
  if (pkg.city_id !== cityId) {
    redirect("/city/packages?error=" + encodeURIComponent("You can only edit packages for your selected city"));
  }

  const { rows: cities } = await query(
    `SELECT id, name FROM cities WHERE is_active = true ORDER BY name`
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
  const { rows: drivers } = await query(
    `SELECT d.id, p.first_name, p.last_name
     FROM drivers d
     JOIN profiles p ON d.profile_id = p.id
     JOIN driver_cities dc ON d.id = dc.driver_id
     WHERE d.is_active = true AND dc.city_id = $1
     ORDER BY p.first_name`,
    [cityId]
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/city/packages" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to packages
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-6">Edit Package</h2>

      <form action={updatePackage} className="bg-card rounded-lg border p-6 space-y-5">
        <input type="hidden" name="packageId" value={id} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={pkg.title} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="slug">Slug</label>
            <input id="slug" name="slug" defaultValue={pkg.slug} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={5} required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue={pkg.description} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="itinerary">Itinerary (one item per line)</label>
          <textarea id="itinerary" name="itinerary" rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue={formatItinerary(pkg.itinerary)} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="totalPrice">Total Price (cents)</label>
            <input id="totalPrice" name="totalPrice" type="number" min={0} required defaultValue={pkg.total_price}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="durationHours">Duration (hours)</label>
            <input id="durationHours" name="durationHours" type="number" min={0} step={0.5} defaultValue={pkg.duration_hours || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="maxGroupSize">Max Group Size</label>
            <input id="maxGroupSize" name="maxGroupSize" type="number" min={1} defaultValue={pkg.max_group_size || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="cityId">City</label>
            <select id="cityId" name="cityId" required defaultValue={pkg.city_id}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {cities.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="guideId">Guide (optional)</label>
            <select id="guideId" name="guideId" defaultValue={pkg.guide_id || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              {guides.map((g: any) => (
                <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="driverId">Driver (optional)</label>
            <select id="driverId" name="driverId" defaultValue={pkg.driver_id || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              {drivers.map((d: any) => (
                <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="whatsIncluded">What's Included</label>
            <input id="whatsIncluded" name="whatsIncluded"
              defaultValue={Array.isArray(pkg.whats_included) ? pkg.whats_included.join(", ") : ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="whatsNotIncluded">What's Not Included</label>
            <input id="whatsNotIncluded" name="whatsNotIncluded"
              defaultValue={Array.isArray(pkg.whats_not_included) ? pkg.whats_not_included.join(", ") : ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pickupAddress">Pickup Address</label>
          <input id="pickupAddress" name="pickupAddress" defaultValue={pkg.pickup_address || ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={pkg.is_active}
              className="rounded border-input" />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={pkg.is_featured}
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
                  <img src={`/api/package-image/${img.id}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Upload new images below to replace existing ones.</p>
          </div>
        )}

        <ImageUpload label="New Images (replaces existing)" name="packageImages" />

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            Save Changes
          </button>
          <Link href="/city/packages"
            className="rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
