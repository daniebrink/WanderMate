import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getCategoriesByCity,
  getActivitiesByCity,
} from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";
import { HeroCarousel } from "./hero-carousel";

export default async function CityHomePage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  const cityData = await getCityBySlug(city);
  if (!cityData) {
    notFound();
  }

  const categories = await getCategoriesByCity(cityData.id);
  const featuredActivities = await getActivitiesByCity(cityData.id, {
    featuredOnly: true,
    limit: 6,
  });

  return (
    <div className="space-y-12 pb-12">
      {/* Hero */}
      <HeroCarousel images={cityData.hero_images || []}>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {cityData.name}
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          Book verified local guides and drivers for unforgettable experiences.
          From wine tours to wildlife safaris — your adventure starts here.
        </p>
        {/* Hero CTA buttons — removed to avoid duplication with city sub-navbar
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 flex-wrap">
          <Link
            href={`/${city}/activities`}
            className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow transition-colors hover:bg-slate-100"
          >
            Browse Activities
          </Link>
          <Link
            href={`/${city}/guides`}
            className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            Find a Guide
          </Link>
          <Link
            href={`/${city}/drivers`}
            className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            Find a Driver
          </Link>
          <Link
            href={`/${city}/packages`}
            className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            Browse Packages
          </Link>
        </div>
        */}
      </HeroCarousel>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat: any) => (
              <Link
                key={cat.id}
                href={`/${city}/activities?category=${cat.slug}`}
                className="rounded-lg border p-6 text-center hover:border-primary hover:shadow-sm transition-all"
              >
                <p className="font-medium">{cat.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Activities */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Featured Experiences</h2>
          <Link
            href={`/${city}/activities`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {featuredActivities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              No featured activities yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredActivities.map((activity: any) => (
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
      </section>
    </div>
  );
}
