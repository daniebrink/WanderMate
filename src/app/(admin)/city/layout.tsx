import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { AdminNav } from "./admin-nav";

export default async function CityAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

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

  let cityName = null;
  if (session.adminCityId) {
    const { rows } = await query(
      `SELECT name FROM cities WHERE id = $1`,
      [session.adminCityId]
    );
    cityName = rows[0]?.name || null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminNav cityName={cityName} />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
