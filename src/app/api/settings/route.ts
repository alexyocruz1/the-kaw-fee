import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/data';

const FILE_NAME = 'settings.json';

export async function GET() {
  try {
    const data = readData(FILE_NAME);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    writeData(FILE_NAME, body);
    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
