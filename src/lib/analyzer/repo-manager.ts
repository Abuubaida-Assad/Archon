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
  public parseRepoUrl(rawUrl: string): { owner: string; name: string; cleanUrl: string; isLocal: boolean; branch?: string } {
    let trimmed = rawUrl.trim();

    // Strip trailing slashes
    trimmed = trimmed.replace(/\/+$/, '');

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
      // Not a local directory
    }

    // SSH format: git@github.com:owner/repo.git
    const sshMatch = trimmed.match(/^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/i);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        name: sshMatch[2],
        cleanUrl: `https://github.com/${sshMatch[1]}/${sshMatch[2]}`,
        isLocal: false,
      };
    }

    // Support /tree/<branch> URL: github.com/owner/repo/tree/develop
    const treeMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)/i);
    if (treeMatch) {
      const cleanName = treeMatch[2].replace(/\.git$/i, '');
      return {
        owner: treeMatch[1],
        name: cleanName,
        cleanUrl: `https://github.com/${treeMatch[1]}/${cleanName}`,
        branch: treeMatch[3],
        isLocal: false,
      };
    }

    // Support PR URL: github.com/owner/repo/pull/123
    const prMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/pull\/\d+/i);
    if (prMatch) {
      const cleanName = prMatch[2].replace(/\.git$/i, '');
      return {
        owner: prMatch[1],
        name: cleanName,
        cleanUrl: `https://github.com/${prMatch[1]}/${cleanName}`,
        isLocal: false,
      };
    }

    // Standard github.com/owner/repo format (handles optional .git and subpaths)
    const githubMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/i);
    if (githubMatch) {
      const cleanName = githubMatch[2].replace(/\.git$/i, '');
      return {
        owner: githubMatch[1],
        name: cleanName,
        cleanUrl: `https://github.com/${githubMatch[1]}/${cleanName}`,
        isLocal: false,
      };
    }

    // Shorthand owner/repo format (e.g. facebook/react, aadhira636/FlashCardsApp)
    const shorthandMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shorthandMatch) {
      const cleanName = shorthandMatch[2].replace(/\.git$/i, '');
      return {
        owner: shorthandMatch[1],
        name: cleanName,
        cleanUrl: `https://github.com/${shorthandMatch[1]}/${cleanName}`,
        isLocal: false,
      };
    }

    // Generic git host
    const genericMatch = trimmed.match(/(?:https?:\/\/)?([^\/]+)\/([^\/]+)\/([^\/]+)/i);
    if (genericMatch) {
      const cleanName = genericMatch[3].replace(/\.git$/i, '');
      return {
        owner: genericMatch[2],
        name: cleanName,
        cleanUrl: trimmed.startsWith('http') ? trimmed.replace(/\.git$/i, '') : `https://${trimmed.replace(/\.git$/i, '')}`,
        isLocal: false,
      };
    }

    throw new Error(`Invalid repository URL: "${rawUrl}". Please provide a valid GitHub repository URL (e.g. "https://github.com/owner/repo") or enter owner/repo.`);
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
   * Helper to sanitize any error message to guarantee no tokens/credentials leak
   */
  public sanitizeError(msg: string): string {
    if (!msg) return 'An error occurred during repository acquisition.';
    return msg
      .replace(/ghp_[a-zA-Z0-9_-]+/g, '[REDACTED]')
      .replace(/github_pat_[a-zA-Z0-9_.-]+/g, '[REDACTED]')
      .replace(/x-access-token:[^@]+@/g, '')
      .replace(/Authorization:\s*[^\s,]+/gi, 'Authorization: [REDACTED]')
      .replace(/https:\/\/[^:]+:[^@]+@/g, 'https://');
  }

  /**
   * Download and unpack GitHub Zipball when git binary is not present (Universal & Private Repos)
   */
  private async downloadGitHubZip(
    owner: string,
    name: string,
    targetDir: string,
    branch?: string,
    token?: string
  ): Promise<string> {
    let zipBuffer: Buffer | null = null;
    const cleanToken = token ? token.trim() : '';

    // Strategy 1: Authenticated GitHub API (For Private Repositories & Elevated Limits)
    if (cleanToken) {
      const authVariants = [
        `Bearer ${cleanToken}`,
        `token ${cleanToken}`,
      ];

      for (const authHeader of authVariants) {
        if (zipBuffer) break;

        const targetRef = branch && branch !== 'default' ? branch : '';
        const zipUrl = targetRef
          ? `https://api.github.com/repos/${owner}/${name}/zipball/${targetRef}`
          : `https://api.github.com/repos/${owner}/${name}/zipball`;

        try {
          const res = await fetch(zipUrl, {
            headers: {
              'User-Agent': 'Archon-Architecture-Intelligence',
              Accept: 'application/vnd.github+json',
              Authorization: authHeader,
              'X-GitHub-Api-Version': '2022-11-28',
            },
            redirect: 'manual',
          });

          if (res.status === 302 || res.status === 301) {
            const redirectUrl = res.headers.get('location');
            if (redirectUrl) {
              const s3Res = await fetch(redirectUrl, {
                headers: { 'User-Agent': 'Archon-Architecture-Intelligence' },
                redirect: 'follow',
              });
              if (s3Res.ok) {
                const arrayBuffer = await s3Res.arrayBuffer();
                zipBuffer = Buffer.from(arrayBuffer);
                break;
              }
            }
          } else if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            zipBuffer = Buffer.from(arrayBuffer);
            break;
          }
        } catch {
          // Continue to next auth variant
        }
      }
    }

    // Strategy 2: Direct public codeload archive (For public repos)
    if (!zipBuffer) {
      const candidateUrls: string[] = [];
      if (branch && branch !== 'default') {
        candidateUrls.push(`https://codeload.github.com/${owner}/${name}/zip/refs/heads/${branch}`);
      }
      candidateUrls.push(`https://codeload.github.com/${owner}/${name}/zip/HEAD`);
      candidateUrls.push(`https://codeload.github.com/${owner}/${name}/zip/refs/heads/main`);
      candidateUrls.push(`https://codeload.github.com/${owner}/${name}/zip/refs/heads/master`);

      for (const url of candidateUrls) {
        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Archon' },
            redirect: 'follow',
          });
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            zipBuffer = Buffer.from(arrayBuffer);
            break;
          }
        } catch {
          // Continue to next candidate
        }
      }
    }

    if (!zipBuffer) {
      if (cleanToken) {
        throw new Error('GitHub repository not found. Check the repository URL and token permissions.');
      } else {
        throw new Error(
          'GitHub repository not found or requires authentication. If this repository is private, please provide a GitHub Personal Access Token.'
        );
      }
    }

    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    if (zipEntries.length === 0) {
      throw new Error(`Downloaded repository archive for ${owner}/${name} was empty.`);
    }

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
    token?: string,
    isPrivate?: boolean
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

      const cleanToken = token ? token.trim() : '';
      if (isPrivate && !cleanToken) {
        throw new Error('A GitHub Personal Access Token is required for private repositories.');
      }

      let gitSucceeded = false;

      // Strategy 1: Git clone with HTTP ExtraHeader (Clean, header-based auth)
      try {
        const git: SimpleGit = simpleGit();
        const cloneOptions = ['--depth', '1', '--single-branch', '--no-tags'];
        if (branch && branch !== 'default') {
          cloneOptions.push('--branch', branch);
        }

        if (cleanToken) {
          const basicAuth = Buffer.from(`x-access-token:${cleanToken}`).toString('base64');
          cloneOptions.push('-c', `http.extraheader=Authorization: Basic ${basicAuth}`);
        }

        await git.clone(cleanUrl, repoDir, cloneOptions);
        gitSucceeded = true;
      } catch (err1) {
        // Continue to Strategy 2
      }

      // Strategy 2: Git clone with URL-embedded credentials (Fallback for older git environments, then origin is sanitized)
      if (!gitSucceeded && cleanToken) {
        try {
          if (fs.existsSync(repoDir)) {
            fs.rmSync(repoDir, { recursive: true, force: true });
          }

          const git: SimpleGit = simpleGit();
          const cloneOptions = ['--depth', '1', '--single-branch', '--no-tags'];
          if (branch && branch !== 'default') {
            cloneOptions.push('--branch', branch);
          }

          const authUrl = `https://x-access-token:${encodeURIComponent(cleanToken)}@github.com/${owner}/${name}.git`;
          await git.clone(authUrl, repoDir, cloneOptions);
          gitSucceeded = true;

          // Immediately scrub token from .git/config remote url
          try {
            const clonedGit = simpleGit(repoDir);
            await clonedGit.remote(['set-url', 'origin', `https://github.com/${owner}/${name}.git`]);
          } catch {}
        } catch (err2) {
          // Continue to Strategy 3 (Zipball)
        }
      }

      if (gitSucceeded) {
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
      }

      // Strategy 3: Authenticated GitHub API Zipball Archive Download (For environments without git binary)
      if (!gitSucceeded) {
        if (fs.existsSync(repoDir)) {
          fs.rmSync(repoDir, { recursive: true, force: true });
        }
        onProgress?.(`Downloading repository archive for ${owner}/${name}`, 25);
        finalRepoDir = await this.downloadGitHubZip(owner, name, repoDir, branch, cleanToken);
      }
    } else {
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
