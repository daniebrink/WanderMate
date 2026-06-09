import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const { rows } = await query(
    `SELECT avatar_data, avatar_mime_type, avatar_url FROM profiles WHERE id = $1`,
    [userId]
  );

  const profile = rows[0];
  if (!profile) {
    return new NextResponse("Not found", { status: 404 });
  }

  // If we have binary data in the DB, serve it
  if (profile.avatar_data) {
    const mimeType = profile.avatar_mime_type || "image/jpeg";
    return new NextResponse(Buffer.from(profile.avatar_data), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // Fallback to legacy avatar_url redirect
  if (profile.avatar_url) {
    return NextResponse.redirect(new URL(profile.avatar_url, _request.url));
  }

  return new NextResponse("No avatar", { status: 404 });
}
