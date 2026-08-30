import { ArchEdge, ArchIssue, ArchNode } from '@/types';
import { GraphAlgorithms } from '../graph/graph-algorithms';

export class IssueDetector {
  public detectIssues(nodes: ArchNode[], edges: ArchEdge[]): ArchIssue[] {
    const issues: ArchIssue[] = [];
    const nodeMap = new Map<string, ArchNode>(nodes.map((n) => [n.id, n]));

    // 1. Detect Circular Dependencies
    const rawCycles = GraphAlgorithms.detectCycles(nodes, edges, 10);
    const uniqueCycles: string[][] = [];
    const seenCycleFingerprints = new Set<string>();

    for (const cycle of rawCycles) {
      const sorted = [...cycle].sort().join('|');
      if (!seenCycleFingerprints.has(sorted)) {
        seenCycleFingerprints.add(sorted);
        uniqueCycles.push(cycle);
      }
    }

    uniqueCycles.forEach((cycle, idx) => {
      const cycleNames = cycle.map((id) => nodeMap.get(id)?.name || id);
      issues.push({
        id: `issue:circular:${idx + 1}`,
        type: 'circular_dependency',
        severity: 'critical',
        title: `Circular Dependency Loop: ${cycleNames[0]} ↔ ${cycleNames[1] || cycleNames[0]}`,
        description: `A tight cyclic dependency was detected along the path: ${cycleNames.join(' → ')}. Circular imports can cause initialization deadlocks, memory leaks, and prevent clean tree-shaking.`,
        nodeIds: cycle,
        cyclePath: cycle,
        evidence: `Dependency cycle involving ${cycle.length} components: ${cycleNames.join(' → ')}`,
        remediation: 'Extract shared abstractions into an independent interface or shared utility module, or use dependency injection to decouple initialization.',
      });
    });

    // 2. Detect High-Coupling Hotspots
    for (const node of nodes) {
      const totalConnections = node.metrics.incomingCount + node.metrics.outgoingCount;
      if (totalConnections >= 6 && node.type !== 'config' && node.type !== 'test') {
        issues.push({
          id: `issue:hotspot:${node.id}`,
          type: 'high_coupling_hotspot',
          severity: totalConnections > 10 ? 'critical' : 'warning',
          title: `High Coupling Hotspot: ${node.name}`,
          description: `${node.name} is coupled to ${totalConnections} components (${node.metrics.incomingCount} incoming, ${node.metrics.outgoingCount} outgoing). Changes here create significant ripple effects across layers.`,
          nodeIds: [node.id],
          evidence: `Incoming connections: ${node.metrics.incomingCount}, Outgoing connections: ${node.metrics.outgoingCount}, Downstream blast radius: ${node.metrics.downstreamCount}`,
          remediation: 'Refactor into smaller, single-responsibility modules or apply the Facade / Adapter pattern to shield consumers.',
        });
      }
    }

    // 3. Detect Untested Critical Components
    for (const node of nodes) {
      if (
        (node.risk.level === 'high' || node.risk.level === 'critical' || node.metrics.downstreamCount >= 5) &&
        node.metrics.testCoverage === 'untested' &&
        node.type !== 'test' &&
        node.type !== 'config' &&
        node.type !== 'external'
      ) {
        issues.push({
          id: `issue:untested:${node.id}`,
          type: 'untested_critical',
          severity: 'warning',
          title: `Untested Critical Component: ${node.name}`,
          description: `${node.name} has a high risk score (${node.risk.score}/100) and affects ${node.metrics.downstreamCount} downstream components, but has no detected automated unit or integration tests.`,
          nodeIds: [node.id],
          evidence: `Risk level: ${node.risk.level.toUpperCase()}, Downstream blast radius: ${node.metrics.downstreamCount}, Test status: Untested`,
          remediation: `Add automated regression tests in a test file covering ${node.path || node.name} before making structural modifications.`,
        });
      }
    }

    // 4. Detect Dependency Bottlenecks (Single point of failure)
    for (const node of nodes) {
      if (node.metrics.centrality > 0.7 && node.metrics.incomingCount >= 4 && node.type !== 'external') {
        issues.push({
          id: `issue:bottleneck:${node.id}`,
          type: 'dependency_bottleneck',
          severity: 'warning',
          title: `Architectural Bottleneck: ${node.name}`,
          description: `${node.name} has extremely high centrality (${(node.metrics.centrality * 100).toFixed(0)}%) acting as a central funnel for system execution.`,
          nodeIds: [node.id],
          evidence: `Graph Centrality: ${(node.metrics.centrality * 100).toFixed(1)}%, Inbound dependants: ${node.metrics.incomingCount}`,
          remediation: 'Verify scalability and concurrency constraints. Ensure strict interface contracts to prevent cascading service downtime.',
        });
      }
    }

    return issues;
  }
}

export const defaultIssueDetector = new IssueDetector();
