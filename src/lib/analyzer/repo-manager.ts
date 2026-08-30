import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import simpleGit, { SimpleGit } from 'simple-git';
import { RepositoryMetadata } from '@/types';

export interface FileEntry {
  relativePath: string;
  absolutePath: string;
  name?: string;
  extension: string;
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'java' | 'json' | 'yaml' | 'sql' | 'markdown' | 'other';
  sizeBytes: number;
  linesOfCode: number;
  content: string;
}

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  '.idea',
  '.vscode',
  'vendor',
  'target',
  'bin',
  'obj',
  '.turbo',
]);

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.mp3', '.wav', '.mov', '.avi',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.lock', '.DS_Store', '.map'
]);

const EXTENSION_LANGUAGE_MAP: Record<string, FileEntry['language']> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.pyw': 'python',
  '.go': 'go',
  '.java': 'java',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
  '.md': 'markdown',
  '.mdx': 'markdown',
};

export class RepoManager {
  private baseStorageDir: string;

  constructor(storageDir?: string) {
    this.baseStorageDir = storageDir || path.join(process.cwd(), 'data', 'repos');
    if (!fs.existsSync(this.baseStorageDir)) {
      fs.mkdirSync(this.baseStorageDir, { recursive: true });
    }
  }

  /**
   * Parse repository URL and extract metadata
   */
  public parseRepoUrl(rawUrl: string): { owner: string; name: string; cleanUrl: string; isLocal: boolean } {
    const trimmed = rawUrl.trim();

    // Check if it's a local filesystem path
    if (fs.existsSync(trimmed) && fs.statSync(trimmed).isDirectory()) {
      const name = path.basename(trimmed);
      return {
        owner: 'local',
        name,
        cleanUrl: trimmed,
        isLocal: true,
      };
    }

    // Clean up .git suffix and whitespace
    let cleanUrl = trimmed;
    if (cleanUrl.endsWith('.git')) {
      cleanUrl = cleanUrl.slice(0, -4);
    }

    // Support PR URL: github.com/owner/repo/pull/123
    const prMatch = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/pull\/\d+/i);
    if (prMatch) {
      return {
        owner: prMatch[1],
        name: prMatch[2].replace(/\/$/, ''),
        cleanUrl: `https://github.com/${prMatch[1]}/${prMatch[2].replace(/\/$/, '')}`,
        isLocal: false,
      };
    }

