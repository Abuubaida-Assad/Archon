import { ArchitectureLayer, NodeType } from '@/types';
import { ExtractedFileAnalysis } from './js-ts-parser';

export class ArchitectureInferrer {
  /**
   * Infer layer for a specific file based on path, imports, and content patterns
   */
  public inferFileLayer(analysis: ExtractedFileAnalysis): ArchitectureLayer {
    const p = analysis.file.relativePath.toLowerCase();

    // Test Layer
    if (analysis.isTestFile || p.includes('/tests/') || p.includes('/test/') || p.includes('/__tests__/')) {
      return 'test';
    }

    // Infrastructure / Config Layer
    if (
      p.endsWith('dockerfile') ||
      p.includes('docker-compose') ||
      p.includes('.github/') ||
      p.includes('/k8s/') ||
      p.includes('/terraform/') ||
      p.endsWith('.config.js') ||
      p.endsWith('.config.ts') ||
      p.endsWith('.config.mjs') ||
      p.endsWith('.env.example')
    ) {
      return 'infra';
    }

    // Database Layer
    if (
      p.includes('/database/') ||
      p.includes('/models/') ||
      p.includes('/entities/') ||
      p.includes('/schema') ||
      p.includes('/prisma/') ||
      p.includes('/migrations/') ||
      p.includes('/repositories/') ||
      analysis.dbOperations.length > 0
    ) {
      return 'database';
    }

    // API / Controller Layer
    if (
      p.includes('/api/') ||
      p.includes('/routes/') ||
      p.includes('/controllers/') ||
      p.includes('/endpoints/') ||
      p.includes('/graphql/') ||
      p.includes('/resolvers/') ||
      analysis.apis.length > 0
    ) {
      return 'api';
    }

    // Queue / Worker Layer
    if (
      p.includes('/worker') ||
      p.includes('/queue') ||
      p.includes('/jobs/') ||
      p.includes('/consumers/') ||
      p.includes('/events/') ||
      analysis.events.length > 0
    ) {
      return 'queue';
    }

    // Frontend Layer
    if (
      p.includes('/components/') ||
      p.includes('/views/') ||
      p.includes('/pages/') ||
      p.includes('/app/') && !p.includes('/api/') ||
      p.includes('/styles/') ||
      p.includes('/hooks/') ||
      p.includes('/ui/') ||
      analysis.file.extension === '.tsx' ||
      analysis.file.extension === '.jsx'
    ) {
      return 'frontend';
    }

    // Service / Business Logic Layer
    if (
      p.includes('/services/') ||
      p.includes('/domain/') ||
      p.includes('/core/') ||
      p.includes('/usecases/') ||
      p.includes('/managers/') ||
      p.includes('/logic/')
    ) {
      return 'service';
    }

    // Utility / Helper Layer
    if (
      p.includes('/utils/') ||
      p.includes('/helpers/') ||
      p.includes('/lib/') ||
      p.includes('/shared/') ||
      p.includes('/common/')
    ) {
      return 'util';
    }

    return 'service';
  }

  /**
   * Infer higher level service groups from project structure
   */
  public inferServices(analyses: ExtractedFileAnalysis[]): Array<{
    id: string;
    name: string;
    path: string;
    layer: ArchitectureLayer;
    filePaths: string[];
  }> {
    const serviceMap = new Map<string, { name: string; path: string; files: string[]; layer: ArchitectureLayer }>();

    for (const a of analyses) {
      const relPath = a.file.relativePath;
      const parts = relPath.split('/');

      // Monorepo packages/ or apps/ or services/ detection
      if (parts.length >= 2 && (parts[0] === 'packages' || parts[0] === 'apps' || parts[0] === 'services' || parts[0] === 'modules')) {
        const serviceKey = `${parts[0]}/${parts[1]}`;
        const existing = serviceMap.get(serviceKey);
        const layer = this.inferFileLayer(a);
        if (existing) {
          existing.files.push(relPath);
        } else {
          serviceMap.set(serviceKey, {
            name: parts[1],
            path: serviceKey,
            files: [relPath],
            layer,
          });
        }
        continue;
      }

      // Feature-based or domain-based grouping (e.g. src/payment, src/auth, src/orders)
      if (parts.length >= 2 && parts[0] === 'src') {
        const domainName = parts[1];
        if (['services', 'api', 'controllers', 'modules', 'features', 'domain'].includes(domainName) && parts.length >= 3) {
          const featureName = parts[2].replace(/\.[^.]+$/, '');
          const serviceKey = `src/${domainName}/${parts[2]}`;
          const existing = serviceMap.get(serviceKey);
          const layer = this.inferFileLayer(a);
          if (existing) {
            existing.files.push(relPath);
          } else {
            serviceMap.set(serviceKey, {
              name: `${featureName} (${domainName})`,
              path: serviceKey,
              files: [relPath],
              layer,
            });
          }
        }
      }
    }

    return Array.from(serviceMap.entries()).map(([id, data]) => ({
      id: `svc:${id}`,
      name: data.name,
      path: data.path,
      layer: data.layer,
      filePaths: data.files,
    }));
  }
}

export const defaultArchitectureInferrer = new ArchitectureInferrer();
