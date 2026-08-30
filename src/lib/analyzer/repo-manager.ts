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
      // Not a local directory
    }

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

    // Shorthand owner/repo format (e.g. facebook/react, aadhira636/FlashCardsApp)
    const shorthandMatch = cleanUrl.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shorthandMatch) {
      return {
        owner: shorthandMatch[1],
        name: shorthandMatch[2].replace(/\/$/, ''),
        cleanUrl: `https://github.com/${shorthandMatch[1]}/${shorthandMatch[2].replace(/\/$/, '')}`,
        isLocal: false,
      };
    }

    // Generic git host
    const genericMatch = cleanUrl.match(/(?:https?:\/\/)?([^\/]+)\/([^\/]+)\/([^\/]+)/i);
    if (genericMatch) {
      return {
        owner: genericMatch[2],
        name: genericMatch[3].replace(/\/$/, ''),
        cleanUrl: cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`,
        isLocal: false,
      };
    }

    throw new Error(`Invalid repository URL: "${rawUrl}". Please provide a valid GitHub repository (e.g. "aadhira636/FlashCardsApp" or "https://github.com/owner/repo") or open a local folder.`);
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
   * Validate GitHub Token and verify repository access before performing analysis
   */
  public async validateGitHubAccess(
    owner: string,
    name: string,
    token?: string,
    isPrivate?: boolean
  ): Promise<{ isValid: boolean; defaultBranch?: string; isPrivateRepo?: boolean }> {
    const cleanToken = token ? token.trim() : '';

    if (isPrivate && !cleanToken) {
      throw new Error('A GitHub Personal Access Token is required for private repositories.');
    }

    if (cleanToken) {
      // Step 1: Verify that the token itself is valid with GitHub
      try {
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            'User-Agent': 'Archon-Architecture-Intelligence',
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${cleanToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (userRes.status === 401) {
          throw new Error('GitHub authentication failed. Please check your token.');
        }
      } catch (err: any) {
        if (err.message && err.message.includes('GitHub authentication failed')) {
          throw err;
        }
        // If network error to GitHub API, continue to repo check
      }

      // Step 2: Verify that the token has permission to access the specific repository
      try {
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
          headers: {
            'User-Agent': 'Archon-Architecture-Intelligence',
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${cleanToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (repoRes.status === 401) {
          throw new Error('GitHub authentication failed. Please check your token.');
        } else if (repoRes.status === 404) {
          throw new Error('GitHub repository not found. Check the repository URL and token permissions.');
        } else if (repoRes.status === 403) {
          throw new Error('Your token does not have access to this repository.');
        } else if (repoRes.ok) {
          const repoData = await repoRes.json().catch(() => ({}));
          return {
            isValid: true,
            defaultBranch: repoData.default_branch || 'main',
            isPrivateRepo: repoData.private ?? isPrivate,
          };
        }
      } catch (err: any) {
        if (
          err.message &&
          (err.message.includes('GitHub authentication failed') ||
            err.message.includes('GitHub repository not found') ||
            err.message.includes('Your token does not have access'))
        ) {
          throw err;
        }
      }
    }

    return { isValid: true };
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

    // Strategy 1: Authenticated GitHub API (For Private Repositories)
    if (cleanToken) {
      const targetRef = branch && branch !== 'default' ? branch : '';
      const zipUrl = targetRef
        ? `https://api.github.com/repos/${owner}/${name}/zipball/${targetRef}`
        : `https://api.github.com/repos/${owner}/${name}/zipball`;

      try {
        const res = await fetch(zipUrl, {
          headers: {
            'User-Agent': 'Archon-Architecture-Intelligence',
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${cleanToken}`,
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
            }
          }
        } else if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          zipBuffer = Buffer.from(arrayBuffer);
        } else if (res.status === 401) {
          throw new Error('GitHub authentication failed. Please check your token.');
        } else if (res.status === 404) {
          throw new Error('GitHub repository not found. Check the repository URL and token permissions.');
        } else if (res.status === 403) {
          throw new Error('Your token does not have access to this repository.');
        }
      } catch (err: any) {
        if (
          err.message &&
          (err.message.includes('GitHub authentication failed') ||
            err.message.includes('GitHub repository not found') ||
            err.message.includes('Your token does not have access'))
        ) {
          throw err;
        }
      }
    }

    // Strategy 2: Direct public codeload.github.com archive (For public repos)
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
        throw new Error('Unable to clone the repository. Please verify the repository URL and GitHub access.');
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

    // Pre-validate token & permissions if token provided or private repo indicated
    const cleanToken = token ? token.trim() : '';
    if (cleanToken || isPrivate) {
      const accessInfo = await this.validateGitHubAccess(owner, name, cleanToken, isPrivate);
      if (accessInfo.defaultBranch && (!branch || branch === 'default')) {
        detectedBranch = accessInfo.defaultBranch;
      }
    }

    // Remote Git Acquisition
    let finalRepoDir = repoDir;

    if (!fs.existsSync(repoDir) || fs.readdirSync(repoDir).length === 0) {
      onProgress?.(`Acquiring repository ${owner}/${name}`, 20);

      let gitSucceeded = false;

      try {
        const git: SimpleGit = simpleGit();
        const cloneOptions = ['--depth', '1', '--single-branch', '--no-tags'];
        if (branch && branch !== 'default') {
          cloneOptions.push('--branch', branch);
        }

        // Secure Git Authentication: Pass token securely via HTTP extraheader (No tokens in URL or .git/config)
        if (cleanToken) {
          const basicAuth = Buffer.from(`x-access-token:${cleanToken}`).toString('base64');
          cloneOptions.push('-c', `http.extraheader=Authorization: Basic ${basicAuth}`);
        }

        await git.clone(cleanUrl, repoDir, cloneOptions);
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
        // Fall back to HTTPS zipball if git binary failed or clone had issues
      }

      // Attempt 2: Direct HTTP Archive Download (Universal fallback)
      if (!gitSucceeded) {
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
