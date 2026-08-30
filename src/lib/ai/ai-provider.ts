import { ArchEdge, ArchNode, ImpactResult } from '@/types';

export interface AiArchitectResponse {
  summary: string;
  role: string;
  blastRadiusExplanation: string;
  potentialBreakages: string[];
  inspectionChecklist: string[];
  recommendedTests: string[];
}

export class AiProvider {
  private openRouterKey?: string;
  private openAiKey?: string;
  private anthropicKey?: string;
  private model: string;

  constructor() {
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
    this.openAiKey = process.env.OPENAI_API_KEY;
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
  }

  public isConfigured(): boolean {
    return !!(this.openRouterKey || this.openAiKey || this.anthropicKey);
  }

  /**
   * Generate grounded architectural reasoning for a selected component & impact result
   */
  public async explainImpact(
    targetNode: ArchNode,
    impact: ImpactResult,
    relatedEdges: ArchEdge[]
  ): Promise<AiArchitectResponse> {
    if (this.openRouterKey) {
      try {
        return await this.callOpenRouter(targetNode, impact, relatedEdges);
      } catch (err) {
        console.warn('[AIProvider] OpenRouter call failed, falling back to deterministic reasoning:', err);
      }
    }

    if (this.openAiKey) {
      try {
        return await this.callOpenAi(targetNode, impact, relatedEdges);
      } catch (err) {
        console.warn('[AIProvider] OpenAI call failed, falling back to deterministic reasoning:', err);
      }
    }

    // High quality deterministic architecture reasoning
    return this.generateDeterministicArchitectInsight(targetNode, impact, relatedEdges);
  }

  private async callOpenRouter(
    node: ArchNode,
    impact: ImpactResult,
    edges: ArchEdge[]
  ): Promise<AiArchitectResponse> {
    const prompt = this.buildContextPrompt(node, impact, edges);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://archon-architect.internal',
        'X-Title': 'Archon Codebase Architecture Intelligence',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are the Principal AI Software Architect in the Archon platform. Analyze the provided codebase evidence and produce precise, evidence-grounded architectural reasoning. Return ONLY valid JSON with keys: summary, role, blastRadiusExplanation, potentialBreakages (array), inspectionChecklist (array), recommendedTests (array). Do not hallucinate dependencies not present in the provided evidence.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API responded with status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return this.parseAiJsonResponse(content, node, impact, edges);
  }

  private async callOpenAi(
    node: ArchNode,
    impact: ImpactResult,
    edges: ArchEdge[]
  ): Promise<AiArchitectResponse> {
    const prompt = this.buildContextPrompt(node, impact, edges);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are the Principal AI Software Architect in Archon. Analyze the codebase evidence and output JSON with: summary, role, blastRadiusExplanation, potentialBreakages (array), inspectionChecklist (array), recommendedTests (array).',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API responded with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return this.parseAiJsonResponse(content, node, impact, edges);
  }

