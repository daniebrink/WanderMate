"use server";

import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { getAllActiveCities } from "@/lib/db/queries";

export async function Navbar() {
  const cities = await getAllActiveCities();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          WanderMate
        </Link>
        <UserNavFallback />
      </div>
    </header>
  );
}

// Wrapper that catches errors so the whole page doesn't crash
async function UserNavFallback() {
  try {
    return <UserNav />;
  } catch {
    // If session/auth is misconfigured, show basic login link
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium hover:text-primary transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }
}
