import { NextResponse } from 'next/server';
import { getSampleRepositories } from '@/lib/sample-repos';
import { defaultCacheStore } from '@/lib/storage/cache-store';

export async function GET() {
  const samples = getSampleRepositories();
  const cachedRepos = defaultCacheStore.listAll().map((s) => ({
    id: s.repository.id,
    name: s.repository.name,
    url: s.repository.url,
    totalFiles: s.repository.totalFiles,
    totalLoc: s.repository.totalLoc,
    analyzedAt: s.repository.analyzedAt,
    stats: s.stats,
  }));

  return NextResponse.json({
    success: true,
    samples,
    cachedRepos,
  });
}
