import { ArchEdge, ArchNode } from '@/types';

export class GraphAlgorithms {
  /**
   * Calculate PageRank / Degree Centrality for all nodes in the graph
   */
  public static calculateCentrality(
    nodes: ArchNode[],
    edges: ArchEdge[],
    iterations: number = 20,
    dampingFactor: number = 0.85
  ): Map<string, number> {
    const nodeCount = nodes.length;
    if (nodeCount === 0) return new Map();

    const nodeIds = nodes.map((n) => n.id);
    const ranks = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const id of nodeIds) {
      ranks.set(id, 1 / nodeCount);
      outgoing.set(id, []);
      incoming.set(id, []);
    }

    for (const edge of edges) {
      // Don't count PART_OF structural edges for centrality flow
      if (edge.type === 'PART_OF') continue;
      outgoing.get(edge.source)?.push(edge.target);
      incoming.get(edge.target)?.push(edge.source);
    }

    for (let iter = 0; iter < iterations; iter++) {
      const nextRanks = new Map<string, number>();
      let sinkSum = 0;

      for (const id of nodeIds) {
        const outList = outgoing.get(id) || [];
        if (outList.length === 0) {
          sinkSum += ranks.get(id) || 0;
        }
      }

      for (const id of nodeIds) {
        let inSum = 0;
        const inList = incoming.get(id) || [];
        for (const inId of inList) {
          const outCount = (outgoing.get(inId) || []).length;
          if (outCount > 0) {
            inSum += (ranks.get(inId) || 0) / outCount;
          }
        }
        const newRank = (1 - dampingFactor) / nodeCount + dampingFactor * (inSum + sinkSum / nodeCount);
        nextRanks.set(id, newRank);
      }

      for (const id of nodeIds) {
        ranks.set(id, nextRanks.get(id) || 0);
      }
    }

    // Normalize centrality to 0-1 range
    let maxRank = 0;
    for (const rank of ranks.values()) {
      if (rank > maxRank) maxRank = rank;
    }

    const normalized = new Map<string, number>();
    for (const [id, rank] of ranks.entries()) {
      normalized.set(id, maxRank > 0 ? Number((rank / maxRank).toFixed(4)) : 0);
    }

    return normalized;
  }

  /**
   * Traverse downstream dependents (blast radius)
   */
  public static traverseDownstream(
    startNodeId: string,
    edges: ArchEdge[],
    maxDepth: number = 8
  ): Array<{ nodeId: string; depth: number; path: string[]; edgeType: string; edgeEvidence?: any }> {
    const results: Array<{ nodeId: string; depth: number; path: string[]; edgeType: string; edgeEvidence?: any }> = [];
    const visited = new Set<string>([startNodeId]);

    // Build adjacency list: target depends on source, or source calls target
    // For blast radius: if A changes, who calls A (upstream callers) + what does A affect downstream (DB, queues, etc.)
    const adj = new Map<string, Array<{ target: string; edge: ArchEdge }>>();

    for (const edge of edges) {
      if (edge.type === 'PART_OF') continue;

      // Dependents: if Function A changes, anyone calling A or importing A is directly impacted
      if (edge.type === 'CALLS' || edge.type === 'CALLED_BY' || edge.type === 'IMPORTS' || edge.type === 'DEPENDS_ON') {
        const caller = edge.type === 'CALLS' ? edge.source : edge.target;
        const callee = edge.type === 'CALLS' ? edge.target : edge.source;

        if (!adj.has(callee)) adj.set(callee, []);
        adj.get(callee)!.push({ target: caller, edge });
      }

      // Also forward side-effects (e.g. if A writes to DB, the DB is impacted)
      if (edge.type === 'WRITES_TO' || edge.type === 'READS_FROM' || edge.type === 'EXPOSES' || edge.type === 'PUBLISHES') {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push({ target: edge.target, edge });
      }

      // Tests that test this node
      if (edge.type === 'TESTED_BY') {
        if (!adj.has(edge.target)) adj.set(edge.target, []);
        adj.get(edge.target)!.push({ target: edge.source, edge });
      }
    }

    const queue: Array<{ nodeId: string; depth: number; path: string[] }> = [{ nodeId: startNodeId, depth: 0, path: [startNodeId] }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      const neighbors = adj.get(current.nodeId) || [];
      for (const { target, edge } of neighbors) {
        if (!visited.has(target)) {
          visited.add(target);
          const newPath = [...current.path, target];
          results.push({
            nodeId: target,
            depth: current.depth + 1,
            path: newPath,
            edgeType: edge.type,
            edgeEvidence: edge.evidence,
          });
          queue.push({
            nodeId: target,
            depth: current.depth + 1,
            path: newPath,
          });
        }
      }
    }

    return results;
  }

  /**
   * Find shortest path between two nodes
   */
  public static findShortestPath(startId: string, endId: string, edges: ArchEdge[]): string[] | null {
    if (startId === endId) return [startId];

    const adj = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push(edge.target);
    }

    const visited = new Set<string>([startId]);
    const queue: Array<{ id: string; path: string[] }> = [{ id: startId, path: [startId] }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adj.get(current.id) || [];

      for (const n of neighbors) {
        if (n === endId) {
          return [...current.path, endId];
        }
        if (!visited.has(n)) {
          visited.add(n);
          queue.push({ id: n, path: [...current.path, n] });
        }
      }
    }

    return null;
  }

  /**
   * Detect circular dependencies (Cycles) in graph
   */
  public static detectCycles(nodes: ArchNode[], edges: ArchEdge[], maxCycles: number = 20): string[][] {
    const adj = new Map<string, string[]>();
    // Consider import/call dependency edges
    const relevantEdges = edges.filter((e) => ['IMPORTS', 'CALLS', 'DEPENDS_ON'].includes(e.type));

    for (const edge of relevantEdges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push(edge.target);
    }

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (nodeId: string) => {
      if (cycles.length >= maxCycles) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);

      const neighbors = adj.get(nodeId) || [];
      for (const n of neighbors) {
        if (cycles.length >= maxCycles) break;

        if (!visited.has(n)) {
          dfs(n);
        } else if (recursionStack.has(n)) {
          // Found cycle
          const cycleStartIndex = currentPath.indexOf(n);
          if (cycleStartIndex !== -1) {
            const cycle = currentPath.slice(cycleStartIndex);
            cycle.push(n); // close loop
            if (cycle.length > 2) {
              cycles.push(cycle);
            }
          }
        }
      }

      recursionStack.delete(nodeId);
      currentPath.pop();
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }
}
