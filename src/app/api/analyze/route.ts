import { NextRequest, NextResponse } from 'next/server';
import { defaultOrchestrator } from '@/lib/analyzer/analysis-orchestrator';
import { FileEntry } from '@/lib/analyzer/repo-manager';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, branch, token, files } = body;

    // Handle Local Folder Files directly uploaded from browser
    if (files && Array.isArray(files) && files.length > 0) {
      const folderName = url || 'Local Codebase';
      const repoId = `local-${crypto.createHash('md5').update(folderName + files.length).digest('hex').slice(0, 12)}`;

      const formattedFiles: FileEntry[] = files.map((f: any) => {
        const ext = f.name?.split('.').pop()?.toLowerCase() || '';
        let language: any = 'other';
        if (ext === 'ts' || ext === 'tsx') language = 'typescript';
        else if (ext === 'js' || ext === 'jsx') language = 'javascript';
        else if (ext === 'py') language = 'python';
        else if (ext === 'md' || ext === 'mdx') language = 'markdown';
        else if (ext === 'json') language = 'json';
        else if (ext === 'yaml' || ext === 'yml') language = 'yaml';
        else if (ext === 'sql') language = 'sql';

        const lines = (f.content || '').split('\n').length;

        return {
          absolutePath: `/virtual/${f.relativePath}`,
          relativePath: f.relativePath,
          name: f.name || f.relativePath.split('/').pop() || 'file',
          extension: ext ? `.${ext}` : '',
          sizeBytes: (f.content || '').length,
          language,
          linesOfCode: lines,
          content: f.content || '',
        };
      });

      const totalLoc = formattedFiles.reduce((acc, f) => acc + f.linesOfCode, 0);

      const metadata = {
        id: repoId,
        url: folderName,
        name: folderName,
        owner: 'local',
        branch: 'workspace',
        commitHash: 'local-head',
        languages: { typescript: 70, javascript: 30 },
        totalFiles: formattedFiles.length,
        totalLoc,
        analyzedAt: new Date().toISOString(),
        status: 'complete' as const,
        progressPercent: 100,
        statusMessage: 'Local folder analysis completed in browser',
        isLocalFolder: true,
        pipelineStages: [],
      };

      const summary = await defaultOrchestrator.processScannedFiles(formattedFiles, metadata);

      return NextResponse.json({
        success: true,
        repositoryId: summary.repository.id,
        summary,
      });
    }

    // Handle Git URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Repository URL or path is required.' },
        { status: 400 }
      );
    }

    // Support shorthand like "facebook/react" or "owner/repo"
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://') && !fullUrl.startsWith('/') && fullUrl.includes('/')) {
      fullUrl = `https://github.com/${fullUrl}`;
    }

    const summary = await defaultOrchestrator.analyzeRepository(
      fullUrl,
      branch ? String(branch).trim() : undefined,
      undefined,
      token ? String(token).trim() : undefined
    );

    return NextResponse.json({
      success: true,
      repositoryId: summary.repository.id,
      summary,
    });
  } catch (error: any) {
    console.error('[API /analyze] Analysis failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred during repository analysis.',
      },
      { status: 500 }
    );
  }
}
