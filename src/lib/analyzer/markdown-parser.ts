import { FileEntry } from './repo-manager';
import { ExtractedFileAnalysis } from './js-ts-parser';

export class MarkdownParser {
  /**
   * Parse a markdown note or Obsidian document and extract wiki-links, standard relative markdown links, and tags
   */
  public parseFile(file: FileEntry, allFilePaths: string[] = []): ExtractedFileAnalysis {
    const lines = file.content.split('\n');
    const imports: any[] = [];
    const calls: any[] = [];

    // Extract title (First # Heading or file basename)
    const baseName = file.name || file.relativePath.split('/').pop() || 'note';
    let noteTitle = baseName.replace(/\.mdx?$/i, '');
    const headingMatch = file.content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      noteTitle = headingMatch[1].trim();
    }

    // 1. Extract Obsidian [[wiki-links]] : [[Note Name]] or [[path/to/Note|Custom Label]]
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match: RegExpExecArray | null;

    while ((match = wikiLinkRegex.exec(file.content)) !== null) {
      const targetNoteName = match[1].trim();
      const lineNum = file.content.slice(0, match.index).split('\n').length;

      // Find matching relative file path if possible
      const resolved = this.resolveWikiLinkTarget(targetNoteName, allFilePaths);

      imports.push({
        source: targetNoteName,
        resolvedPath: resolved,
        isRelative: true,
        importedSymbols: [{ name: targetNoteName, localName: targetNoteName, isDefault: true }],
        line: lineNum,
      });

      calls.push({
        calleeName: targetNoteName,
        line: lineNum,
        snippet: match[0],
      });
    }

    // 2. Extract standard Markdown relative links: [text](./path/to/file.md)
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+\.mdx?)\)/g;
    while ((match = mdLinkRegex.exec(file.content)) !== null) {
      const linkTarget = match[2].trim();
      const lineNum = file.content.slice(0, match.index).split('\n').length;
      const resolved = this.resolveRelativeMdPath(file.relativePath, linkTarget, allFilePaths);

      imports.push({
        source: linkTarget,
        resolvedPath: resolved,
        isRelative: true,
        importedSymbols: [{ name: match[1], localName: match[1], isDefault: true }],
        line: lineNum,
      });
    }

    // Extract tags (#tag)
    const tagMatches = file.content.match(/(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g) || [];
    const tags = Array.from(new Set(tagMatches.map((t) => t.trim().replace(/^#/, ''))));

    return {
      file,
      symbols: [
        {
          name: noteTitle,
          kind: 'function',
          line: 1,
          endLine: lines.length,
          isExported: true,
          codeSnippet: file.content.slice(0, 500),
          docstring: tags.length > 0 ? `Tags: ${tags.join(', ')}` : undefined,
        },
      ],
      imports,
      exports: [noteTitle],
      calls,
      apis: [],
      dbOperations: [],
      events: [],
      isTestFile: false,
    };
  }

  private resolveWikiLinkTarget(noteName: string, allFilePaths: string[]): string | undefined {
    const clean = noteName.toLowerCase().replace(/\\/g, '/');
    return allFilePaths.find((p) => {
      const base = p.replace(/\.mdx?$/i, '').toLowerCase();
      return base === clean || base.endsWith('/' + clean);
    });
  }

  private resolveRelativeMdPath(currentPath: string, targetLink: string, allFilePaths: string[]): string | undefined {
    const currentDir = currentPath.includes('/') ? currentPath.slice(0, currentPath.lastIndexOf('/')) : '';
    const combined = currentDir ? `${currentDir}/${targetLink}` : targetLink;
    const normalized = combined.replace(/\/\.\//g, '/').replace(/[^\/]+\/\.\.\//g, '');
    return allFilePaths.find((p) => p === normalized || p.endsWith(targetLink.replace(/^\.\//, '')));
  }
}

export const defaultMarkdownParser = new MarkdownParser();
