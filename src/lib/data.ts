import fs from 'fs';
import path from 'path';

// Define the absolute path to the root data directory
const DATA_DIR = path.join(process.cwd(), 'data');

// Read a JSON file
export function readData<T>(fileName: string): T {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file ${fileName} not found`);
  }
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContents) as T;
}

// Write to a JSON file
export function writeData<T>(fileName: string, data: T): void {
  const filePath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
