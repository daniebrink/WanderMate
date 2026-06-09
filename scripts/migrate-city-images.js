const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    const { rows: cities } = await client.query("SELECT id, slug, hero_images FROM cities");
    console.log("Found", cities.length, "cities");

    const baseDir = "public/images/cities";
    let totalImages = 0;

    for (const city of cities) {
      const cityDir = path.join(baseDir, city.slug);
      if (!fs.existsSync(cityDir)) {
        console.log("No images for", city.slug);
        continue;
      }

      // Read files and sort by the original hero_images order if possible
      const files = fs
        .readdirSync(cityDir)
        .filter((f) => f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"))
        .sort();

      for (let i = 0; i < files.length; i++) {
        const filePath = path.join(cityDir, files[i]);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

        await client.query(
          "INSERT INTO city_images (city_id, image_data, image_mime_type, sort_order) VALUES ($1, $2, $3, $4)",
          [city.id, buffer, mimeType, i]
        );
        totalImages++;
      }
      console.log("Migrated", files.length, "images for", city.slug);
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
