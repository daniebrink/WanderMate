import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import { applyAsGuide } from "../actions";

export default async function ApplyGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { error } = await searchParams;

  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in to apply"));
  }

  // Check if already a guide
  const { rows } = await query(
    `SELECT id, is_verified FROM guides WHERE profile_id = $1`,
    [session.userId]
  );
  const existingGuide = rows[0];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl">Apply as a Guide</h1>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        {existingGuide ? (
          <div className="bg-card rounded-lg border p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold">
              {existingGuide.is_verified
                ? "You are a verified guide!"
                : "Your application is pending review"}
            </h2>
            <p className="text-muted-foreground">
              {existingGuide.is_verified
                ? "You can access your dashboard to manage bookings."
                : "An admin will review your application shortly. You'll be notified once approved."}
            </p>
            <Link
              href={existingGuide.is_verified ? "/guide" : "/tourist"}
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {existingGuide.is_verified ? "Go to Dashboard" : "Back to My Bookings"}
            </Link>
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Become a Guide</h2>
              <p className="text-sm text-muted-foreground">
                Share your local knowledge and earn money doing what you love.
              </p>
            </div>

            <form action={applyAsGuide} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="tagline">
                  Tagline *
                </label>
                <input
                  id="tagline"
                  name="tagline"
                  type="text"
                  required
                  placeholder="e.g. Wine expert & storyteller"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="bio">
                  Bio *
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  required
                  placeholder="Tell us about yourself, your experience, and what makes you a great guide..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="hourlyRate">
                  Hourly rate (cents)
                </label>
                <input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="e.g. 15000 = R150"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to negotiate per booking
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="languages">
                  Languages
                </label>
                <input
                  id="languages"
                  name="languages"
                  type="text"
                  placeholder="English, Afrikaans, Xhosa"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="specialisations">
                  Specialisations
                </label>
                <input
                  id="specialisations"
                  name="specialisations"
                  type="text"
                  placeholder="Wine Tours, History, Photography"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="certifications">
                  Certifications
                </label>
                <input
                  id="certifications"
                  name="certifications"
                  type="text"
                  placeholder="First Aid, SATSA Registered"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="yearsExperience">
                  Years of experience
                </label>
                <input
                  id="yearsExperience"
                  name="yearsExperience"
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Submit Application
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
