const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    const { rows: activities } = await client.query("SELECT id, slug FROM activities");
    console.log("Found", activities.length, "activities");

    const baseDir = "public/images/activities";
    let totalImages = 0;

    for (const activity of activities) {
      const activityDir = path.join(baseDir, activity.slug);
      if (!fs.existsSync(activityDir)) {
        console.log("No images for", activity.slug);
        continue;
      }

      const files = fs
        .readdirSync(activityDir)
        .filter((f) => f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"))
        .sort();

      for (let i = 0; i < files.length; i++) {
        const filePath = path.join(activityDir, files[i]);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

        await client.query(
          "INSERT INTO activity_images (activity_id, image_data, image_mime_type, sort_order) VALUES ($1, $2, $3, $4)",
          [activity.id, buffer, mimeType, i]
        );
        totalImages++;
      }
      console.log("Migrated", files.length, "images for", activity.slug);
    }

    console.log("Total images migrated:", totalImages);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
