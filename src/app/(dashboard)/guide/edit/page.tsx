import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { updateGuideProfile } from "@/app/profile/actions";
import { AvatarUpload } from "./avatar-upload";

export default async function GuideEditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { error } = await searchParams;

  if (!session.userId) {
    redirect("/login?error=" + encodeURIComponent("Please sign in"));
  }

  const { rows: profileRows } = await query(
    `SELECT first_name, last_name, phone, avatar_url, avatar_data IS NOT NULL as has_avatar_data FROM profiles WHERE id = $1`,
    [session.userId]
  );

  const { rows: guideRows } = await query(
    `SELECT bio, tagline, hourly_rate, languages, certifications, specialisations, years_experience, is_available_hourly, gallery_images
     FROM guides WHERE profile_id = $1`,
    [session.userId]
  );

  if (guideRows.length === 0) {
    redirect("/guide?error=" + encodeURIComponent("Guide record not found"));
  }

  const profile = profileRows[0] || {};
  const guide = guideRows[0];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl">Edit Profile</h1>
          <Link
            href="/guide"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        <form action={updateGuideProfile} className="bg-card rounded-lg border p-6 space-y-5">
          <AvatarUpload
            currentSrc={profile.has_avatar_data ? `/api/avatar/${session.userId}` : profile.avatar_url || null}
            label="profile photo"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" defaultValue={profile.first_name || ""} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" defaultValue={profile.last_name || ""} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={profile.phone || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="tagline">Tagline</label>
            <input id="tagline" name="tagline" defaultValue={guide.tagline || ""} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" rows={4} defaultValue={guide.bio || ""} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="hourlyRate">Hourly rate (cents)</label>
              <input id="hourlyRate" name="hourlyRate" type="number" min={0}
                defaultValue={guide.hourly_rate || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="yearsExperience">Years experience</label>
              <input id="yearsExperience" name="yearsExperience" type="number" min={0} max={100}
                defaultValue={guide.years_experience || ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="languages">Languages (comma separated)</label>
            <input id="languages" name="languages"
              defaultValue={Array.isArray(guide.languages) ? guide.languages.join(", ") : ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="certifications">Certifications (comma separated)</label>
            <input id="certifications" name="certifications"
              defaultValue={Array.isArray(guide.certifications) ? guide.certifications.join(", ") : ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="specialisations">Specialisations (comma separated)</label>
            <input id="specialisations" name="specialisations"
              defaultValue={Array.isArray(guide.specialisations) ? guide.specialisations.join(", ") : ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="galleryImages">Gallery Images (comma separated paths)</label>
            <input id="galleryImages" name="galleryImages" type="text" placeholder="/images/guides/name/gallery-01.jpg, /images/guides/name/gallery-02.jpg"
              defaultValue={Array.isArray(guide.gallery_images) ? guide.gallery_images.join(", ") : ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            {guide.gallery_images?.[0] && (
              <div className="flex gap-2 mt-2">
                {guide.gallery_images.map((img: string, i: number) => (
                  <div key={i} className="w-16 h-16 rounded-md bg-muted overflow-hidden">
                    <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${img})` }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isAvailableHourly" defaultChecked={guide.is_available_hourly}
              className="rounded border-input" />
            Available for hourly bookings
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
              Save changes
            </button>
            <Link href="/guide"
              className="rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
