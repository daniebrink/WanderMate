import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getCategoriesByCity,
  getActivitiesByCity,
} from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";
import { FilterSelects } from "./filter-selects";

export default async function ActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
    maxPrice?: string;
    maxDuration?: string;
    minRating?: string;
  }>;
}) {
  const { city } = await params;
  const { category, q, maxPrice, maxDuration, minRating } = await searchParams;

  const cityData = await getCityBySlug(city);
  if (!cityData) {
    notFound();
  }

  const categories = await getCategoriesByCity(cityData.id);
  const activities = await getActivitiesByCity(cityData.id);

  // Apply all filters
  let filteredActivities = activities;

  if (category) {
    filteredActivities = filteredActivities.filter(
      (a: any) => a.category?.slug === category
    );
  }

  if (q) {
    const queryLower = q.toLowerCase();
    filteredActivities = filteredActivities.filter(
      (a: any) =>
        a.title?.toLowerCase().includes(queryLower) ||
        a.description?.toLowerCase().includes(queryLower) ||
        a.short_description?.toLowerCase().includes(queryLower)
    );
  }

  if (maxPrice) {
    const max = parseInt(maxPrice, 10);
    filteredActivities = filteredActivities.filter(
      (a: any) => (a.price || 0) <= max
    );
  }

  if (maxDuration) {
    const max = parseFloat(maxDuration);
    filteredActivities = filteredActivities.filter(
      (a: any) => !a.duration_hours || a.duration_hours <= max
    );
  }

  if (minRating) {
    const min = parseFloat(minRating);
    filteredActivities = filteredActivities.filter(
      (a: any) => (a.avg_rating || 0) >= min
    );
  }

  // Build query string helper for filter links
  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (q && !overrides.hasOwnProperty("q")) params.set("q", q);
    if (category && !overrides.hasOwnProperty("category")) params.set("category", category);
    if (maxPrice && !overrides.hasOwnProperty("maxPrice")) params.set("maxPrice", maxPrice);
    if (maxDuration && !overrides.hasOwnProperty("maxDuration")) params.set("maxDuration", maxDuration);
    if (minRating && !overrides.hasOwnProperty("minRating")) params.set("minRating", minRating);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const str = params.toString();
    return str ? `?${str}` : "";
  }

  const hasFilters = !!(q || category || maxPrice || maxDuration || minRating);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Activities in {cityData.name}</h1>
      <p className="text-muted-foreground mb-8">
        Browse and book experiences with verified local guides.
      </p>

      {/* Search & Filters */}
      <div className="space-y-4 mb-8">
        {/* Search bar */}
        <form method="get" className="flex gap-2">
          <input
            type="text"
            name="q"
            placeholder="Search experiences..."
            defaultValue={q || ""}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input type="hidden" name="category" value={category || ""} />
          <input type="hidden" name="maxPrice" value={maxPrice || ""} />
          <input type="hidden" name="maxDuration" value={maxDuration || ""} />
          <input type="hidden" name="minRating" value={minRating || ""} />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
          {hasFilters && (
            <Link
              href={`/${city}/activities`}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category pills */}
          <Link
            href={`/${city}/activities${buildQuery({ category: undefined })}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              !category
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-accent"
            }`}
          >
            All
          </Link>
          {categories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/${city}/activities${buildQuery({ category: cat.slug })}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                category === cat.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-accent"
              }`}
            >
              {cat.name}
            </Link>
          ))}

          <div className="w-px h-6 bg-border mx-1" />

          <FilterSelects
            city={city}
            maxPrice={maxPrice || ""}
            maxDuration={maxDuration || ""}
            minRating={minRating || ""}
            q={q || ""}
            category={category || ""}
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredActivities.length} experience
        {filteredActivities.length !== 1 ? "s" : ""} found
      </p>

      {/* Activity grid */}
      {filteredActivities.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No activities match your filters.
          </p>
          <Link
            href={`/${city}/activities`}
            className="text-sm font-medium text-primary hover:underline mt-2 inline-block"
          >
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity: any) => (
            <Link
              key={activity.id}
              href={`/${city}/activities/${activity.slug}`}
              className="group rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-video bg-muted relative">
                {activity.images?.[0] ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${activity.images[0]})` }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    No image
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                    {activity.category?.name || "Experience"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activity.duration_hours ? `${activity.duration_hours}h` : ""}
                  </span>
                </div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {activity.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {activity.short_description || activity.description}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-medium">
                    {formatPrice(activity.price, cityData.currency_symbol)}
                    {activity.price_type === "per_person" ? " / person" : ""}
                  </span>
                  {activity.review_count > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ★ {activity.avg_rating} ({activity.review_count})
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
