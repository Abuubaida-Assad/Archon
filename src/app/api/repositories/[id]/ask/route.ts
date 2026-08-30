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
    const { query, model, summary: bodySummary } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: 'Query string is required.' }, { status: 400 });
    }

    // Retrieve from server cache or fallback to client payload (for Vercel multi-lambda resilience)
    const summary = defaultCacheStore.get(id) || bodySummary;
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
