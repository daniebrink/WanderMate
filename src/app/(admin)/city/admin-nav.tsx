"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearAdminCity } from "@/app/admin/actions";

interface AdminNavProps {
  cityName: string | null;
}

export function AdminNav({ cityName }: AdminNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/city", label: "Dashboard", exact: true },
    { href: "/city/activities", label: "Activities", exact: false },
    { href: "/city/packages", label: "Packages", exact: false },
  ];

  const isActive = (link: (typeof links)[0]) => {
    if (link.exact) return pathname === link.href;
    return pathname.startsWith(link.href);
  };

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-14 flex items-center gap-4">
        {/* Brand */}
        <span className="font-bold text-lg shrink-0">
          {cityName ? `${cityName} Admin` : "City Admin"}
        </span>

        {/* Switch City button */}
        <form action={clearAdminCity} className="shrink-0">
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Switch City
          </button>
        </form>

        {/* Divider */}
        <span className="text-muted-foreground">|</span>

        {/* Nav links with separators */}
        <nav className="flex items-center">
          {links.map((link, index) => (
            <span key={link.href} className="flex items-center">
              {index > 0 && (
                <span className="text-muted-foreground mx-2 select-none">
                  |
                </span>
              )}
              <Link
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
