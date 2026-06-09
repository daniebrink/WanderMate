"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav({
  city,
  cityName,
  allCities,
}: {
  city: string;
  cityName: string;
  allCities: { slug: string; name: string; country: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-accent transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 border-b bg-background shadow-lg z-50">
          <nav className="container mx-auto px-4 py-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {cityName}
            </p>
            <Link
              href={`/${city}/activities`}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium hover:text-primary transition-colors"
            >
              Activities
            </Link>
            <Link
              href={`/${city}/guides`}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium hover:text-primary transition-colors"
            >
              Guides
            </Link>
            <Link
              href={`/${city}/drivers`}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium hover:text-primary transition-colors"
            >
              Drivers
            </Link>
            <Link
              href={`/${city}/packages`}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium hover:text-primary transition-colors"
            >
              Packages
            </Link>

            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Switch city
              </p>
              <div className="space-y-2">
                {allCities.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className={`block text-sm hover:text-primary transition-colors ${
                      c.slug === city ? "font-medium text-primary" : ""
                    }`}
                  >
                    {c.name}, {c.country}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
