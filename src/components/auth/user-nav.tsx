"use server";

import Link from "next/link";
import { logout } from "@/app/login/actions";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function UserNav() {
  const session = await getSession();

  if (!session.userId) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium hover:text-primary transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Get Started
        </Link>
      </div>
    );
  }

  // Fetch profile for display name
  const { rows } = await query(
    `SELECT first_name, last_name, user_type FROM profiles WHERE id = $1`,
    [session.userId]
  );

  const profile = rows[0];

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : session.email?.split("@")[0] ?? "User";

  const dashboardLink =
    profile?.user_type === "guide"
      ? "/guide"
      : profile?.user_type === "driver"
      ? "/driver"
      : profile?.user_type === "city_admin" || profile?.user_type === "super_admin"
      ? "/city"
      : "/tourist";

  const editProfileLink =
    profile?.user_type === "guide"
      ? "/guide/edit"
      : profile?.user_type === "driver"
      ? "/driver/edit"
      : null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {displayName}
      </span>
      {editProfileLink && (
        <Link
          href={editProfileLink}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Edit Profile
        </Link>
      )}
      {dashboardLink && (
        <Link
          href={dashboardLink}
          className="text-sm font-medium hover:text-primary transition-colors"
        >
          Dashboard
        </Link>
      )}
      <form action={logout}>
        <button
          type="submit"
          className="text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}
