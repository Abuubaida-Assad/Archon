import test from 'node:test';
import assert from 'node:assert';
import { RepoManager } from '../src/lib/analyzer/repo-manager';
import { JsTsParser } from '../src/lib/analyzer/js-ts-parser';
import { PythonParser } from '../src/lib/analyzer/python-parser';
import { GraphAlgorithms } from '../src/lib/graph/graph-algorithms';
import { ImpactEngine } from '../src/lib/impact/impact-engine';
import { IssueDetector } from '../src/lib/issues/issue-detector';
import { ensureSampleRepositories } from '../src/lib/sample-repos/setup-samples';
import { AnalysisOrchestrator } from '../src/lib/analyzer/analysis-orchestrator';
import { NaturalLanguageExplorer } from '../src/lib/ai/natural-language-explorer';
import { AiProvider } from '../src/lib/ai/ai-provider';

test('RepoManager - URL Parsing & Validation', () => {
  const repoManager = new RepoManager();

  const parsedGithub = repoManager.parseRepoUrl('https://github.com/expressjs/express.git');
  assert.strictEqual(parsedGithub.owner, 'expressjs');
  assert.strictEqual(parsedGithub.name, 'express');
  assert.strictEqual(parsedGithub.isLocal, false);

  assert.throws(() => {
    repoManager.parseRepoUrl('invalid-random-string-not-a-repo');
  }, /Invalid repository URL/);
});

test('JsTsParser - AST Extraction for Functions, Calls, APIs, DBs', () => {
  const parser = new JsTsParser();
  const sampleCode = `
import { validateTransaction } from './validator';
import { prisma } from './db';

export async function processPayment(orderId: string, amount: number) {
  validateTransaction({ orderId, amount });
  const payment = await prisma.payment.create({ data: { orderId, amount } });
  return payment;
}
`;

  const analysis = parser.parseFile({
    relativePath: 'src/services/paymentService.ts',
    absolutePath: '/fake/path/src/services/paymentService.ts',
    extension: '.ts',
    language: 'typescript',
    sizeBytes: sampleCode.length,
    linesOfCode: sampleCode.split('\n').length,
    content: sampleCode,
  }, ['src/services/paymentService.ts', 'src/services/validator.ts', 'src/services/db.ts']);

  assert.strictEqual(analysis.symbols.length, 1);
  assert.strictEqual(analysis.symbols[0].name, 'processPayment');
  assert.strictEqual(analysis.symbols[0].kind, 'function');
  assert.strictEqual(analysis.symbols[0].isExported, true);

  assert.strictEqual(analysis.imports.length, 2);
  assert.strictEqual(analysis.calls.some((c) => c.calleeName.includes('validateTransaction')), true);
  assert.strictEqual(analysis.dbOperations.length, 1);
  assert.strictEqual(analysis.dbOperations[0].targetTableOrModel, 'payment');
});

test('PythonParser - Python AST Routes & Models Extraction', () => {
  const parser = new PythonParser();
  const pyCode = `
from fastapi import APIRouter
from models import User

router = APIRouter()

@router.get('/api/v1/users')
async def get_users():
    return User.objects.filter(active=True)
`;

  const analysis = parser.parseFile({
    relativePath: 'api/routes.py',
    absolutePath: '/fake/api/routes.py',
    extension: '.py',
    language: 'python',
    sizeBytes: pyCode.length,
    linesOfCode: pyCode.split('\n').length,
    content: pyCode,
  }, ['api/routes.py', 'models.py']);

  assert.strictEqual(analysis.apis.length, 1);
  assert.strictEqual(analysis.apis[0].path, '/api/v1/users');
  assert.strictEqual(analysis.apis[0].method, 'GET');
});

test('GraphAlgorithms - Cycle Detection & Downstream Traversal', () => {
  const mockNodes: any[] = [
    { id: 'node:A', name: 'A', type: 'function', layer: 'service', path: 'a.ts', language: 'typescript', metrics: {}, risk: {}, inferred: false, tags: [] },
    { id: 'node:B', name: 'B', type: 'function', layer: 'service', path: 'b.ts', language: 'typescript', metrics: {}, risk: {}, inferred: false, tags: [] },
    { id: 'node:C', name: 'C', type: 'function', layer: 'service', path: 'c.ts', language: 'typescript', metrics: {}, risk: {}, inferred: false, tags: [] },
  ];

  const mockEdges: any[] = [
    { id: 'e1', source: 'node:A', target: 'node:B', type: 'CALLS', confidence: 1, evidence: {} },
    { id: 'e2', source: 'node:B', target: 'node:C', type: 'CALLS', confidence: 1, evidence: {} },
    { id: 'e3', source: 'node:C', target: 'node:A', type: 'CALLS', confidence: 1, evidence: {} },
  ];

  const cycles = GraphAlgorithms.detectCycles(mockNodes, mockEdges);
  assert.strictEqual(cycles.length > 0, true);
  assert.strictEqual(cycles[0].length >= 3, true);
});

