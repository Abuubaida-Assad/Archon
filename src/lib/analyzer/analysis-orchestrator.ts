import { ArchitectureLayer, ArchitectureSummary, RepositoryMetadata } from '@/types';
import { RepoManager, defaultRepoManager, FileEntry } from './repo-manager';
import { JsTsParser, defaultJsTsParser, ExtractedFileAnalysis } from './js-ts-parser';
import { PythonParser, defaultPythonParser } from './python-parser';
import { MarkdownParser, defaultMarkdownParser } from './markdown-parser';
import { ArchitectureInferrer, defaultArchitectureInferrer } from './architecture-inferrer';
import { GraphBuilder, defaultGraphBuilder } from '../graph/graph-builder';
import { IssueDetector, defaultIssueDetector } from '../issues/issue-detector';
import { SecurityScanner, defaultSecurityScanner } from './security-scanner';
import { PatternDetector, defaultPatternDetector } from './pattern-detector';
import { HealthCalculator, defaultHealthCalculator } from './health-calculator';
import { CacheStore, defaultCacheStore } from '../storage/cache-store';

export type ProgressCallback = (stage: string, percent: number, detail?: string) => void;

export class AnalysisOrchestrator {
  private repoManager: RepoManager;
  private jsTsParser: JsTsParser;
  private pythonParser: PythonParser;
  private markdownParser: MarkdownParser;
  private inferrer: ArchitectureInferrer;
  private graphBuilder: GraphBuilder;
  private issueDetector: IssueDetector;
  private securityScanner: SecurityScanner;
  private patternDetector: PatternDetector;
  private healthCalculator: HealthCalculator;
  private cacheStore: CacheStore;

  constructor(
    repoManager = defaultRepoManager,
    jsTsParser = defaultJsTsParser,
    pythonParser = defaultPythonParser,
    markdownParser = defaultMarkdownParser,
    inferrer = defaultArchitectureInferrer,
    graphBuilder = defaultGraphBuilder,
    issueDetector = defaultIssueDetector,
    securityScanner = defaultSecurityScanner,
    patternDetector = defaultPatternDetector,
    healthCalculator = defaultHealthCalculator,
    cacheStore = defaultCacheStore
  ) {
    this.repoManager = repoManager;
    this.jsTsParser = jsTsParser;
    this.pythonParser = pythonParser;
    this.markdownParser = markdownParser;
    this.inferrer = inferrer;
    this.graphBuilder = graphBuilder;
    this.issueDetector = issueDetector;
    this.securityScanner = securityScanner;
    this.patternDetector = patternDetector;
    this.healthCalculator = healthCalculator;
    this.cacheStore = cacheStore;
  }

  public async analyzeRepository(
    url: string,
    branch?: string,
    onProgress?: ProgressCallback,
    token?: string,
    isPrivate?: boolean
  ): Promise<ArchitectureSummary> {
    const startTime = Date.now();

    onProgress?.('Repository acquisition & validation', 10, 'Checking repository credentials and URL');
    const { repoDir, metadata } = await this.repoManager.acquireRepository(url, branch, (stage, pct) => {
      onProgress?.(stage, pct);
    }, token, isPrivate);

    onProgress?.('Scanning files and language classification', 30, `Found ${metadata.totalFiles} files, ${metadata.totalLoc} lines of code`);
    const files = this.repoManager.scanDirectory(repoDir);

    return this.processScannedFiles(files, metadata, startTime, onProgress);
  }

  /**
   * Process in-memory files (supports local directory uploads as well as cloned git repos)
   */
  public async processScannedFiles(
    files: FileEntry[],
    metadata: RepositoryMetadata,
    startTime: number = Date.now(),
    onProgress?: ProgressCallback
  ): Promise<ArchitectureSummary> {
    const allFilePaths = files.map((f) => f.relativePath);

    onProgress?.('AST parsing and symbol extraction', 45, 'Extracting classes, functions, imports, calls, APIs, DB models, and notes');
    const analyses: ExtractedFileAnalysis[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.language === 'typescript' || file.language === 'javascript') {
        const analysis = this.jsTsParser.parseFile(file, allFilePaths);
        analyses.push(analysis);
      } else if (file.language === 'python') {
        const analysis = this.pythonParser.parseFile(file, allFilePaths);
        analyses.push(analysis);
      } else if (file.language === 'markdown') {
        const analysis = this.markdownParser.parseFile(file, allFilePaths);
        analyses.push(analysis);
      } else {
        // Generic / Config file entry
        analyses.push({
          file,
          symbols: [],
          imports: [],
          exports: [],
          calls: [],
          apis: [],
          dbOperations: [],
          events: [],
          isTestFile: false,
        });
      }

      if (i % 20 === 0 && onProgress) {
        const pct = Math.floor(45 + (i / files.length) * 20);
        onProgress('AST parsing and symbol extraction', pct, `Processed ${i + 1}/${files.length} files`);
      }
    }

