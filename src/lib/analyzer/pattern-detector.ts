import { ArchEdge, ArchNode, PatternFinding } from '@/types';
import { ExtractedFileAnalysis } from './js-ts-parser';

export class PatternDetector {
  /**
   * Detect architectural design patterns and anti-patterns within the codebase graph
   */
  public detectPatterns(analyses: ExtractedFileAnalysis[], nodes: ArchNode[], edges: ArchEdge[]): PatternFinding[] {
    const patterns: PatternFinding[] = [];
    let idCounter = 1;

    // 1. Detect God Objects / Brain Classes (High LOC, High Centrality, High Outgoing)
    for (const node of nodes) {
      if (node.type === 'config' || node.type === 'test') continue;

      const isHighLoc = (node.loc || 0) > 400;
      const isHighOutgoing = node.metrics.outgoingCount >= 8;
      const isHighCentrality = (node.metrics.centrality || 0) > 0.4;

      if ((isHighLoc && isHighOutgoing) || (isHighOutgoing && isHighCentrality)) {
        patterns.push({
          id: `pat-${idCounter++}`,
          type: 'god_object',
          category: 'anti_pattern',
          name: `God Object Anti-Pattern (${node.name})`,
          description: `${node.name} handles too many responsibilities (${node.metrics.outgoingCount} dependencies, ${(node.loc || 0)} LOC). This creates a single point of failure and makes maintenance difficult.`,
          file: node.path,
          line: node.line || 1,
          snippet: node.codeSnippet,
          nodeId: node.id,
        });
      }
    }

    // 2. Detect Singleton / Context Provider Patterns
    for (const node of nodes) {
      const name = node.name.toLowerCase();
      if (name.includes('context') || name.includes('provider')) {
        patterns.push({
          id: `pat-${idCounter++}`,
          type: 'context_provider',
          category: 'design_pattern',
          name: `Context Provider (${node.name})`,
          description: `Shares global state and dependencies cleanly across the component tree.`,
          file: node.path,
          line: node.line || 1,
          nodeId: node.id,
        });
      } else if (name.endsWith('factory') || (name.startsWith('create') && node.type === 'function')) {
        patterns.push({
          id: `pat-${idCounter++}`,
          type: 'factory',
          category: 'design_pattern',
          name: `Factory Pattern (${node.name})`,
          description: `Encapsulates instance creation logic cleanly away from consumer modules.`,
          file: node.path,
          line: node.line || 1,
          nodeId: node.id,
        });
      }
    }

    // 3. Anti-Pattern: True Dead / Orphaned Code Detection
    // Strict filtering so valid entrypoints, routes, configs, and types are NEVER false-positived
    const incomingEdgeCountMap = new Map<string, number>();
    edges.forEach((edge) => {
      incomingEdgeCountMap.set(edge.target, (incomingEdgeCountMap.get(edge.target) || 0) + 1);
    });

    for (const node of nodes) {
      const incoming = incomingEdgeCountMap.get(node.id) || 0;
      const lowerPath = node.path.toLowerCase();
      const lowerName = node.name.toLowerCase();

      // Exhaustive entrypoint & framework exemptions
      const isFrameworkOrEntrypoint =
        lowerPath.includes('page.') ||
        lowerPath.includes('layout.') ||
        lowerPath.includes('index.') ||
        lowerPath.includes('main.') ||
        lowerPath.includes('app.') ||
        lowerPath.includes('route.') ||
        lowerPath.includes('server.') ||
        lowerPath.includes('client.') ||
        lowerPath.includes('cli.') ||
        lowerPath.includes('schema.') ||
        lowerPath.includes('types') ||
        lowerPath.includes('docs/') ||
        lowerPath.includes('scripts/') ||
        lowerPath.includes('components/') ||
        lowerPath.includes('routes/') ||
        lowerPath.includes('models/') ||
        lowerPath.includes('api/') ||
        lowerPath.endsWith('.d.ts') ||
        lowerPath.endsWith('.css') ||
        lowerPath.endsWith('.json') ||
        lowerPath.endsWith('.md') ||
        node.type === 'api' ||
        node.type === 'test' ||
        node.type === 'config' ||
        node.type === 'database' ||
        node.type === 'external' ||
        lowerName.includes('page') ||
        lowerName.includes('layout') ||
        lowerName.includes('app') ||
        lowerName.includes('route') ||
        lowerName.includes('test');

      if (incoming === 0 && !isFrameworkOrEntrypoint && node.metrics.outgoingCount === 0 && node.type !== 'external') {
        node.metrics.isDeadCode = true;
        patterns.push({
          id: `pat-${idCounter++}`,
          type: 'dead_code',
          category: 'anti_pattern',
          name: `Unused Isolated Symbol (${node.name})`,
          description: `No internal references or imports connect to this symbol across the repository graph.`,
          file: node.path,
          line: node.line || 1,
          snippet: node.codeSnippet,
          nodeId: node.id,
        });
      }
    }

    return patterns;
  }
}

export const defaultPatternDetector = new PatternDetector();
