import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { defaultCacheStore } from '@/lib/storage/cache-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    const targetLine = parseInt(searchParams.get('line') || '1', 10);

    if (!filePath) {
      return NextResponse.json({ success: false, error: 'File path parameter is required.' }, { status: 400 });
    }

    const summary = defaultCacheStore.get(id);
    if (!summary) {
      return NextResponse.json({ success: false, error: `Repository "${id}" not found.` }, { status: 404 });
    }

    // Try finding file in local cache or storage
    let fullPath = '';
    const possibleBases = [
      path.join(process.cwd(), 'data', 'repos', id),
      path.join(process.cwd(), 'data', 'samples', 'ecommerce-platform'),
      summary.repository.url,
    ];

    for (const base of possibleBases) {
      const candidate = path.join(base, filePath);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        fullPath = candidate;
        break;
      }
    }

    if (!fullPath && fs.existsSync(filePath)) {
      fullPath = filePath;
    }

    if (!fullPath) {
      // Return synthetic or node codeSnippet if available from graph
      const matchingNode = summary.nodes.find((n) => n.path === filePath);
      if (matchingNode && matchingNode.codeSnippet) {
        return NextResponse.json({
          success: true,
          filePath,
          content: matchingNode.codeSnippet,
          targetLine,
          linesCount: matchingNode.codeSnippet.split('\n').length,
          language: matchingNode.language,
        });
      }

      return NextResponse.json({ success: false, error: `File "${filePath}" could not be located on disk.` }, { status: 404 });
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const ext = path.extname(fullPath).toLowerCase();
    const language = ext.includes('ts') ? 'typescript' : ext.includes('js') ? 'javascript' : ext.includes('py') ? 'python' : 'other';

    return NextResponse.json({
      success: true,
      filePath,
      content,
      targetLine,
      linesCount: content.split('\n').length,
      language,
    });
  } catch (err: any) {
    console.error('[Source API] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch source code.' }, { status: 500 });
  }
}