    // Standard github.com/owner/repo format
    const githubMatch = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/i);
    if (githubMatch) {
      return {
        owner: githubMatch[1],
        name: githubMatch[2].replace(/\/$/, ''),
        cleanUrl: `https://github.com/${githubMatch[1]}/${githubMatch[2].replace(/\/$/, '')}`,
        isLocal: false,
      };
    }

    // Shorthand owner/repo format (e.g. facebook/react, expressjs/express, pmndrs/zustand)
    const shorthandMatch = cleanUrl.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shorthandMatch) {
      return {
        owner: shorthandMatch[1],
        name: shorthandMatch[2].replace(/\/$/, ''),
        cleanUrl: `https://github.com/${shorthandMatch[1]}/${shorthandMatch[2].replace(/\/$/, '')}`,
        isLocal: false,
      };
    }

    // GitLab / Bitbucket or generic git host
    const genericMatch = cleanUrl.match(/(?:https?:\/\/)?([^\/]+)\/([^\/]+)\/([^\/]+)/i);
    if (genericMatch) {
      return {
        owner: genericMatch[2],
        name: genericMatch[3].replace(/\/$/, ''),
        cleanUrl: cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`,
        isLocal: false,
      };
    }

    throw new Error(`Invalid repository URL: "${rawUrl}". Please provide a valid GitHub repository (e.g. "expressjs/express" or "https://github.com/owner/repo") or open a local folder.`);
  }

  /**
   * Get deterministic directory ID for repo
   */
  public getRepoId(cleanUrl: string, branch: string = 'main'): string {
    const hash = crypto.createHash('sha256').update(`${cleanUrl}#${branch}`).digest('hex').substring(0, 16);
    const parsed = this.parseRepoUrl(cleanUrl);
    return `${parsed.owner}_${parsed.name}_${hash}`;
  }

  /**
   * Clone or update repository into sandbox
   */
  public async acquireRepository(
    rawUrl: string,
    branch?: string,
    onProgress?: (stage: string, percent: number) => void,
    token?: string
  ): Promise<{ repoDir: string; metadata: RepositoryMetadata }> {
    const { owner, name, cleanUrl, isLocal } = this.parseRepoUrl(rawUrl);
    const repoId = this.getRepoId(cleanUrl, branch || 'default');
    const repoDir = path.join(this.baseStorageDir, repoId);

    onProgress?.('Validating repository target', 10);

    let commitHash = 'latest';
    let detectedBranch = branch || 'main';

    if (isLocal) {
      onProgress?.('Reading local repository directory', 30);
      try {
        const git: SimpleGit = simpleGit(cleanUrl);
        const isRepo = await git.checkIsRepo();
        if (isRepo) {
          const log = await git.log({ maxCount: 1 });
          if (log.latest) {
            commitHash = log.latest.hash.substring(0, 8);
          }
          const branchSummary = await git.branch();
          detectedBranch = branchSummary.current || 'main';
        }
      } catch {
        commitHash = `local-${Date.now().toString(16)}`;
      }

      const files = this.scanDirectory(cleanUrl);
      const { languages, totalLoc } = this.calculateStats(files);

      const metadata: RepositoryMetadata = {
        id: repoId,
        url: cleanUrl,
        name,
        owner,
        branch: detectedBranch,
        commitHash,
        languages,
        totalFiles: files.length,
        totalLoc,
        analyzedAt: new Date().toISOString(),
        status: 'complete',
        progressPercent: 100,
        statusMessage: 'Ready',
        pipelineStages: [],
      };

      return { repoDir: cleanUrl, metadata };
    }

    // Remote Git clone
    if (fs.existsSync(repoDir)) {
      onProgress?.('Reading cached repository clone', 25);
      try {
        const git: SimpleGit = simpleGit(repoDir);
        const log = await git.log({ maxCount: 1 });
        if (log.latest) {
          commitHash = log.latest.hash.substring(0, 8);
        }
        const b = await git.branch();
        detectedBranch = b.current || branch || 'main';
      } catch (err) {
        console.warn(`[RepoManager] Corrupted cached repo, re-cloning:`, err);
        fs.rmSync(repoDir, { recursive: true, force: true });
      }
    }

    if (!fs.existsSync(repoDir)) {
      onProgress?.(`Cloning repository ${owner}/${name}`, 20);
      const git: SimpleGit = simpleGit();
      const cloneOptions = ['--depth', '1', '--single-branch', '--no-tags'];
      if (branch && branch !== 'default') {
        cloneOptions.push('--branch', branch);
      }

      // Build clone URL with token if available
      let cloneUrl = cleanUrl;
      if (token) {
        cloneUrl = `https://${token}@github.com/${owner}/${name}.git`;
      }

      try {
        await git.clone(cloneUrl, repoDir, cloneOptions);
      } catch (cloneErr: any) {
        const errorMsg = cloneErr.message || String(cloneErr);
        if (errorMsg.includes('Authentication failed') || errorMsg.includes('terminal prompts disabled')) {
          throw new Error(`Repository "${owner}/${name}" is private or requires authentication. Please click the Key icon to provide a GitHub Personal Access Token.`);
        }
        if (errorMsg.includes('Remote branch') || errorMsg.includes('not found')) {
          throw new Error(`Repository branch "${branch}" was not found on remote.`);
        }
        throw new Error(`Git clone failed for "${owner}/${name}": ${errorMsg}`);
      }

      const clonedGit: SimpleGit = simpleGit(repoDir);
      try {
        const log = await clonedGit.log({ maxCount: 1 });
        if (log.latest) {
          commitHash = log.latest.hash.substring(0, 8);
        }
        const b = await clonedGit.branch();
        detectedBranch = b.current || branch || 'main';
      } catch {
        commitHash = 'head';
      }
    }

    onProgress?.('Scanning repository files and index', 40);
    const files = this.scanDirectory(repoDir);
    const { languages, totalLoc } = this.calculateStats(files);

    const metadata: RepositoryMetadata = {
      id: repoId,
      url: cleanUrl,
      name,
      owner,
      branch: detectedBranch,
      commitHash,
      languages,
      totalFiles: files.length,
      totalLoc,
      analyzedAt: new Date().toISOString(),
      status: 'complete',
      progressPercent: 100,
      statusMessage: 'Ready',
      pipelineStages: [],
    };

    return { repoDir, metadata };
  }

  /**
   * Scan directory recursively with safety filters
   */
  public scanDirectory(dirPath: string, maxFiles: number = 2000): FileEntry[] {
    const results: FileEntry[] = [];

    const walk = (currentDir: string) => {
      if (results.length >= maxFiles) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (err) {
        return;
      }

      for (const entry of entries) {
        if (results.length >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(dirPath, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          if (IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (IGNORED_EXTENSIONS.has(ext)) {
            continue;
          }

          const language = EXTENSION_LANGUAGE_MAP[ext] || 'other';

          try {
            const stats = fs.statSync(fullPath);
            // Skip large minified/binary files > 1.5MB
            if (stats.size > 1.5 * 1024 * 1024) continue;

            const content = fs.readFileSync(fullPath, 'utf8');
            const linesOfCode = content.split('\n').length;

            results.push({
              relativePath: relPath,
              absolutePath: fullPath,
              extension: ext,
              language,
              sizeBytes: stats.size,
              linesOfCode,
              content,
            });
          } catch (readErr) {
            // skip unreadable file
          }
        }
      }
    };

    walk(dirPath);
    return results;
  }

  private calculateStats(files: FileEntry[]): { languages: Record<string, number>; totalLoc: number } {
    const languages: Record<string, number> = {};
    let totalLoc = 0;

    for (const f of files) {
      totalLoc += f.linesOfCode;
      if (f.language !== 'other') {
        languages[f.language] = (languages[f.language] || 0) + f.linesOfCode;
      }
    }

    return { languages, totalLoc };
  }
}

export const defaultRepoManager = new RepoManager();
