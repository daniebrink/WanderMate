import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const { driverId } = await params;

  const { rows } = await query(
    `SELECT vehicle_image_data, vehicle_image_mime_type, vehicle_images FROM drivers WHERE id = $1`,
    [driverId]
  );

  const driver = rows[0];
  if (!driver) {
    return new NextResponse("Not found", { status: 404 });
  }

  // If we have binary data in the DB, serve it
  if (driver.vehicle_image_data) {
    const mimeType = driver.vehicle_image_mime_type || "image/jpeg";
    return new NextResponse(Buffer.from(driver.vehicle_image_data), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // Fallback to legacy vehicle_images path
  if (driver.vehicle_images?.[0]) {
    return NextResponse.redirect(new URL(driver.vehicle_images[0], _request.url));
  }

  return new NextResponse("No vehicle image", { status: 404 });
}
