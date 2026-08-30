import { ArchEdge, ArchNode, ArchitectureSummary, ImpactResult, NaturalLanguageQueryResult } from '@/types';

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
  private defaultModel: string;

  constructor() {
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
    this.openAiKey = process.env.OPENAI_API_KEY;
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.defaultModel = process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
  }

  public isConfigured(): boolean {
    return !!(this.openRouterKey || this.openAiKey || this.anthropicKey);
  }

  /**
   * Answer natural language architectural queries grounded in repository evidence
   */
  public async answerArchitecturalQuestion(
    query: string,
    summary: ArchitectureSummary,
    requestedModel?: string
  ): Promise<NaturalLanguageQueryResult> {
    const activeModel = requestedModel || this.defaultModel;

    // 1. If OpenRouter Key is available and external model requested, use LLM
    if (this.openRouterKey && activeModel !== 'local/deterministic') {
      try {
        const llmAnswer = await this.callOpenRouterForQuery(query, summary, activeModel);
        if (llmAnswer) return llmAnswer;
      } catch (err) {
        console.warn('[AIProvider] OpenRouter architectural query failed, falling back to deterministic reasoning:', err);
      }
    }

    // 2. If OpenAI Key is available and external model requested, use OpenAI
    if (this.openAiKey && activeModel !== 'local/deterministic') {
      try {
        const llmAnswer = await this.callOpenAiForQuery(query, summary, activeModel);
        if (llmAnswer) return llmAnswer;
      } catch (err) {
        console.warn('[AIProvider] OpenAI architectural query failed, falling back to deterministic reasoning:', err);
      }
    }

    // 3. Grounded Deterministic Architectural Reasoning Engine
    return this.generateGroundedArchitecturalResponse(query, summary);
  }

  private async callOpenRouterForQuery(
    query: string,
    summary: ArchitectureSummary,
    model: string
  ): Promise<NaturalLanguageQueryResult | null> {
    const contextPrompt = this.buildRepositoryContextPrompt(summary);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://archon-architect.internal',
        'X-Title': 'Archon Architecture Intelligence',
      },
      body: JSON.stringify({
        model: model.includes('/') ? model : 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          {
            role: 'system',
            content:
              'You are the Principal AI Software Architect of Archon. Answer the user architectural question directly, accurately, and authoritatively based strictly on the provided repository evidence. Provide clear markdown formatting, list specific component names, file locations, risk scores, and actionable recommendations. Do not invent non-existent files.',
          },
          {
            role: 'user',
            content: `REPOSITORY ARCHITECTURE EVIDENCE:\n${contextPrompt}\n\nUSER QUESTION: "${query}"\n\nProvide an insightful, evidence-backed architectural answer:`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || '';
    if (!answer) return null;

    return this.assembleQueryResult(query, answer, summary);
  }

  private async callOpenAiForQuery(
    query: string,
    summary: ArchitectureSummary,
    model: string
  ): Promise<NaturalLanguageQueryResult | null> {
    const contextPrompt = this.buildRepositoryContextPrompt(summary);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.includes('gpt') ? model : 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are the Principal AI Software Architect of Archon. Answer the user architectural question directly, accurately, and authoritatively based strictly on the provided repository evidence. Provide clear markdown formatting, list specific component names, file locations, risk scores, and actionable recommendations.',
          },
          {
            role: 'user',
            content: `REPOSITORY ARCHITECTURE EVIDENCE:\n${contextPrompt}\n\nUSER QUESTION: "${query}"\n\nProvide an insightful, evidence-backed architectural answer:`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || '';
    if (!answer) return null;

    return this.assembleQueryResult(query, answer, summary);
  }

  /**
   * Deterministic Semantic Reasoning Engine based on repository evidence
   */
  public generateGroundedArchitecturalResponse(
    query: string,
    summary: ArchitectureSummary
  ): NaturalLanguageQueryResult {
    const qLower = query.toLowerCase();
    const { nodes, edges, health, issues, securityFindings, patterns, repository } = summary;

    // Filter high-risk nodes
    const highRiskNodes = [...nodes]
      .filter((n) => n.risk.level === 'critical' || n.risk.level === 'high' || n.metrics.downstreamCount >= 3)
      .sort((a, b) => (b.risk.score + b.metrics.downstreamCount * 5) - (a.risk.score + a.metrics.downstreamCount * 5));

    // Filter circular dependency issues
    const circularIssues = issues.filter((i) => i.type === 'circular_dependency');

    let answer = '';

    // Intent 1: Risk / Hotspots / Fragility / Blast Radius / Breakages
    if (
      qLower.includes('risk') ||
      qLower.includes('hotspot') ||
      qLower.includes('fragil') ||
      qLower.includes('break') ||
      qLower.includes('blast') ||
      qLower.includes('critical') ||
      qLower.includes('vulnerab')
    ) {
      answer = `### 🚨 Architectural Risk & Critical Components in **${repository.name}**\n\n`;
      answer += `**Overall Health Grade:** **${health.grade}** (${health.overallScore}/100) — **Fragility Index:** **${health.fragility}%**\n\n`;

      if (highRiskNodes.length > 0) {
        answer += `#### 🔍 Top Components at Highest Architectural Risk:\n`;
        highRiskNodes.slice(0, 6).forEach((node, i) => {
          answer += `${i + 1}. **\`${node.name}\`** (\`${node.path}${node.line ? `:${node.line}` : ''}\`)\n`;
          answer += `   - **Risk Level:** \`${node.risk.level.toUpperCase()}\` (Score: ${node.risk.score}/100)\n`;
          answer += `   - **Downstream Blast Radius:** **${node.metrics.downstreamCount} components**\n`;
          answer += `   - **Callers / Dependencies:** ${node.metrics.incomingCount} incoming / ${node.metrics.outgoingCount} outgoing\n`;
          answer += `   - **Key Risk Signals:** ${node.risk.factors.join(', ') || 'High coupling'}\n\n`;
        });
      } else {
        answer += `✅ **No high-risk bottlenecks detected.** All components maintain low coupling and isolated blast radius boundaries.\n\n`;
      }

      if (circularIssues.length > 0) {
        answer += `#### ⚠️ Active Circular Dependency Loops (${circularIssues.length}):\n`;
        circularIssues.slice(0, 3).forEach((c) => {
          answer += `- ${c.title}: \`${c.evidence}\`\n`;
        });
        answer += `\n`;
      }

      if (securityFindings.length > 0) {
        answer += `#### 🔒 Security Vulnerabilities Detected (${securityFindings.length}):\n`;
        securityFindings.slice(0, 3).forEach((s) => {
          answer += `- **${s.title}** in \`${s.file}:${s.line}\` (${s.severity.toUpperCase()})\n`;
        });
      }
    }
    // Intent 2: Circular Dependencies
    else if (qLower.includes('circular') || qLower.includes('cycle') || qLower.includes('loop')) {
      answer = `### 🔄 Circular Dependency Audit for **${repository.name}**\n\n`;
      if (circularIssues.length === 0) {
        answer += `✅ **Zero Circular Dependencies Detected.** The codebase dependency graph is an acyclic DAG with clean layered separation.\n`;
      } else {
        answer += `Found **${circularIssues.length} circular dependency chains** in the repository:\n\n`;
        circularIssues.forEach((issue, idx) => {
          answer += `${idx + 1}. **${issue.title}**\n`;
          answer += `   - **Path:** \`${issue.evidence}\`\n`;
          answer += `   - **Remediation:** ${issue.remediation}\n\n`;
        });
      }
    }
    // Intent 3: Security & Leaks
    else if (qLower.includes('security') || qLower.includes('secret') || qLower.includes('leak') || qLower.includes('eval')) {
      answer = `### 🛡️ Security & Secret Audit for **${repository.name}**\n\n`;
      answer += `**Security Score:** **${health.security}/100** — Total Findings: **${securityFindings.length}**\n\n`;
      if (securityFindings.length === 0) {
        answer += `✅ **Zero security vulnerabilities found.** No hardcoded API keys, exposed secrets, dangerous \`eval()\`, or raw SQL injection vectors detected.\n`;
      } else {
        securityFindings.forEach((finding, idx) => {
          answer += `${idx + 1}. **${finding.title}** (\`${finding.severity.toUpperCase()}\`)\n`;
          answer += `   - **Location:** \`${finding.file}:${finding.line}\`\n`;
          answer += `   - **Remediation:** ${finding.remediation}\n\n`;
        });
      }
    }
    // Intent 4: General Architecture / Data Flow / Authentication / Services
    else {
      const apiNodes = nodes.filter((n) => n.type === 'api' || n.layer === 'api');
      const serviceNodes = nodes.filter((n) => n.type === 'service' || n.layer === 'service');
      const dbNodes = nodes.filter((n) => n.type === 'database' || n.layer === 'database');

      answer = `### 🏗️ Architecture Overview for **${repository.name}**\n\n`;
      answer += `**${repository.name}** is composed of **${nodes.length} components** across **${edges.length} relationships** with an overall health grade of **${health.grade}**.\n\n`;
      answer += `#### 📐 Architectural Layers:\n`;
      answer += `- **API & Gateways (${apiNodes.length} routes):** ${apiNodes.slice(0, 4).map((a) => `\`${a.name}\``).join(', ') || 'Standard entrypoints'}\n`;
      answer += `- **Services & Logic (${serviceNodes.length} services):** ${serviceNodes.slice(0, 4).map((s) => `\`${s.name}\``).join(', ') || 'Modular service layer'}\n`;
      answer += `- **Database & Models (${dbNodes.length} models):** ${dbNodes.slice(0, 4).map((d) => `\`${d.name}\``).join(', ') || 'Schema persistence'}\n\n`;

      if (highRiskNodes.length > 0) {
        answer += `#### ⚡ Key Architectural Hubs:\n`;
        highRiskNodes.slice(0, 3).forEach((node) => {
          answer += `- **\`${node.name}\`** (\`${node.path}\`): blast radius of ${node.metrics.downstreamCount} components with ${node.metrics.incomingCount} callers.\n`;
        });
      }
    }

    return this.assembleQueryResult(query, answer, summary);
  }

  private assembleQueryResult(
    query: string,
    answer: string,
    summary: ArchitectureSummary
  ): NaturalLanguageQueryResult {
    const qLower = query.toLowerCase();
    const tokens = qLower.split(/\W+/).filter((t) => t.length > 2);
    const nodes = summary.nodes;

    // Match top relevant nodes to populate execution flow & evidence coordinates
    const matchedNodes = [...nodes]
      .map((node) => {
        let score = 0;
        const name = node.name.toLowerCase();
        const path = node.path.toLowerCase();
        for (const t of tokens) {
          if (name.includes(t)) score += 10;
          if (path.includes(t)) score += 5;
        }
        if (qLower.includes('risk') && (node.risk.level === 'critical' || node.risk.level === 'high')) {
          score += 15 + node.metrics.downstreamCount;
        }
        return { node, score };
      })
      .filter((n) => n.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((n) => n.node);

    const topNodes = matchedNodes.length > 0 ? matchedNodes.slice(0, 6) : nodes.slice(0, 5);

    const pathSteps: NaturalLanguageQueryResult['pathSteps'] = topNodes.map((stepNode, i) => {
      let action = 'Domain logic execution';
      if (stepNode.type === 'api') action = 'Public HTTP Endpoint';
      else if (stepNode.type === 'database') action = 'Database Schema / Entity';
      else if (stepNode.type === 'service') action = `Service boundary (Blast: ${stepNode.metrics.downstreamCount})`;
      else if (stepNode.risk.level === 'critical' || stepNode.risk.level === 'high') {
        action = `High-Risk Hotspot (${stepNode.risk.score}/100, Blast: ${stepNode.metrics.downstreamCount})`;
      }

      return {
        nodeId: stepNode.id,
        nodeName: stepNode.name,
        nodeType: stepNode.type,
        action,
        file: stepNode.path,
        line: stepNode.line,
        snippet: stepNode.codeSnippet,
      };
    });

    const evidenceSnippets = topNodes
      .filter((n) => n.path)
      .slice(0, 4)
      .map((n) => ({
        file: n.path,
        line: n.line || 1,
        snippet: n.codeSnippet ? n.codeSnippet.split('\n')[0] : n.name,
      }));

    return {
      query,
      answer,
      pathSteps,
      relatedNodeIds: topNodes.map((n) => n.id),
      evidenceSnippets,
    };
  }

  private buildRepositoryContextPrompt(summary: ArchitectureSummary): string {
    const topRisk = [...summary.nodes]
      .filter((n) => n.risk.level === 'critical' || n.risk.level === 'high')
      .slice(0, 8)
      .map((n) => `- ${n.name} (${n.path}:${n.line || 1}) - Risk: ${n.risk.score}/100, Blast Radius: ${n.metrics.downstreamCount}, Risk Factors: ${n.risk.factors.join(', ')}`)
      .join('\n');

    const cycles = summary.issues
      .filter((i) => i.type === 'circular_dependency')
      .slice(0, 5)
      .map((c) => `- ${c.title} (${c.evidence})`)
      .join('\n');

    const security = summary.securityFindings
      .slice(0, 5)
      .map((s) => `- ${s.title} in ${s.file}:${s.line} (${s.severity})`)
      .join('\n');

    return `
REPOSITORY: ${summary.repository.name} (${summary.repository.totalFiles} files, ${summary.repository.totalLoc} LOC)
HEALTH GRADE: ${summary.health.grade} (${summary.health.overallScore}/100) - Maintainability: ${summary.health.maintainability}%, Reliability: ${summary.health.reliability}%, Fragility: ${summary.health.fragility}%
TOTAL COMPONENTS: ${summary.nodes.length}
TOTAL RELATIONSHIPS: ${summary.edges.length}

HIGH RISK COMPONENTS:
${topRisk || 'None'}

CIRCULAR DEPENDENCIES:
${cycles || 'None'}

SECURITY FINDINGS:
${security || 'None'}
`;
  }

  /**
   * Explain Change Impact for a single component
   */
  public async explainImpact(
    targetNode: ArchNode,
    impact: ImpactResult,
    relatedEdges: ArchEdge[]
  ): Promise<AiArchitectResponse> {
    if (this.openRouterKey) {
      try {
        const response = await this.callOpenRouter(targetNode, impact, relatedEdges);
        if (response) return response;
      } catch (err) {
        console.warn('[AIProvider] OpenRouter call failed, falling back:', err);
      }
    }

    if (this.openAiKey) {
      try {
        const response = await this.callOpenAi(targetNode, impact, relatedEdges);
        if (response) return response;
      } catch (err) {
        console.warn('[AIProvider] OpenAI call failed, falling back:', err);
      }
    }

    return this.generateDeterministicArchitectInsight(targetNode, impact, relatedEdges);
  }

  private async callOpenRouter(
    node: ArchNode,
    impact: ImpactResult,
    edges: ArchEdge[]
  ): Promise<AiArchitectResponse | null> {
    const prompt = this.buildContextPrompt(node, impact, edges);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://archon-architect.internal',
        'X-Title': 'Archon Codebase Architecture Intelligence',
      },
      body: JSON.stringify({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content:
              'You are the Principal AI Software Architect in the Archon platform. Analyze the provided codebase evidence and produce precise, evidence-grounded architectural reasoning. Return ONLY valid JSON with keys: summary, role, blastRadiusExplanation, potentialBreakages (array), inspectionChecklist (array), recommendedTests (array).',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return this.parseAiJsonResponse(content, node, impact, edges);
  }

  private async callOpenAi(
    node: ArchNode,
    impact: ImpactResult,
    edges: ArchEdge[]
  ): Promise<AiArchitectResponse | null> {
    const prompt = this.buildContextPrompt(node, impact, edges);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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

    if (!response.ok) return null;
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
