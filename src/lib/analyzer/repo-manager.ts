import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import simpleGit, { SimpleGit } from 'simple-git';
import AdmZip from 'adm-zip';
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
    // On Vercel / serverless, only os.tmpdir() is writable. Never use process.cwd()!
    this.baseStorageDir = storageDir || path.join(os.tmpdir(), 'archon-repos');
    try {
      if (!fs.existsSync(this.baseStorageDir)) {
        fs.mkdirSync(this.baseStorageDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[RepoManager] Warning creating base directory:', err);
    }
  }

  /**
   * Parse repository URL and extract metadata
   */
  public parseRepoUrl(rawUrl: string): { owner: string; name: string; cleanUrl: string; isLocal: boolean } {
    const trimmed = rawUrl.trim();

    // Check if it's a local filesystem path
    try {
      if (fs.existsSync(trimmed) && fs.statSync(trimmed).isDirectory()) {
        const name = path.basename(trimmed);
        return {
          owner: 'local',
          name,
          cleanUrl: trimmed,
          isLocal: true,
        };
      }
    } catch {
      // Not a local directory or inaccessible
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
   * Download and unpack GitHub Zipball when git binary is not present (Vercel Serverless)
   */
  private async downloadGitHubZip(
    owner: string,
    name: string,
    targetDir: string,
    branch?: string,
    token?: string
  ): Promise<string> {
    const headers: Record<string, string> = {
      'User-Agent': 'Archon-Architecture-Intelligence',
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // Attempt 1: Fetch via GitHub zipball endpoint
    const targetRef = branch && branch !== 'default' ? branch : 'HEAD';
    const zipUrl = `https://api.github.com/repos/${owner}/${name}/zipball/${targetRef}`;

    let response = await fetch(zipUrl, { headers, redirect: 'follow' });

    // If API endpoint fails or rate-limited without token, fallback to codeload archive
    if (!response.ok) {
      const fallbackUrl = `https://github.com/${owner}/${name}/archive/refs/heads/${branch || 'main'}.zip`;
      response = await fetch(fallbackUrl, { headers: { 'User-Agent': 'Archon' } });
      if (!response.ok) {
        const masterFallback = `https://github.com/${owner}/${name}/archive/refs/heads/master.zip`;
        response = await fetch(masterFallback, { headers: { 'User-Agent': 'Archon' } });
      }
    }

    if (!response.ok) {
      throw new Error(`Failed to download repository archive from GitHub (HTTP ${response.status}: ${response.statusText}). If this is a private repository, please add a GitHub Token.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract zip in memory into targetDir
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    if (zipEntries.length === 0) {
      throw new Error(`Downloaded repository archive for ${owner}/${name} was empty.`);
    }

    // GitHub zip archives have a root container folder (e.g. "owner-repo-sha123/"). Strip it.
    const rootDirName = zipEntries[0].entryName.split('/')[0];
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    zip.extractAllTo(targetDir, true);

    const extractedRoot = path.join(targetDir, rootDirName);
    if (fs.existsSync(extractedRoot) && fs.statSync(extractedRoot).isDirectory()) {
      return extractedRoot;
    }

    return targetDir;
  }

  /**
   * Clone or update repository into sandbox (Universal Serverless + Git fallback)
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

    // Remote Git Acquisition
    let finalRepoDir = repoDir;

    if (!fs.existsSync(repoDir) || fs.readdirSync(repoDir).length === 0) {
      onProgress?.(`Acquiring repository ${owner}/${name}`, 20);

      // First attempt standard git clone
      let gitSucceeded = false;
      try {
        const git: SimpleGit = simpleGit();
        const cloneOptions = ['--depth', '1', '--single-branch', '--no-tags'];
        if (branch && branch !== 'default') {
          cloneOptions.push('--branch', branch);
        }

        let cloneUrl = cleanUrl;
        if (token) {
          cloneUrl = `https://${token}@github.com/${owner}/${name}.git`;
        }

        await git.clone(cloneUrl, repoDir, cloneOptions);
        gitSucceeded = true;

        try {
          const clonedGit: SimpleGit = simpleGit(repoDir);
          const log = await clonedGit.log({ maxCount: 1 });
          if (log.latest) {
            commitHash = log.latest.hash.substring(0, 8);
          }
          const b = await clonedGit.branch();
          detectedBranch = b.current || branch || 'main';
        } catch {
          commitHash = 'head';
        }
      } catch (cloneErr: any) {
        console.warn(`[RepoManager] Git clone failed or not available on serverless, falling back to GitHub Archive ZIP:`, cloneErr?.message || cloneErr);
      }

      // If git clone failed or git is missing in serverless environment, download zipball via HTTPS
      if (!gitSucceeded) {
        onProgress?.(`Downloading repository archive for ${owner}/${name}`, 25);
        finalRepoDir = await this.downloadGitHubZip(owner, name, repoDir, branch, token);
      }
    } else {
      // Use cached repository in /tmp
      finalRepoDir = repoDir;
      const subEntries = fs.readdirSync(repoDir);
      if (subEntries.length === 1 && fs.statSync(path.join(repoDir, subEntries[0])).isDirectory()) {
        finalRepoDir = path.join(repoDir, subEntries[0]);
      }
    }

    onProgress?.('Scanning repository files and index', 40);
    const files = this.scanDirectory(finalRepoDir);

    if (files.length === 0) {
      throw new Error(`No parsable code files found in repository "${owner}/${name}".`);
    }

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

    return { repoDir: finalRepoDir, metadata };
  }

  /**
   * Recursively scan directory and extract parsable files
   */
  public scanDirectory(dir: string, baseDir: string = dir, maxFiles: number = 400): FileEntry[] {
    const files: FileEntry[] = [];

    const traverse = (currentDir: string) => {
      if (files.length >= maxFiles) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (files.length >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          if (IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          traverse(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (IGNORED_EXTENSIONS.has(ext)) continue;

          const language = EXTENSION_LANGUAGE_MAP[ext] || 'other';
          if (language === 'other' && !ext.match(/\.(ts|js|py|json|md|yaml|yml|sql)$/i)) {
            continue;
          }

          try {
            const stats = fs.statSync(fullPath);
            if (stats.size > 500 * 1024) continue; // Skip files > 500KB

            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n').length;

            files.push({
              relativePath: relPath,
              absolutePath: fullPath,
              name: entry.name,
              extension: ext,
              language,
              sizeBytes: stats.size,
              linesOfCode: lines,
              content,
            });
          } catch {
            // Ignore unreadable files
          }
        }
      }
    };

    traverse(dir);
    return files;
  }

  /**
   * Calculate language breakdown and total LOC
   */
  public calculateStats(files: FileEntry[]): { languages: Record<string, number>; totalLoc: number } {
    const langLoc: Record<string, number> = {};
    let totalLoc = 0;

    for (const f of files) {
      langLoc[f.language] = (langLoc[f.language] || 0) + f.linesOfCode;
      totalLoc += f.linesOfCode;
    }

    const percentages: Record<string, number> = {};
    if (totalLoc > 0) {
      for (const [lang, loc] of Object.entries(langLoc)) {
        percentages[lang] = Math.round((loc / totalLoc) * 100);
      }
    }

    return { languages: percentages, totalLoc };
  }
}

export const defaultRepoManager = new RepoManager();
