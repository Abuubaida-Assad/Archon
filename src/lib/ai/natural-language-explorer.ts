import { ArchEdge, ArchNode, ArchitectureSummary, NaturalLanguageQueryResult } from '@/types';
import { GraphAlgorithms } from '../graph/graph-algorithms';

export class NaturalLanguageExplorer {
  /**
   * Search graph and construct an architectural execution flow for natural language query
   */
  public async queryArchitecture(
    query: string,
    summary: ArchitectureSummary,
    model?: string
  ): Promise<NaturalLanguageQueryResult> {
    const qLower = query.toLowerCase();
    const tokens = qLower.split(/\W+/).filter((t) => t.length > 2);

    const nodes = summary.nodes;
    const edges = summary.edges;

    // Score nodes based on relevance to query tokens
    const scoredNodes: Array<{ node: ArchNode; score: number }> = [];

    for (const node of nodes) {
      let score = 0;
      const nName = node.name.toLowerCase();
      const nPath = node.path.toLowerCase();
      const nSnippet = (node.codeSnippet || '').toLowerCase();

      for (const t of tokens) {
        if (nName.includes(t)) score += 10;
        if (nPath.includes(t)) score += 5;
        if (node.tags.some((tag) => tag.toLowerCase().includes(t))) score += 8;
        if (nSnippet.includes(t)) score += 2;
      }

      // Boost API and Service entrypoints
      if (node.type === 'api' && score > 0) score += 6;
      if (node.type === 'service' && score > 0) score += 4;
      if (node.type === 'database' && score > 0) score += 3;

      if (score > 0) {
        scoredNodes.push({ node, score });
      }
    }

    scoredNodes.sort((a, b) => b.score - a.score);

    // Pick top starting entrypoints
    const topEntry = scoredNodes.find((n) => n.node.type === 'api' || n.node.layer === 'api' || n.node.layer === 'gateway') ||
      scoredNodes[0];

    const relatedNodeIds = scoredNodes.slice(0, 10).map((n) => n.node.id);

    const pathSteps: NaturalLanguageQueryResult['pathSteps'] = [];
    const evidenceSnippets = [];

    if (topEntry) {
      // Find downstream path from top entry
      const downstream = GraphAlgorithms.traverseDownstream(topEntry.node.id, edges, 5);
      const fullPathIds = [topEntry.node.id, ...downstream.map((d) => d.nodeId)];

      for (let i = 0; i < Math.min(6, fullPathIds.length); i++) {
        const stepNode = nodes.find((n) => n.id === fullPathIds[i]);
        if (!stepNode) continue;

        let action = 'Receives request';
        if (stepNode.type === 'api') action = 'Public HTTP Endpoint';
        else if (stepNode.type === 'function' || stepNode.type === 'method') action = 'Executes business logic';
        else if (stepNode.type === 'database') action = 'Mutates / Queries database';
        else if (stepNode.type === 'test') action = 'Validated by automated test';
        else if (stepNode.type === 'service') action = 'Service domain boundary';

        pathSteps.push({
          nodeId: stepNode.id,
          nodeName: stepNode.name,
          nodeType: stepNode.type,
          action,
          file: stepNode.path,
          line: stepNode.line,
          snippet: stepNode.codeSnippet,
        });

        if (stepNode.codeSnippet) {
          evidenceSnippets.push({
            file: stepNode.path,
            line: stepNode.line || 1,
            snippet: stepNode.codeSnippet.split('\n')[0] || stepNode.name,
          });
        }
      }
    }

    // Build human narrative
    let answer = '';
    if (pathSteps.length > 0) {
      answer = `Based on the repository architecture graph, execution for "${query}" flows through ${pathSteps.length} primary architectural steps: starting at ${pathSteps[0].nodeName} (${pathSteps[0].file}), passing through ${pathSteps.slice(1, -1).map((s) => s.nodeName).join(' → ') || 'internal domain logic'}, and terminating at ${pathSteps[pathSteps.length - 1].nodeName}.`;
    } else {
      answer = `No direct architectural path matched all tokens for "${query}". The system scanned ${nodes.length} components across ${edges.length} relationships.`;
    }

    return {
      query,
      answer,
      pathSteps,
      relatedNodeIds,
      evidenceSnippets: evidenceSnippets.slice(0, 5),
    };
  }
}

export const defaultNaturalLanguageExplorer = new NaturalLanguageExplorer();
