import fs from 'fs';
import path from 'path';
import { ArchitectureSummary } from '@/types';

export class CacheStore {
  private memoryCache = new Map<string, ArchitectureSummary>();
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(process.cwd(), 'data', 'cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  public get(repoId: string): ArchitectureSummary | null {
    if (this.memoryCache.has(repoId)) {
      return this.memoryCache.get(repoId)!;
    }

    const filePath = path.join(this.cacheDir, `${repoId}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw) as ArchitectureSummary;
        this.memoryCache.set(repoId, parsed);
        return parsed;
      } catch (err) {
        console.warn(`[CacheStore] Failed to read cached file for ${repoId}:`, err);
      }
    }

    return null;
  }

  public set(repoId: string, data: ArchitectureSummary): void {
    this.memoryCache.set(repoId, data);
    const filePath = path.join(this.cacheDir, `${repoId}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[CacheStore] Failed to write cache for ${repoId}:`, err);
    }
  }

  public listAll(): ArchitectureSummary[] {
    const results: ArchitectureSummary[] = Array.from(this.memoryCache.values());

    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      for (const f of files) {
        if (f.endsWith('.json')) {
          const repoId = f.replace('.json', '');
          if (!this.memoryCache.has(repoId)) {
            const cached = this.get(repoId);
            if (cached) results.push(cached);
          }
        }
      }
    }

    return results;
  }
}

export const defaultCacheStore = new CacheStore();