  private parseAiJsonResponse(
    content: string,
    node: ArchNode,
    impact: ImpactResult,
    edges: ArchEdge[]
  ): AiArchitectResponse {
    try {
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        summary: parsed.summary || `${node.name} serves as a critical component in ${node.path}`,
        role: parsed.role || `${node.type.toUpperCase()} in layer ${node.layer}`,
        blastRadiusExplanation: parsed.blastRadiusExplanation || impact.summary,
        potentialBreakages: Array.isArray(parsed.potentialBreakages) ? parsed.potentialBreakages : [],
        inspectionChecklist: Array.isArray(parsed.inspectionChecklist) ? parsed.inspectionChecklist : [],
        recommendedTests: Array.isArray(parsed.recommendedTests) ? parsed.recommendedTests : [],
      };
    } catch {
      return this.generateDeterministicArchitectInsight(node, impact, edges);
    }
  }

  private buildContextPrompt(node: ArchNode, impact: ImpactResult, edges: ArchEdge[]): string {
    return `
COMPONENT UNDER INSPECTION:
- Name: ${node.name}
- Type: ${node.type}
- Architectural Layer: ${node.layer}
- File Path: ${node.path} (Line ${node.line || 1})
- Risk Score: ${node.risk.score}/100 (${node.risk.level.toUpperCase()})
- Risk Factors: ${node.risk.factors.join(', ')}

CODE EVIDENCE:
\`\`\`
${node.codeSnippet || 'No snippet available'}
\`\`\`

DEPENDENCY GRAPH EVIDENCE:
- Direct Callers/Dependents: ${impact.directImpactCount}
- Total Impacted Components: ${impact.impactedComponents.length}
- Impacted APIs: ${impact.impactedApis.map((a) => `${a.node.name} (${a.reason})`).join(', ') || 'None'}
- Impacted Services: ${impact.impactedServices.map((s) => s.node.name).join(', ') || 'None'}
- Impacted Databases: ${impact.impactedDatabases.map((d) => d.node.name).join(', ') || 'None'}
- Impacted Tests: ${impact.impactedTests.map((t) => t.node.name).join(', ') || 'None'}

DEPENDENCY PATHS:
${impact.dependencyPaths.slice(0, 5).map((p) => `• ${p.explanation}`).join('\n')}

Generate architectural reasoning strictly based on these relationships.
`;
  }

  public generateDeterministicArchitectInsight(
    node: ArchNode,
    impact: ImpactResult,
    edges: ArchEdge[]
  ): AiArchitectResponse {
    const role =
      node.type === 'api'
        ? `Public API Gateway Controller exposing ${node.name}`
        : node.type === 'database'
        ? `Persistent Data Layer entity managing table schemas`
        : node.type === 'service'
        ? `Domain Service orchestrating business workflows`
        : `Core ${node.type} executing domain logic in ${node.path}`;

    const apisSummary = impact.impactedApis.length > 0
      ? `exposes changes directly to ${impact.impactedApis.length} public API endpoints (${impact.impactedApis.map((a) => a.node.name).slice(0, 2).join(', ')})`
      : 'operates within internal application boundaries';

    const dbSummary = impact.impactedDatabases.length > 0
      ? `with state mutations propagating to database entities (${impact.impactedDatabases.map((d) => d.node.name).slice(0, 2).join(', ')})`
      : '';

    const summary = `${node.name} is a ${node.risk.level.toUpperCase()} risk architectural element that ${apisSummary} ${dbSummary}.`;

    const blastRadiusExplanation = `Modifying ${node.name} triggers a ${impact.blastRadiusLevel.toUpperCase()} blast radius across ${impact.impactedComponents.length} downstream components. ${
      impact.directImpactCount > 0 ? `It directly impacts ${impact.directImpactCount} immediate caller(s).` : ''
    } ${
      impact.impactedApis.length > 0 ? `Breaking parameter signatures will cause regressions in ${impact.impactedApis.length} API route(s).` : ''
    }`;

    const potentialBreakages: string[] = [];
    if (impact.impactedApis.length > 0) {
      potentialBreakages.push(`API contract mismatches in: ${impact.impactedApis.slice(0, 3).map((a) => a.node.name).join(', ')}.`);
    }
    if (impact.impactedDatabases.length > 0) {
      potentialBreakages.push(`Data mutation anomalies or schema constraint violations on ${impact.impactedDatabases.map((d) => d.node.name).join(', ')}.`);
    }
    if (impact.impactedServices.length > 0) {
      potentialBreakages.push(`Cascading transaction errors across service boundaries: ${impact.impactedServices.map((s) => s.node.name).join(', ')}.`);
    }
    if (potentialBreakages.length === 0) {
      potentialBreakages.push('Internal call signature regressions in direct parent modules.');
    }

    const inspectionChecklist: string[] = [
      `Review call sites in ${node.path} around line ${node.line || 1}`,
      `Verify backwards compatibility of parameter types and return contracts`,
    ];
    if (impact.impactedApis.length > 0) {
      inspectionChecklist.push(`Check route handler validations for ${impact.impactedApis[0].node.name}`);
    }
    if (impact.impactedDatabases.length > 0) {
      inspectionChecklist.push(`Audit database transactions touching ${impact.impactedDatabases[0].node.name}`);
    }

    const recommendedTests: string[] = [];
    if (impact.impactedTests.length > 0) {
      impact.impactedTests.forEach((t) => recommendedTests.push(`Run test suite in ${t.node.path}`));
    } else {
      recommendedTests.push(`Write a targeted unit test verifying ${node.name} edge cases and failure modes`);
    }

    return {
      summary,
      role,
      blastRadiusExplanation,
      potentialBreakages,
      inspectionChecklist,
      recommendedTests,
    };
  }
}

export const defaultAiProvider = new AiProvider();
