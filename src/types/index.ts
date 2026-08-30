export type NodeType =
  | 'file'
  | 'module'
  | 'service'
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'api'
  | 'database'
  | 'test'
  | 'config'
  | 'note'
  | 'external';

export type ArchitectureLayer =
  | 'frontend'
  | 'gateway'
  | 'api'
  | 'service'
  | 'domain'
  | 'database'
  | 'queue'
  | 'util'
  | 'test'
  | 'infra'
  | 'note'
  | 'external';

export type RelationshipType =
  | 'IMPORTS'
  | 'EXPORTS'
  | 'CALLS'
  | 'CALLED_BY'
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'INSTANTIATES'
  | 'REFERENCES'
  | 'EXPOSES'
  | 'CONSUMES'
  | 'READS_FROM'
  | 'WRITES_TO'
  | 'PUBLISHES'
  | 'SUBSCRIBES'
  | 'DEPENDS_ON'
  | 'TESTED_BY'
  | 'CONFIGURED_BY'
  | 'PART_OF'
  | 'WIKI_LINKS_TO';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface NodeMetrics {
  complexity: number;
  centrality: number; // 0-1
  incomingCount: number;
  outgoingCount: number;
  downstreamCount: number; // transitive blast radius
  testCoverage: 'covered' | 'partial' | 'untested' | 'na';
  churnScore?: number; // 0-10 (activity heatmap score)
  commitCount?: number;
  isDeadCode?: boolean;
}

export interface NodeRisk {
  level: RiskLevel;
  score: number; // 0-100
  factors: string[];
}

export interface ArchEvidence {
  file: string;
  line: number;
  endLine?: number;
  snippet: string;
  context?: string;
}

export interface ArchNode {
  id: string;
  name: string;
  type: NodeType;
  layer: ArchitectureLayer;
  path: string;
  directory?: string;
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'java' | 'json' | 'yaml' | 'sql' | 'markdown' | 'other';
  line?: number;
  endLine?: number;
  codeSnippet?: string;
  fullContent?: string;
  loc?: number;
  metrics: NodeMetrics;
  risk: NodeRisk;
  inferred: boolean;
  tags: string[];
  docstring?: string;
  parentId?: string; // parent module or class or service
  contributors?: Array<{ name: string; commits: number; percent: number }>;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  confidence: number;
  evidence: ArchEvidence;
}

export interface ArchIssue {
  id: string;
  type:
    | 'circular_dependency'
    | 'high_coupling_hotspot'
    | 'untested_critical'
    | 'dependency_bottleneck'
    | 'isolated_component'
    | 'large_blast_radius';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  nodeIds: string[];
  cyclePath?: string[];
  evidence: string;
  remediation: string;
}

export interface SecurityFinding {
  id: string;
  type:
    | 'secret_leak'
    | 'sql_injection'
    | 'dangerous_eval'
    | 'debug_statement'
    | 'xss_risk'
    | 'shell_exec';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line: number;
  snippet: string;
  remediation: string;
  cwe?: string;
  nodeId?: string;
}

export interface PatternFinding {
  id: string;
  type:
    | 'singleton'
    | 'factory'
    | 'observer_event'
    | 'react_hook'
    | 'context_provider'
    | 'god_object'
    | 'dead_code';
  category: 'design_pattern' | 'anti_pattern' | 'idiom';
  name: string;
  description: string;
  file: string;
  line: number;
  snippet?: string;
  nodeId?: string;
}

export type HealthGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthScore {
  grade: HealthGrade;
  overallScore: number; // 0-100
  maintainability: number; // 0-100
  reliability: number; // 0-100
  security: number; // 0-100
  fragility: number; // 0-100 (lower is better, or higher is safer)
  deadCodePercent: number;
  circularDependenciesCount: number;
  circularCycles: string[][];
  couplingHotspotsCount: number;
  securityIssuesCount: number;
  patternsCount: number;
  scaleGrade: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
  summary: string;
}

export interface ImpactedItem<T = ArchNode> {
  node: T;
  level: 'direct' | 'high' | 'medium' | 'low';
  depth: number;
  path: string[];
  reason: string;
}

export interface DependencyPath {
  path: string[];
  nodes: ArchNode[];
  edges: ArchEdge[];
  explanation: string;
}

export interface ValidationItem {
  type: 'test' | 'api' | 'service' | 'db' | 'general';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetPath?: string;
}

export interface ImpactResult {
  targetNodeId: string;
  targetNode: ArchNode;
  blastRadiusScore: number; // 0-100
  blastRadiusLevel: RiskLevel;
  summary: string;
  directImpactCount: number;
  indirectImpactCount: number;
  impactedApis: ImpactedItem[];
  impactedServices: ImpactedItem[];
  impactedDatabases: ImpactedItem[];
  impactedTests: ImpactedItem[];
  impactedComponents: ImpactedItem[];
  dependencyPaths: DependencyPath[];
  validationChecklist: ValidationItem[];
  aiArchitectInsight?: {
    summary: string;
    role: string;
    blastRadiusExplanation: string;
    potentialBreakages: string[];
    inspectionChecklist: string[];
    recommendedTests: string[];
  };
}

export interface RepositoryMetadata {
  id: string;
  url: string;
  name: string;
  owner: string;
  branch: string;
  commitHash: string;
  languages: Record<string, number>; // language -> percentage / byte count
  totalFiles: number;
  totalLoc: number;
  analyzedAt: string;
  status: 'idle' | 'cloning' | 'parsing' | 'graphing' | 'analyzing' | 'complete' | 'error';
  error?: string;
  progressPercent: number;
  statusMessage: string;
  isLocalFolder?: boolean;
  pipelineStages: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'complete' | 'failed';
    detail?: string;
    durationMs?: number;
  }>;
}

export interface ArchitectureSummary {
  repository: RepositoryMetadata;
  nodes: ArchNode[];
  edges: ArchEdge[];
  issues: ArchIssue[];
  securityFindings: SecurityFinding[];
  patterns: PatternFinding[];
  health: HealthScore;
  layers: Record<ArchitectureLayer, { nodeCount: number; nodes: string[] }>;
  stats: {
    servicesCount: number;
    modulesCount: number;
    apisCount: number;
    databasesCount: number;
    functionsCount: number;
    classesCount: number;
    testsCount: number;
    totalEdges: number;
    averageCentrality: number;
    hotspotsCount: number;
    circularDependenciesCount: number;
    deadCodeCount: number;
    securityVulnerabilitiesCount: number;
  };
}

export interface NaturalLanguageQueryResult {
  query: string;
  answer: string;
  pathSteps: Array<{
    nodeId: string;
    nodeName: string;
    nodeType: NodeType;
    action: string;
    file: string;
    line?: number;
    snippet?: string;
  }>;
  relatedNodeIds: string[];
  evidenceSnippets: ArchEvidence[];
}
