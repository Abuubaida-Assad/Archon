import { ArchEdge, ArchNode, DependencyPath, ImpactedItem, ImpactResult, RiskLevel, ValidationItem } from '@/types';
import { GraphAlgorithms } from '../graph/graph-algorithms';

export class ImpactEngine {
  /**
   * Run change impact analysis on a selected component
   */
  public analyzeImpact(
    targetNodeId: string,
    nodes: ArchNode[],
    edges: ArchEdge[]
  ): ImpactResult {
    const nodeMap = new Map<string, ArchNode>(nodes.map((n) => [n.id, n]));
    const targetNode = nodeMap.get(targetNodeId);

    if (!targetNode) {
      throw new Error(`Target node "${targetNodeId}" not found in architecture graph.`);
    }

    // Traverse downstream & upstream blast radius
    const traversals = GraphAlgorithms.traverseDownstream(targetNodeId, edges, 8);

    const directImpactItems: ImpactedItem[] = [];
    const indirectImpactItems: ImpactedItem[] = [];
    const impactedApis: ImpactedItem[] = [];
    const impactedServices: ImpactedItem[] = [];
    const impactedDatabases: ImpactedItem[] = [];
    const impactedTests: ImpactedItem[] = [];
    const allImpactedComponents: ImpactedItem[] = [];

    const dependencyPaths: DependencyPath[] = [];

    for (const trav of traversals) {
      const node = nodeMap.get(trav.nodeId);
      if (!node) continue;

      const pathNodes = trav.path.map((id) => nodeMap.get(id)).filter(Boolean) as ArchNode[];
      const pathEdges: ArchEdge[] = [];
      for (let i = 0; i < trav.path.length - 1; i++) {
        const s = trav.path[i];
        const t = trav.path[i + 1];
        const found = edges.find((e) => (e.source === s && e.target === t) || (e.source === t && e.target === s));
        if (found) pathEdges.push(found);
      }

      // Build human-readable reason
      const relationText = trav.edgeType.toLowerCase().replace(/_/g, ' ');
      const reason = trav.depth === 1
        ? `Directly ${relationText} by ${targetNode.name}`
        : `Indirectly affected via ${pathNodes.map((n) => n.name).join(' → ')}`;

      const level: 'direct' | 'high' | 'medium' | 'low' =
        trav.depth === 1 ? 'direct' : trav.depth <= 2 ? 'high' : trav.depth <= 4 ? 'medium' : 'low';

      const item: ImpactedItem = {
        node,
        level,
        depth: trav.depth,
        path: trav.path,
        reason,
      };

      allImpactedComponents.push(item);

      if (trav.depth === 1) {
        directImpactItems.push(item);
      } else {
        indirectImpactItems.push(item);
      }

      // Classify by category
      if (node.type === 'api') {
        impactedApis.push(item);
      } else if (node.type === 'service') {
        impactedServices.push(item);
      } else if (node.type === 'database') {
        impactedDatabases.push(item);
      } else if (node.type === 'test') {
        impactedTests.push(item);
      }

      // Build detailed path explanation
      if (trav.depth <= 3 || node.type === 'api' || node.type === 'database') {
        const stepsExplanation = pathNodes.map((n, idx) => {
          if (idx === 0) return `${n.name} (Source)`;
          const prevEdge = pathEdges[idx - 1];
          const edgeVerb = prevEdge ? prevEdge.type.toLowerCase().replace(/_/g, ' ') : 'connected to';
          return `${edgeVerb} → ${n.name}`;
        }).join(' ');

        dependencyPaths.push({
          path: trav.path,
          nodes: pathNodes,
          edges: pathEdges,
          explanation: stepsExplanation,
        });
      }
    }

    // Also check direct test coverage for the target node
    const directTests = edges
      .filter((e) => e.target === targetNode.id && e.type === 'TESTED_BY')
      .map((e) => nodeMap.get(e.source))
      .filter(Boolean) as ArchNode[];

    for (const t of directTests) {
      if (!impactedTests.some((item) => item.node.id === t.id)) {
        const item: ImpactedItem = {
          node: t,
          level: 'direct',
          depth: 1,
          path: [targetNode.id, t.id],
          reason: `Direct automated test suite covering ${targetNode.name}`,
        };
        impactedTests.push(item);
        allImpactedComponents.push(item);
      }
    }

    // Calculate Blast Radius Score
    let blastScore = Math.min(100, (directImpactItems.length * 15) + (indirectImpactItems.length * 5) + (impactedApis.length * 20) + (impactedDatabases.length * 15));
    if (blastScore === 0) blastScore = 10;
    const blastLevel: RiskLevel = blastScore >= 75 ? 'critical' : blastScore >= 50 ? 'high' : blastScore >= 25 ? 'medium' : 'low';

    // Generate Validation Checklist
    const validationChecklist: ValidationItem[] = [];

    if (impactedTests.length > 0) {
      validationChecklist.push({
        type: 'test',
        title: `Execute Automated Tests (${impactedTests.length} test files)`,
        description: `Run existing test suites: ${impactedTests.map((t) => t.node.name).join(', ')} to catch regressions early.`,
        priority: 'high',
        targetPath: impactedTests[0]?.node.path,
      });
    } else {
      validationChecklist.push({
        type: 'test',
        title: 'Add Regression Test Suite',
        description: `No automated tests directly cover ${targetNode.name}. Create a unit/integration test before deploying changes.`,
        priority: 'high',
      });
    }

    if (impactedApis.length > 0) {
      validationChecklist.push({
        type: 'api',
        title: `Verify API Contracts (${impactedApis.length} endpoints)`,
        description: `Ensure payload schemas and response contracts remain backwards-compatible for: ${impactedApis.map((a) => a.node.name).join(', ')}.`,
        priority: 'high',
      });
    }

    if (impactedDatabases.length > 0) {
      validationChecklist.push({
        type: 'db',
        title: `Validate Database Schema & Data Mutations`,
        description: `Verify data consistency and column constraints on: ${impactedDatabases.map((d) => d.node.name).join(', ')}.`,
        priority: 'medium',
      });
    }

    if (impactedServices.length > 0) {
      validationChecklist.push({
        type: 'service',
        title: `Audit Cross-Service Contracts`,
        description: `Review service boundaries in: ${impactedServices.map((s) => s.node.name).join(', ')}.`,
        priority: 'medium',
      });
    }

    const summary = `${targetNode.name} has a ${blastLevel.toUpperCase()} blast radius affecting ${allImpactedComponents.length} total components (${impactedApis.length} APIs, ${impactedServices.length} Services, ${impactedDatabases.length} DB entities, ${impactedTests.length} Tests).`;

    return {
      targetNodeId,
      targetNode,
      blastRadiusScore: blastScore,
      blastRadiusLevel: blastLevel,
      summary,
      directImpactCount: directImpactItems.length,
      indirectImpactCount: indirectImpactItems.length,
      impactedApis,
      impactedServices,
      impactedDatabases,
      impactedTests,
      impactedComponents: allImpactedComponents,
      dependencyPaths: dependencyPaths.slice(0, 15),
      validationChecklist,
    };
  }
}

export const defaultImpactEngine = new ImpactEngine();
