import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';

const ALLOWED_DIRECTORIES = new Set(['products', 'brand']);
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const getExtension = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }

  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'bin';
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const directory = String(formData.get('directory') || 'products');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_DIRECTORIES.has(directory)) {
      return NextResponse.json({ error: 'Invalid upload directory' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 });
    }

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${getExtension(file)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Try Vercel Blob if configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`uploads/${directory}/${fileName}`, buffer, {
          access: 'public',
          contentType: file.type
        });
        return NextResponse.json({ url: blob.url });
      } catch (error) {
        console.error('Failed to upload to Vercel Blob', error);
        // Fallthrough to local FS if we want, or just fail in Vercel
        if (process.env.VERCEL) {
           return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
        }
      }
    }

    // Fallback to local FS
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', directory);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/${directory}/${fileName}`
    });
  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
