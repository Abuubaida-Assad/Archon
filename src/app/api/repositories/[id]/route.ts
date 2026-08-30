import { NextRequest, NextResponse } from 'next/server';
import { defaultCacheStore } from '@/lib/storage/cache-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const summary = defaultCacheStore.get(id);

  if (!summary) {
    return NextResponse.json(
      { success: false, error: `Repository "${id}" not found in cache. Please analyze it first.` },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, summary });
}