    onProgress?.('Building typed relationship graph', 68, 'Constructing typed edges and resolving dependency links');
    const { nodes, edges } = this.graphBuilder.buildGraph(analyses, metadata);

    onProgress?.('Architectural issue & cycle detection', 78, 'Running cycle detection and coupling hotspot analysis');
    const issues = this.issueDetector.detectIssues(nodes, edges);

    onProgress?.('Security Scanner & Secret Detection', 86, 'Auditing for hardcoded secrets, SQL injection, and dangerous eval');
    const securityFindings = this.securityScanner.scanFiles(files);

    onProgress?.('Pattern & Anti-Pattern Recognition', 92, 'Identifying design patterns, hooks, and god objects');
    const patterns = this.patternDetector.detectPatterns(analyses, nodes, edges);

    onProgress?.('Calculating Codebase Health Score (A-F)', 96, 'Computing maintainability, reliability, and fragility index');
    const health = this.healthCalculator.computeHealthScore(nodes, edges, issues, securityFindings, patterns);

    // Build Layer Groups
    const layers: Record<ArchitectureLayer, { nodeCount: number; nodes: string[] }> = {
      frontend: { nodeCount: 0, nodes: [] },
      gateway: { nodeCount: 0, nodes: [] },
      api: { nodeCount: 0, nodes: [] },
      service: { nodeCount: 0, nodes: [] },
      domain: { nodeCount: 0, nodes: [] },
      database: { nodeCount: 0, nodes: [] },
      queue: { nodeCount: 0, nodes: [] },
      util: { nodeCount: 0, nodes: [] },
      test: { nodeCount: 0, nodes: [] },
      infra: { nodeCount: 0, nodes: [] },
      note: { nodeCount: 0, nodes: [] },
      external: { nodeCount: 0, nodes: [] },
    };

    for (const node of nodes) {
      if (layers[node.layer]) {
        layers[node.layer].nodeCount++;
        layers[node.layer].nodes.push(node.id);
      }
    }

    const servicesCount = nodes.filter((n) => n.type === 'service').length;
    const apisCount = nodes.filter((n) => n.type === 'api').length;
    const databasesCount = nodes.filter((n) => n.type === 'database').length;
    const functionsCount = nodes.filter((n) => n.type === 'function' || n.type === 'method').length;
    const classesCount = nodes.filter((n) => n.type === 'class').length;
    const testsCount = nodes.filter((n) => n.type === 'test').length;
    const hotspotsCount = issues.filter((i) => i.type === 'high_coupling_hotspot').length;
    const circularCount = issues.filter((i) => i.type === 'circular_dependency').length;
    const deadCodeCount = nodes.filter((n) => n.metrics.isDeadCode).length;

    const avgCentrality = nodes.length > 0
      ? Number((nodes.reduce((acc, n) => acc + (n.metrics.centrality || 0), 0) / nodes.length).toFixed(3))
      : 0;

    const summary: ArchitectureSummary = {
      repository: {
        ...metadata,
        status: 'complete',
        progressPercent: 100,
        statusMessage: `Analysis completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      },
      nodes,
      edges,
      issues,
      securityFindings,
      patterns,
      health,
      layers,
      stats: {
        servicesCount,
        modulesCount: metadata.totalFiles,
        apisCount,
        databasesCount,
        functionsCount,
        classesCount,
        testsCount,
        totalEdges: edges.length,
        averageCentrality: avgCentrality,
        hotspotsCount,
        circularDependenciesCount: circularCount,
        deadCodeCount,
        securityVulnerabilitiesCount: securityFindings.length,
      },
    };

    // Cache summary
    this.cacheStore.set(metadata.id, summary);

    onProgress?.('Analysis ready', 100, `Mapped ${nodes.length} components, Grade: ${health.grade}`);

    return summary;
  }
}

export const defaultOrchestrator = new AnalysisOrchestrator();
