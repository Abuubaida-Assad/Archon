import { NextRequest, NextResponse } from 'next/server';
import { defaultCacheStore } from '@/lib/storage/cache-store';
import { defaultImpactEngine } from '@/lib/impact/impact-engine';
import { defaultAiProvider } from '@/lib/ai/ai-provider';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { targetNodeId } = body;

    if (!targetNodeId) {
      return NextResponse.json({ success: false, error: 'targetNodeId is required.' }, { status: 400 });
    }

    const summary = defaultCacheStore.get(id);
    if (!summary) {
      return NextResponse.json({ success: false, error: `Repository "${id}" not found.` }, { status: 404 });
    }

    const impact = defaultImpactEngine.analyzeImpact(targetNodeId, summary.nodes, summary.edges);

    // Enrich with AI Architect Insight grounded in graph evidence
    try {
      const aiInsight = await defaultAiProvider.explainImpact(impact.targetNode, impact, summary.edges);
      impact.aiArchitectInsight = aiInsight;
    } catch (aiErr) {
      console.warn('[Impact API] AI explanation error:', aiErr);
    }

    return NextResponse.json({ success: true, impact });
  } catch (err: any) {
    console.error('[Impact API] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Impact analysis failed.' }, { status: 500 });
  }
}
