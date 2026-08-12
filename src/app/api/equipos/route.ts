import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/data';

const FILE_NAME = 'equipos.json';

export async function GET() {
  try {
    const data = readData(FILE_NAME);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = readData<any[]>(FILE_NAME);
    const newData = [...data, body];
    writeData(FILE_NAME, newData);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = readData<any[]>(FILE_NAME);
    const index = data.findIndex(item => item.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    data[index] = body;
    writeData(FILE_NAME, data);
    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const data = readData<any[]>(FILE_NAME);
    const newData = data.filter(item => item.id !== id);
    writeData(FILE_NAME, newData);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}
