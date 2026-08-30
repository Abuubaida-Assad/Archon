import { ArchEdge, ArchNode, ArchitectureLayer, NodeType, RelationshipType, RepositoryMetadata } from '@/types';
import { ExtractedFileAnalysis, ExtractedSymbol } from '../analyzer/js-ts-parser';
import { ArchitectureInferrer, defaultArchitectureInferrer } from '../analyzer/architecture-inferrer';
import { GraphAlgorithms } from './graph-algorithms';

export class GraphBuilder {
  private inferrer: ArchitectureInferrer;

  constructor(inferrer: ArchitectureInferrer = defaultArchitectureInferrer) {
    this.inferrer = inferrer;
  }

  public buildGraph(
    analyses: ExtractedFileAnalysis[],
    metadata: RepositoryMetadata
  ): { nodes: ArchNode[]; edges: ArchEdge[] } {
    const nodes: ArchNode[] = [];
    const edges: ArchEdge[] = [];

    const nodeMap = new Map<string, ArchNode>();
    const edgeKeySet = new Set<string>();

    const addNode = (node: ArchNode) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
        nodes.push(node);
      }
    };

    const addEdge = (edge: ArchEdge) => {
      const key = `${edge.source}->${edge.target}:${edge.type}`;
      if (!edgeKeySet.has(key) && edge.source !== edge.target) {
        edgeKeySet.add(key);
        edges.push(edge);
      }
    };

    // 1. Inferred Services
    const inferredServices = this.inferrer.inferServices(analyses);
    for (const svc of inferredServices) {
      addNode({
        id: svc.id,
        name: svc.name,
        type: 'service',
        layer: svc.layer,
        path: svc.path,
        directory: svc.path,
        language: 'other',
        metrics: {
          complexity: 1,
          centrality: 0,
          incomingCount: 0,
          outgoingCount: 0,
          downstreamCount: 0,
          testCoverage: 'na',
          churnScore: 3,
        },
        risk: { level: 'low', score: 10, factors: ['High-level service boundary'] },
        inferred: true,
        tags: ['service', 'inferred'],
      });
    }

    // 2. Files & Symbols
    const globalSymbolMap = new Map<string, { symbol: ExtractedSymbol; fileRelPath: string; nodeId: string }>();

    for (const analysis of analyses) {
      const file = analysis.file;
      const fileId = `file:${file.relativePath}`;
      const isMd = file.language === 'markdown';
      const layer = isMd ? 'note' : this.inferrer.inferFileLayer(analysis);

      // Extract directory path
      const dirParts = file.relativePath.split('/');
      const directory = dirParts.length > 1 ? dirParts.slice(0, -1).join('/') : 'root';

      // Churn & Activity simulation based on LOC and symbols
      const baseLoc = file.linesOfCode || file.content.split('\n').length;
      const churnScore = Math.min(10, Math.max(1, Math.round((baseLoc / 40) + (analysis.symbols.length / 2))));
      const commitCount = Math.max(2, Math.round(churnScore * 3.5));

      // Create File Node
      addNode({
        id: fileId,
        name: file.relativePath.split('/').pop() || file.relativePath,
        type: analysis.isTestFile ? 'test' : isMd ? 'note' : 'file',
        layer,
        path: file.relativePath,
        directory,
        language: file.language,
        fullContent: file.content,
        loc: baseLoc,
        metrics: {
          complexity: Math.min(25, Math.ceil(baseLoc / 25)),
          centrality: 0,
          incomingCount: 0,
          outgoingCount: 0,
          downstreamCount: 0,
          testCoverage: analysis.isTestFile ? 'covered' : 'na',
          churnScore,
          commitCount,
        },
        risk: { level: 'low', score: 15, factors: ['Source file'] },
        inferred: false,
        tags: [file.language, layer],
        contributors: [
          { name: metadata.owner || 'core-team', commits: Math.round(commitCount * 0.7), percent: 70 },
          { name: 'contributor-1', commits: Math.round(commitCount * 0.3), percent: 30 },
        ],
      });

      // Link to parent service if applicable
      const parentSvc = inferredServices.find((s) => s.filePaths.includes(file.relativePath));
      if (parentSvc) {
        addEdge({
          id: `edge:${fileId}-part_of-${parentSvc.id}`,
          source: fileId,
          target: parentSvc.id,
          type: 'PART_OF',
          confidence: 0.95,
          evidence: {
            file: file.relativePath,
            line: 1,
            snippet: `File ${file.relativePath} is part of ${parentSvc.name}`,
          },
        });
      }

      // Create Symbol Nodes (functions, classes, methods, models)
      for (const sym of analysis.symbols) {
        const symbolId = `${sym.kind}:${file.relativePath}:${sym.name}`;
        globalSymbolMap.set(`${file.relativePath}:${sym.name}`, { symbol: sym, fileRelPath: file.relativePath, nodeId: symbolId });
        globalSymbolMap.set(sym.name, { symbol: sym, fileRelPath: file.relativePath, nodeId: symbolId });

        const isModel = sym.kind === 'db_model';
        const symType: NodeType = sym.kind === 'class' ? 'class' : sym.kind === 'method' ? 'method' : isModel ? 'database' : sym.kind === 'test' ? 'test' : isMd ? 'note' : 'function';
        const symLayer: ArchitectureLayer = isModel ? 'database' : layer;

        addNode({
          id: symbolId,
          name: sym.name,
          type: symType,
          layer: symLayer,
          path: file.relativePath,
          directory,
          language: file.language,
          line: sym.line,
          endLine: sym.endLine,
          codeSnippet: sym.codeSnippet,
          parentId: fileId,
          loc: (sym.endLine && sym.line) ? (sym.endLine - sym.line + 1) : undefined,
          metrics: {
            complexity: sym.complexity || 2,
            centrality: 0,
            incomingCount: 0,
            outgoingCount: 0,
            downstreamCount: 0,
            testCoverage: 'untested',
            churnScore: Math.min(10, Math.max(1, Math.round((sym.complexity || 2) * 1.5))),
          },
          risk: { level: 'low', score: 20, factors: [] },
          inferred: false,
          tags: [sym.kind, sym.isExported ? 'exported' : 'internal'],
        });

        // Link Symbol -> File
        addEdge({
          id: `edge:${symbolId}-part_of-${fileId}`,
          source: symbolId,
          target: fileId,
          type: 'PART_OF',
          confidence: 1.0,
          evidence: {
            file: file.relativePath,
            line: sym.line,
            snippet: sym.codeSnippet.split('\n')[0] || sym.name,
          },
        });
      }
    }

    // 3. Connect Imports & Wiki-Links (File -> File / External)
    for (const analysis of analyses) {
      const sourceFileId = `file:${analysis.file.relativePath}`;
      const isMd = analysis.file.language === 'markdown';

      for (const imp of analysis.imports) {
        if (imp.resolvedPath) {
          const targetFileId = `file:${imp.resolvedPath}`;
          if (nodeMap.has(targetFileId)) {
            addEdge({
              id: `edge:${sourceFileId}-${isMd ? 'wiki' : 'imports'}-${targetFileId}`,
              source: sourceFileId,
              target: targetFileId,
              type: isMd ? 'WIKI_LINKS_TO' : 'IMPORTS',
              confidence: 0.98,
              evidence: {
                file: analysis.file.relativePath,
                line: imp.line,
                snippet: isMd ? `[[${imp.source}]]` : `import from '${imp.source}'`,
              },
            });
          }
        } else if (!imp.isRelative && !isMd) {
          // External library dependency (e.g. express, axios, prisma)
          const externalId = `ext:${imp.source}`;
          if (!nodeMap.has(externalId)) {
            addNode({
              id: externalId,
              name: imp.source,
              type: 'external',
              layer: 'external',
              path: `package:${imp.source}`,
              directory: 'node_modules',
              language: 'other',
              metrics: {
                complexity: 1,
                centrality: 0,
                incomingCount: 0,
                outgoingCount: 0,
                downstreamCount: 0,
                testCoverage: 'na',
                churnScore: 1,
              },
              risk: { level: 'low', score: 5, factors: ['Third-party dependency'] },
              inferred: true,
              tags: ['external', 'dependency'],
            });
          }
          addEdge({
            id: `edge:${sourceFileId}-imports-${externalId}`,
            source: sourceFileId,
            target: externalId,
            type: 'DEPENDS_ON',
            confidence: 0.95,
            evidence: {
              file: analysis.file.relativePath,
              line: imp.line,
              snippet: `import from '${imp.source}'`,
            },
          });
        }
      }
    }

    // 4. Connect Function Calls & Symbol References
    for (const analysis of analyses) {
      for (const call of analysis.calls) {
        const callerName = call.callerSymbolName;
        const callee = call.calleeName;

        let callerNodeId = callerName ? `${analysis.file.relativePath}:${callerName}` : undefined;
        let callerNode = callerNodeId ? globalSymbolMap.get(callerNodeId) : undefined;
        if (!callerNode && callerName) {
          callerNode = globalSymbolMap.get(callerName);
        }

        const sourceId = callerNode ? callerNode.nodeId : `file:${analysis.file.relativePath}`;

        // Find callee symbol
        let targetNode = globalSymbolMap.get(`${analysis.file.relativePath}:${callee}`);
        if (!targetNode) {
          targetNode = globalSymbolMap.get(callee);
        }

        if (targetNode && targetNode.nodeId !== sourceId) {
          addEdge({
            id: `edge:${sourceId}-calls-${targetNode.nodeId}`,
            source: sourceId,
            target: targetNode.nodeId,
            type: 'CALLS',
            confidence: 0.92,
            evidence: {
              file: analysis.file.relativePath,
              line: call.line,
              snippet: call.snippet,
            },
          });
        }
      }
    }

    // 5. Connect API Endpoints & Routes
    for (const analysis of analyses) {
      for (const api of analysis.apis) {
        const apiId = `api:${api.method}:${api.path}`;
        const dirParts = analysis.file.relativePath.split('/');
        const directory = dirParts.length > 1 ? dirParts.slice(0, -1).join('/') : 'root';

        addNode({
          id: apiId,
          name: `${api.method} ${api.path}`,
          type: 'api',
          layer: 'api',
          path: analysis.file.relativePath,
          directory,
          language: analysis.file.language,
          line: api.line,
          codeSnippet: api.snippet,
          metrics: {
            complexity: 3,
            centrality: 0,
            incomingCount: 0,
            outgoingCount: 0,
            downstreamCount: 0,
            testCoverage: 'untested',
            churnScore: 4,
          },
          risk: { level: 'medium', score: 45, factors: ['Public API surface boundary'] },
          inferred: false,
          tags: ['api', api.method, api.framework],
        });

        // Link Handler / File -> API
        const sourceId = api.handlerSymbolName
          ? (globalSymbolMap.get(`${analysis.file.relativePath}:${api.handlerSymbolName}`)?.nodeId || `file:${analysis.file.relativePath}`)
          : `file:${analysis.file.relativePath}`;

        addEdge({
          id: `edge:${sourceId}-exposes-${apiId}`,
          source: sourceId,
          target: apiId,
          type: 'EXPOSES',
          confidence: 0.98,
          evidence: {
            file: analysis.file.relativePath,
            line: api.line,
            snippet: api.snippet,
          },
        });
      }
    }

    // 6. Connect Database Tables & Operations
    for (const analysis of analyses) {
      for (const dbOp of analysis.dbOperations) {
        const tableId = `db:table:${dbOp.targetTableOrModel.toLowerCase()}`;
        if (!nodeMap.has(tableId)) {
          addNode({
            id: tableId,
            name: `Table: ${dbOp.targetTableOrModel}`,
            type: 'database',
            layer: 'database',
            path: analysis.file.relativePath,
            directory: 'database',
            language: 'sql',
            line: dbOp.line,
            codeSnippet: dbOp.snippet,
            metrics: {
              complexity: 2,
              centrality: 0,
              incomingCount: 0,
              outgoingCount: 0,
              downstreamCount: 0,
              testCoverage: 'na',
              churnScore: 2,
            },
            risk: { level: 'high', score: 65, factors: ['Persistent database state'] },
            inferred: true,
            tags: ['database', dbOp.orm || 'sql'],
          });
        }

        const sourceId = dbOp.callerSymbolName
          ? (globalSymbolMap.get(`${analysis.file.relativePath}:${dbOp.callerSymbolName}`)?.nodeId || `file:${analysis.file.relativePath}`)
          : `file:${analysis.file.relativePath}`;

        addEdge({
          id: `edge:${sourceId}-${dbOp.operation === 'INSERT' ? 'writes' : 'reads'}-${tableId}`,
          source: sourceId,
          target: tableId,
          type: dbOp.operation === 'INSERT' ? 'WRITES_TO' : 'READS_FROM',
          confidence: 0.94,
          evidence: {
            file: analysis.file.relativePath,
            line: dbOp.line,
            snippet: dbOp.snippet,
          },
        });
      }
    }

    // 7. Connect Tests to Tested Symbols
    for (const analysis of analyses) {
      if (analysis.isTestFile) {
        const testFileId = `file:${analysis.file.relativePath}`;
        const implPathCandidates = [
          analysis.file.relativePath.replace(/\.test\.(ts|js|tsx|jsx)$/, '.$1'),
          analysis.file.relativePath.replace(/\.spec\.(ts|js|tsx|jsx)$/, '.$1'),
          analysis.file.relativePath.replace(/tests?\//, 'src/').replace(/\.test\.(ts|js)$/, '.$1'),
          analysis.file.relativePath.replace(/__tests__\//, '').replace(/\.test\.(ts|js)$/, '.$1'),
        ];

        for (const cand of implPathCandidates) {
          const targetFileId = `file:${cand}`;
          if (nodeMap.has(targetFileId)) {
            addEdge({
              id: `edge:${testFileId}-tests-${targetFileId}`,
              source: testFileId,
              target: targetFileId,
              type: 'TESTED_BY',
              confidence: 0.96,
              evidence: {
                file: analysis.file.relativePath,
                line: 1,
                snippet: `Test file covers ${cand}`,
              },
            });
            const implNode = nodeMap.get(targetFileId);
            if (implNode) {
              implNode.metrics.testCoverage = 'covered';
            }
          }
        }
      }
    }

    // 8. Calculate Graph Centrality and Metrics
    const centralityMap = GraphAlgorithms.calculateCentrality(nodes, edges);

    for (const node of nodes) {
      const cent = centralityMap.get(node.id) || 0;
      node.metrics.centrality = cent;

      const inc = edges.filter((e) => e.target === node.id).length;
      const out = edges.filter((e) => e.source === node.id).length;
      node.metrics.incomingCount = inc;
      node.metrics.outgoingCount = out;

      // Downstream blast radius count
      const downstream = GraphAlgorithms.traverseDownstream(node.id, edges, 5);
      node.metrics.downstreamCount = downstream.length;

      // Compute explainable risk factors
      const factors: string[] = [];
      let riskScore = 15;

      if (node.metrics.downstreamCount > 8) {
        factors.push(`High downstream blast radius (${node.metrics.downstreamCount} dependents)`);
        riskScore += 30;
      } else if (node.metrics.downstreamCount > 3) {
        factors.push(`Moderate downstream blast radius (${node.metrics.downstreamCount} dependents)`);
        riskScore += 15;
      }

      if (cent > 0.5) {
        factors.push(`High graph centrality (${(cent * 100).toFixed(0)}%) - critical architectural hub`);
        riskScore += 25;
      }

      const hasDbWrite = edges.some((e) => e.source === node.id && e.type === 'WRITES_TO');
      if (hasDbWrite) {
        factors.push('Direct database state mutation (writes to persistent storage)');
        riskScore += 20;
      }

      const isApi = node.type === 'api' || edges.some((e) => e.source === node.id && e.type === 'EXPOSES');
      if (isApi) {
        factors.push('Exposed through external/public API surface');
        riskScore += 15;
      }

      if (node.metrics.testCoverage === 'covered') {
        factors.push('Covered by automated test suite (-15% risk mitigation)');
        riskScore = Math.max(5, riskScore - 15);
      } else if (node.type !== 'test' && node.type !== 'config' && riskScore > 40) {
        factors.push('Missing direct automated test coverage');
        riskScore += 10;
      }

      if (factors.length === 0) {
        factors.push('Isolated component with minimal downstream blast radius');
      }

      riskScore = Math.min(100, Math.max(5, riskScore));
      const riskLevel = riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

      node.risk = {
        score: riskScore,
        level: riskLevel,
        factors,
      };
    }

    return { nodes, edges };
  }
}

export const defaultGraphBuilder = new GraphBuilder();
