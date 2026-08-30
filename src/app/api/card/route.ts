import { NextRequest, NextResponse } from 'next/server';
import { defaultCacheStore } from '@/lib/storage/cache-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('id') || searchParams.get('repo');
  const style = searchParams.get('style') || 'detailed';
  const theme = searchParams.get('theme') || 'dark';

  let summary = repoId ? defaultCacheStore.get(repoId) : null;

  // Fallback defaults if no ID is passed or not yet in memory
  const repoName = summary?.repository?.name || 'Archon Project';
  const branch = summary?.repository?.branch || 'main';
  const grade = summary?.health?.grade || 'A';
  const overallScore = summary?.health?.overallScore || 92;
  const maintainability = summary?.health?.maintainability || 94;
  const reliability = summary?.health?.reliability || 90;
  const security = summary?.health?.security || 95;
  const fragility = summary?.health?.fragility || 12;
  const deadCodePercent = summary?.health?.deadCodePercent || 4;
  const circularCount = summary?.health?.circularDependenciesCount || 0;
  const filesCount = summary?.stats?.modulesCount || 42;
  const edgesCount = summary?.stats?.totalEdges || 118;
  const scaleGrade = summary?.health?.scaleGrade || 'Medium';

  const isDark = theme !== 'light';
  const bgFill = theme === 'cyberpunk' ? '#0f172a' : theme === 'emerald' ? '#064e3b' : isDark ? '#0b0f19' : '#ffffff';
  const cardBorder = theme === 'cyberpunk' ? '#06b6d4' : theme === 'emerald' ? '#10b981' : isDark ? '#1e293b' : '#e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accentColor = theme === 'cyberpunk' ? '#06b6d4' : theme === 'emerald' ? '#10b981' : '#38bdf8';
  const gradeColor = grade.startsWith('A') ? '#10b981' : grade === 'B' ? '#06b6d4' : '#f59e0b';

  let svg = '';

  if (style === 'badge') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="48" viewBox="0 0 320 48" fill="none">
  <rect width="320" height="48" rx="8" fill="${bgFill}" stroke="${cardBorder}" stroke-width="1.5"/>
  <text x="16" y="29" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13">Archon Grade</text>
  <rect x="145" y="10" width="36" height="28" rx="6" fill="${gradeColor}22" stroke="${gradeColor}" stroke-width="1"/>
  <text x="163" y="29" fill="${gradeColor}" font-family="monospace" font-weight="800" font-size="14" text-anchor="middle">${grade}</text>
  <text x="195" y="29" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="12">${filesCount} files · ${scaleGrade}</text>
</svg>`;
  } else if (style === 'compact') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="130" viewBox="0 0 480 130" fill="none">
  <rect width="480" height="130" rx="12" fill="${bgFill}" stroke="${cardBorder}" stroke-width="1.5"/>
  <text x="24" y="36" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16">${repoName}</text>
  <text x="24" y="56" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="12">Archon Architectural Health · Scale: ${scaleGrade}</text>
  <rect x="390" y="24" width="66" height="66" rx="12" fill="${gradeColor}18" stroke="${gradeColor}" stroke-width="1.5"/>
  <text x="423" y="66" fill="${gradeColor}" font-family="monospace" font-weight="800" font-size="28" text-anchor="middle">${grade}</text>
  <text x="24" y="98" fill="${textMuted}" font-family="monospace" font-size="12">Files: <tspan fill="${accentColor}" font-weight="700">${filesCount}</tspan>   Deps: <tspan fill="${accentColor}" font-weight="700">${edgesCount}</tspan>   Dead: <tspan fill="${textPrimary}" font-weight="700">${deadCodePercent}%</tspan>   Fragility: <tspan fill="${textPrimary}" font-weight="700">${fragility}%</tspan></text>
</svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="220" viewBox="0 0 560 220" fill="none">
  <rect width="560" height="220" rx="16" fill="${bgFill}" stroke="${cardBorder}" stroke-width="1.5"/>
  <text x="28" y="38" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="18">${repoName}</text>
  <text x="28" y="58" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="12">Archon Architecture Intelligence · ${branch}</text>
  <rect x="450" y="24" width="80" height="80" rx="14" fill="${gradeColor}18" stroke="${gradeColor}" stroke-width="1.5"/>
  <text x="490" y="74" fill="${gradeColor}" font-family="monospace" font-weight="900" font-size="34" text-anchor="middle">${grade}</text>
  <text x="490" y="93" fill="${gradeColor}" font-family="monospace" font-weight="600" font-size="10" text-anchor="middle">${overallScore}/100</text>
  <text x="28" y="104" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Maintainability</text>
  <text x="130" y="104" fill="${accentColor}" font-family="monospace" font-weight="700" font-size="11">${maintainability}%</text>
  <rect x="28" y="112" width="130" height="6" rx="3" fill="${cardBorder}"/>
  <rect x="28" y="112" width="${Math.round(130 * (maintainability / 100))}" height="6" rx="3" fill="${accentColor}"/>
  <text x="180" y="104" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Reliability</text>
  <text x="280" y="104" fill="#10b981" font-family="monospace" font-weight="700" font-size="11">${reliability}%</text>
  <rect x="180" y="112" width="130" height="6" rx="3" fill="${cardBorder}"/>
  <rect x="180" y="112" width="${Math.round(130 * (reliability / 100))}" height="6" rx="3" fill="#10b981"/>
  <text x="330" y="104" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Security</text>
  <text x="400" y="104" fill="#c084fc" font-family="monospace" font-weight="700" font-size="11">${security}%</text>
  <rect x="330" y="112" width="90" height="6" rx="3" fill="${cardBorder}"/>
  <rect x="330" y="112" width="${Math.round(90 * (security / 100))}" height="6" rx="3" fill="#c084fc"/>
  <line x1="28" y1="145" x2="532" y2="145" stroke="${cardBorder}" stroke-width="1"/>
  <text x="28" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Files: <tspan fill="${textPrimary}" font-weight="700">${filesCount}</tspan></text>
  <text x="120" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Dependencies: <tspan fill="${textPrimary}" font-weight="700">${edgesCount}</tspan></text>
  <text x="240" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Cycles: <tspan fill="${circularCount > 0 ? '#f43f5e' : textPrimary}" font-weight="700">${circularCount}</tspan></text>
  <text x="330" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Dead Code: <tspan fill="${textPrimary}" font-weight="700">${deadCodePercent}%</tspan></text>
  <text x="435" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Fragility: <tspan fill="${textPrimary}" font-weight="700">${fragility}%</tspan></text>
  <text x="28" y="200" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="10">Generated by Archon</text>
</svg>`;
  }

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    },
  });
}
