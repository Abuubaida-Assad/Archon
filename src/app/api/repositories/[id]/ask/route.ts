import { NextRequest, NextResponse } from 'next/server';
import { defaultCacheStore } from '@/lib/storage/cache-store';
import { defaultNaturalLanguageExplorer } from '@/lib/ai/natural-language-explorer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { query, model } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: 'Query string is required.' }, { status: 400 });
    }

    const summary = defaultCacheStore.get(id);
    if (!summary) {
      return NextResponse.json({ success: false, error: `Repository "${id}" not found.` }, { status: 404 });
    }

    const result = await defaultNaturalLanguageExplorer.queryArchitecture(query, summary, model);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[Ask API] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Architecture query failed.' }, { status: 500 });
  }
}
