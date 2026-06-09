import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params;

  const { rows } = await query(
    `SELECT image_data, image_mime_type FROM city_images WHERE id = $1`,
    [imageId]
  );

  const image = rows[0];
  if (!image) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(image.image_data), {
    headers: {
      "Content-Type": image.image_mime_type || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
