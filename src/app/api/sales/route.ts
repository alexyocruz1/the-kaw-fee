import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/data';

type Sale = {
  id: string;
  productId: string;
  quantity: number;
  date: string;
  unitPrice: number;
  unitCost: number;
  productName: string;
};

const FILE_NAME = 'sales.json';

export async function GET() {
  try {
    const data = await readData<Sale[]>(FILE_NAME);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to read sales' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Sale;
    const data = await readData<Sale[]>(FILE_NAME);
    const newData = [...data, body];
    await writeData(FILE_NAME, newData);
    return NextResponse.json(body, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save sale' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const data = await readData<Sale[]>(FILE_NAME);
    const newData = data.filter(item => item.id !== id);
    await writeData(FILE_NAME, newData);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}
