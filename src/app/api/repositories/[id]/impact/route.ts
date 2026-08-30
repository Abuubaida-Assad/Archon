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
    const { targetNodeId, nodes: bodyNodes, edges: bodyEdges, summary: bodySummary } = body;

    if (!targetNodeId) {
      return NextResponse.json({ success: false, error: 'targetNodeId is required.' }, { status: 400 });
    }

    // Retrieve from server cache or fallback to client payload (for Vercel multi-lambda resilience)
    const cachedSummary = defaultCacheStore.get(id);
    const nodes = cachedSummary?.nodes || bodyNodes || bodySummary?.nodes || [];
    const edges = cachedSummary?.edges || bodyEdges || bodySummary?.edges || [];

    if (nodes.length === 0) {
      return NextResponse.json({ success: false, error: `Repository graph data for "${id}" is unavailable.` }, { status: 404 });
    }

    const impact = defaultImpactEngine.analyzeImpact(targetNodeId, nodes, edges);

    // Enrich with AI Architect Insight grounded in graph evidence
    try {
      const aiInsight = await defaultAiProvider.explainImpact(impact.targetNode, impact, edges);
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
