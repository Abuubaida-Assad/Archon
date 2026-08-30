import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { defaultCacheStore } from '@/lib/storage/cache-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const rawFilePath = searchParams.get('path');
    const targetLine = parseInt(searchParams.get('line') || '1', 10);

    if (!rawFilePath) {
      return NextResponse.json({ success: false, error: 'File path parameter is required.' }, { status: 400 });
    }

    const summary = defaultCacheStore.get(id);

    // Clean and normalize file path
    let cleanedPath = rawFilePath.trim();
    if (cleanedPath.startsWith('package:')) {
      cleanedPath = cleanedPath.replace(/^package:/, '');
    }
    if (cleanedPath.startsWith('@/')) {
      cleanedPath = cleanedPath.replace(/^@\//, 'src/');
    }
    if (cleanedPath.startsWith('./')) {
      cleanedPath = cleanedPath.replace(/^\.\//, '');
    }

    // Candidate file extensions to test if extension is missing
    const candidatePaths = [cleanedPath, rawFilePath];
    if (!path.extname(cleanedPath)) {
      candidatePaths.push(
        `${cleanedPath}.ts`,
        `${cleanedPath}.tsx`,
        `${cleanedPath}.js`,
        `${cleanedPath}.jsx`,
        `${cleanedPath}.py`,
        `${cleanedPath}/index.ts`,
        `${cleanedPath}/index.tsx`,
        `${cleanedPath}/index.js`,
        `src/${cleanedPath}.ts`,
        `src/${cleanedPath}/index.ts`
      );
    }

    // Locate candidate base folders
    const possibleBases = [
      path.join(os.tmpdir(), 'archon-repos', id),
      path.join(process.cwd(), 'data', 'repos', id),
      path.join(process.cwd(), 'data', 'samples', 'ecommerce-platform'),
    ];

    if (summary?.repository?.url && fs.existsSync(summary.repository.url)) {
      possibleBases.unshift(summary.repository.url);
    }

    // Check temp directory subfolders (e.g. GitHub archive extracted folders)
    try {
      const tempRoot = path.join(os.tmpdir(), 'archon-repos', id);
      if (fs.existsSync(tempRoot)) {
        const subs = fs.readdirSync(tempRoot);
        for (const sub of subs) {
          const subDir = path.join(tempRoot, sub);
          if (fs.statSync(subDir).isDirectory()) {
            possibleBases.push(subDir);
          }
        }
      }
    } catch {
      // Ignore directory traversal errors
    }

    let fullPath = '';

    for (const base of possibleBases) {
      if (!fs.existsSync(base)) continue;

      for (const rel of candidatePaths) {
        const candidate = path.join(base, rel);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          fullPath = candidate;
          break;
        }
      }
      if (fullPath) break;
    }

    // If file found on disk, read and return it
    if (fullPath && fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const ext = path.extname(fullPath).toLowerCase();
      let language = 'other';
      if (ext.includes('ts')) language = 'typescript';
      else if (ext.includes('js')) language = 'javascript';
      else if (ext.includes('py')) language = 'python';
      else if (ext.includes('json')) language = 'json';
      else if (ext.includes('md')) language = 'markdown';

      return NextResponse.json({
        success: true,
        filePath: rawFilePath,
        content,
        targetLine,
        linesCount: content.split('\n').length,
        language,
      });
    }

    // Fallback: Check if summary nodes have matching snippet or fullContent
    if (summary) {
      const matchingNode =
        summary.nodes.find((n) => n.path === rawFilePath || n.id === rawFilePath || n.name === rawFilePath) ||
        summary.nodes.find((n) => n.path.endsWith(cleanedPath) || cleanedPath.endsWith(n.path));

      if (matchingNode) {
        const fallbackContent =
          matchingNode.fullContent ||
          matchingNode.codeSnippet ||
          `// Symbol: ${matchingNode.name}\n// Type: ${matchingNode.type}\n// Layer: ${matchingNode.layer}\n// Location: ${matchingNode.path}\n\n// No further source file found on disk.`;

        return NextResponse.json({
          success: true,
          filePath: rawFilePath,
          content: fallbackContent,
          targetLine: matchingNode.line || targetLine || 1,
          linesCount: fallbackContent.split('\n').length,
          language: matchingNode.language || 'typescript',
        });
      }
    }

    // If external package or virtual module
    if (rawFilePath.startsWith('package:') || rawFilePath.startsWith('@/')) {
      const virtualContent = `// External Package / Type Declaration: ${rawFilePath}\n// Declared as an external dependency or module alias.\n\nexport interface ${path.basename(cleanedPath).replace(/[^a-zA-Z0-9]/g, '_')} {\n  [key: string]: any;\n}`;
      return NextResponse.json({
        success: true,
        filePath: rawFilePath,
        content: virtualContent,
        targetLine: 1,
        linesCount: virtualContent.split('\n').length,
        language: 'typescript',
      });
    }

    return NextResponse.json({
      success: false,
      error: `File "${rawFilePath}" could not be located on disk.`,
    }, { status: 404 });
  } catch (err: any) {
    console.error('[Source API] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch source code.' }, { status: 500 });
  }
}
