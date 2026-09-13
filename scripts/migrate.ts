import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

// See src/lib/data.ts for why this override is needed.
if (process.env.STORAGE_POSTGRES_URL) {
  process.env.POSTGRES_URL = process.env.STORAGE_POSTGRES_URL;
}

// If you don't have dotenv installed, we can just ensure the user runs it with env vars loaded.
// For now, Next.js typically loads .env.local automatically, or we can use the vercel cli to run this.

const DATA_DIR = path.join(process.cwd(), 'data');

async function migrate() {
  console.log('Starting migration to Vercel Postgres...');

  // Create the table
  await sql`
    CREATE TABLE IF NOT EXISTS json_store (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
  `;
  console.log('Table json_store created or already exists.');

  const files = ['equipos.json', 'ingredients.json', 'products.json', 'sales.json', 'settings.json'];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    if (fs.existsSync(filePath)) {
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContents);
      
      // Upsert into Postgres
      await sql`
        INSERT INTO json_store (id, data)
        VALUES (${file}, ${JSON.stringify(data)})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
      console.log(`Migrated ${file}`);
    } else {
      console.log(`File not found: ${file}, skipping.`);
    }
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
