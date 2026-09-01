import fs from 'fs';
import path from 'path';
import { sql } from '@vercel/postgres';

// Define the absolute path to the root data directory
const DATA_DIR = path.join(process.cwd(), 'data');

// Read a JSON file
export async function readData<T>(fileName: string): Promise<T> {
  // Try to use Postgres if Vercel deployment or env is set
  if (process.env.POSTGRES_URL) {
    try {
      const result = await sql`SELECT data FROM json_store WHERE id = ${fileName}`;
      if (result.rows.length > 0) {
        return result.rows[0].data as T;
      }
    } catch (error) {
      console.error(`Failed to read ${fileName} from Postgres, falling back to FS`, error);
    }
  }

  // Fallback to local file system
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file ${fileName} not found`);
  }
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContents) as T;
}

// Write to a JSON file
export async function writeData<T>(fileName: string, data: T): Promise<void> {
  // Try to write to Postgres first
  if (process.env.POSTGRES_URL) {
    try {
      await sql`
        INSERT INTO json_store (id, data)
        VALUES (${fileName}, ${JSON.stringify(data)})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;
    } catch (error) {
      console.error(`Failed to write ${fileName} to Postgres`, error);
      throw error;
    }
  }

  // Also write to local file system to keep it in sync during development
  try {
    const filePath = path.join(DATA_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    // If we're on Vercel, fs write will fail (read-only FS), so we ignore the error
    if (!process.env.VERCEL) {
      console.error(`Failed to write ${fileName} to local FS`, error);
    }
  }
}