test('IssueDetector - Circular Dependencies & Coupling Hotspots', () => {
  const mockNodes: any[] = [
    { id: 'node:A', name: 'ServiceA', type: 'service', layer: 'service', path: 'a.ts', language: 'typescript', metrics: { incomingCount: 5, outgoingCount: 6, downstreamCount: 12, centrality: 0.8, testCoverage: 'untested' }, risk: { level: 'high', score: 80, factors: [] }, inferred: false, tags: [] },
    { id: 'node:B', name: 'ServiceB', type: 'service', layer: 'service', path: 'b.ts', language: 'typescript', metrics: { incomingCount: 2, outgoingCount: 2, downstreamCount: 4, centrality: 0.3, testCoverage: 'covered' }, risk: { level: 'low', score: 20, factors: [] }, inferred: false, tags: [] },
  ];

  const mockEdges: any[] = [
    { id: 'e1', source: 'node:A', target: 'node:B', type: 'CALLS', confidence: 1, evidence: {} },
    { id: 'e2', source: 'node:B', target: 'node:A', type: 'CALLS', confidence: 1, evidence: {} },
  ];

  const detector = new IssueDetector();
  const issues = detector.detectIssues(mockNodes, mockEdges);

  assert.strictEqual(issues.length >= 1, true);
  assert.strictEqual(issues.some((i) => i.type === 'circular_dependency'), true);
  assert.strictEqual(issues.some((i) => i.type === 'high_coupling_hotspot'), true);
});

test('End-to-End Orchestrator, Impact Analysis, and AI Insights', async () => {
  const sampleDir = ensureSampleRepositories();
  const orchestrator = new AnalysisOrchestrator();

  const summary = await orchestrator.analyzeRepository(sampleDir);

  assert.strictEqual(summary.nodes.length > 0, true);
  assert.strictEqual(summary.edges.length > 0, true);
  assert.strictEqual(summary.stats.apisCount >= 2, true);

  // 1. Change Impact on PaymentService
  const targetNode = summary.nodes.find((n) => n.name.includes('processPayment') || n.name.includes('PaymentService'));
  assert.ok(targetNode, 'Expected to find processPayment or PaymentService in graph');

  const impactEngine = new ImpactEngine();
  const impact = impactEngine.analyzeImpact(targetNode.id, summary.nodes, summary.edges);

  assert.ok(impact.blastRadiusScore > 0);
  assert.ok(impact.validationChecklist.length > 0);

  // 2. AI Architect Reasoning
  const aiProvider = new AiProvider();
  const aiInsight = await aiProvider.explainImpact(targetNode, impact, summary.edges);
  assert.ok(aiInsight.summary.length > 0);
  assert.ok(aiInsight.role.length > 0);
  assert.ok(aiInsight.blastRadiusExplanation.length > 0);
  assert.ok(aiInsight.inspectionChecklist.length > 0);

  // 3. Natural Language Architecture Explorer
  const explorer = new NaturalLanguageExplorer();
  const queryResult = await explorer.queryArchitecture('What happens when an order is created and paid?', summary);
  assert.ok(queryResult.answer.length > 0);
  assert.ok(queryResult.pathSteps.length > 0);
});

test('SecurityScanner - Secret Leaks, Dangerous eval, and SQL Injection Detection', async () => {
  const { SecurityScanner } = await import('../src/lib/analyzer/security-scanner');
  const scanner = new SecurityScanner();

  const mockFiles = [
    {
      relativePath: 'src/config/auth.ts',
      absolutePath: '/app/src/config/auth.ts',
      extension: '.ts',
      language: 'typescript' as const,
      sizeBytes: 200,
      linesOfCode: 10,
      content: `const awsKey = "AKIA1234567890ABCDEF";
export const secretToken = "sk-proj-1234567890123456789012345678901234567890";
eval("console.log('danger')");
`,
    },
  ];

  const findings = scanner.scanFiles(mockFiles);
  assert.strictEqual(findings.length >= 2, true);
  assert.strictEqual(findings.some((f) => f.type === 'secret_leak'), true);
  assert.strictEqual(findings.some((f) => f.type === 'dangerous_eval'), true);
});

test('MarkdownParser - Obsidian [[wiki-links]] and relative links', async () => {
  const { MarkdownParser } = await import('../src/lib/analyzer/markdown-parser');
  const parser = new MarkdownParser();

  const mdFile = {
    relativePath: 'architecture/System.md',
    absolutePath: '/vault/architecture/System.md',
    extension: '.md',
    language: 'markdown' as const,
    sizeBytes: 150,
    linesOfCode: 8,
    content: `# System Architecture

Refer to [[Payment Service]] for payment flow and [Deployment Guide](./guides/deploy.md).
#architecture #core
`,
  };

  const analysis = parser.parseFile(mdFile, ['architecture/System.md', 'services/Payment Service.md', 'guides/deploy.md']);
  assert.strictEqual(analysis.symbols.length, 1);
  assert.strictEqual(analysis.symbols[0].name, 'System Architecture');
  assert.strictEqual(analysis.imports.length, 2);
  assert.strictEqual(analysis.imports.some((i) => i.source === 'Payment Service'), true);
});

test('HealthCalculator - Letter Grade & Codebase Health Scoring', async () => {
  const { HealthCalculator } = await import('../src/lib/analyzer/health-calculator');
  const calculator = new HealthCalculator();

  const mockNodes: any[] = [
    { id: 'node:1', name: 'App', metrics: { complexity: 2, incomingCount: 0, outgoingCount: 1, downstreamCount: 1 }, risk: { score: 10, level: 'low' } },
    { id: 'node:2', name: 'Service', metrics: { complexity: 4, incomingCount: 1, outgoingCount: 0, downstreamCount: 0 }, risk: { score: 15, level: 'low' } },
  ];

  const health = calculator.computeHealthScore(mockNodes, [], [], [], []);
  assert.strictEqual(health.grade.startsWith('A'), true);
  assert.strictEqual(health.overallScore >= 80, true);
  assert.strictEqual(health.maintainability >= 80, true);
  assert.strictEqual(health.scaleGrade, 'Micro');
});

