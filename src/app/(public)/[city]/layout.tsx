import { notFound } from "next/navigation";
import Link from "next/link";
import { getCityBySlug, getAllActiveCities } from "@/lib/db/queries";
import { MobileNav } from "@/components/layout/mobile-nav";

function currencyName(code: string): string {
  const map: Record<string, string> = {
    ZAR: "Rand",
    USD: "US Dollar",
    EUR: "Euro",
    GBP: "Pound Sterling",
    AUD: "Australian Dollar",
    CAD: "Canadian Dollar",
    NZD: "New Zealand Dollar",
    INR: "Indian Rupee",
    JPY: "Japanese Yen",
    CNY: "Chinese Yuan",
  };
  return map[code] ?? code;
}

export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const cityData = await getCityBySlug(city);
  const allCities = await getAllActiveCities();

  if (!cityData) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* City sub-navbar — distinct from the global top navbar */}
      <header className="border-b bg-muted relative">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MobileNav city={city} cityName={cityData.name} allCities={allCities} />

            {/* City name as the "brand" of this navbar */}
            <Link
              href={`/${city}`}
              className="font-semibold text-lg hover:text-primary transition-colors"
            >
              {cityData.name}
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              {/* City switcher */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Switch city
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 rounded-md border bg-background shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      All cities
                    </p>
                    {allCities.map((c: any) => (
                      <Link
                        key={c.slug}
                        href={`/${c.slug}`}
                        className={`block px-3 py-2 text-sm hover:bg-accent transition-colors ${
                          c.slug === city ? "font-medium text-primary" : ""
                        }`}
                      >
                        {c.name}, {c.country}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <span className="text-muted-foreground">|</span>

              <Link
                href={`/${city}/activities`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Activities
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link
                href={`/${city}/guides`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Guides
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link
                href={`/${city}/drivers`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Drivers
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link
                href={`/${city}/packages`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Packages
              </Link>
            </nav>
          </div>

          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
            {cityData.currency_symbol} ({currencyName(cityData.currency_code)})
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} WanderMate. Local experiences, global connections.
        </div>
      </footer>
    </div>
  );
}
