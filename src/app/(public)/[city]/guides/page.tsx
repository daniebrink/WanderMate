import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityBySlug, getGuidesByCity } from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  const cityData = await getCityBySlug(city);
  if (!cityData) {
    notFound();
  }

  const guides = await getGuidesByCity(cityData.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Guides in {cityData.name}</h1>
      <p className="text-muted-foreground mb-8">
        Verified local experts ready to show you the best of {cityData.name}.
      </p>

      {guides.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No guides available yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide: any) => (
            <Link
              key={guide.id}
              href={`/${city}/guides/${guide.id}`}
              className="group rounded-lg border overflow-hidden hover:shadow-md transition-shadow block"
            >
              {/* Avatar header */}
              <div className="aspect-[4/3] bg-muted relative">
                {guide.profile?.has_avatar_data || guide.profile?.avatar_url ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${guide.profile?.has_avatar_data ? `/api/avatar/${guide.profile.id}` : guide.profile?.avatar_url})`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    No photo
                  </div>
                )}
                {guide.is_verified && (
                  <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    Verified
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {guide.profile?.first_name} {guide.profile?.last_name}
                  </h3>
                  <p className="text-sm text-primary font-medium">
                    {guide.tagline}
                  </p>
                </div>

                {guide.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {guide.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {guide.languages?.slice(0, 3).map((lang: string) => (
                    <span
                      key={lang}
                      className="text-xs bg-muted px-2 py-1 rounded"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-medium">
                    {guide.hourly_rate
                      ? `${formatPrice(guide.hourly_rate, cityData.currency_symbol)}/hour`
                      : "Contact for rates"}
                  </span>
                  {guide.years_experience && (
                    <span className="text-sm text-muted-foreground">
                      {guide.years_experience} years exp.
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
