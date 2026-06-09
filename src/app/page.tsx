import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAllActiveCities } from "@/lib/db/queries";

export default async function HomePage() {
  const session = await getSession();

  // If not logged in, redirect to login
  if (!session.userId) {
    redirect("/login");
  }

  const cities = await getAllActiveCities();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            WanderMate
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Discover local experiences with verified guides and drivers.
          </p>
        </div>

        {/* City selector */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Choose your destination
          </p>
          {cities.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No cities available yet. Check back soon!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/${city.slug}`}
                  className="group rounded-lg border p-6 text-left hover:border-primary hover:shadow-md transition-all bg-background"
                >
                  <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {city.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {city.country}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
