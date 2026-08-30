# ARCHON — External Sources, APIs & Dependency Reference

This document provides a verified, authoritative inventory of all external services, parser libraries, graph engines, and environment configurations utilized across the ARCHON platform.

---

## 1. External APIs & Cloud Services

### GitHub API & Git Ingestion
- **Purpose**: Fetch repository metadata, commit history, pull request diffs, and repository contents.
- **Library**: `simple-git` (v3.27.0) + Native GitHub REST API v3.
- **Official Documentation**: https://docs.github.com/en/rest
- **Authentication**: Optional `GITHUB_TOKEN` for accessing private repositories and increasing GitHub API rate limits from 60 to 5,000 req/hour.
- **Fallback Behavior**: If unauthenticated or no network is available for remote cloning, users can open local folders directly via native directory pickers or choose from pre-bundled sample repositories.

### AI LLM Providers (Abstracted Multi-Provider)
- **Primary / Default**: OpenRouter API (`https://openrouter.ai/api/v1`)
  - **Environment Variable**: `OPENROUTER_API_KEY`
  - **Default Model**: `anthropic/claude-3.5-sonnet` or `google/gemini-flash-1.5`
- **Secondary / Direct OpenAI**:
  - **Environment Variable**: `OPENAI_API_KEY`
  - **Default Model**: `gpt-4o` / `gpt-4o-mini`
- **Secondary / Direct Anthropic**:
  - **Environment Variable**: `ANTHROPIC_API_KEY`
  - **Default Model**: `claude-3-5-sonnet-20241022`
- **Fallback Behavior**: Deterministic offline mode. If no AI API key is configured or if the provider is down/rate-limited, all AST parsing, 2D/3D graph visualization, circular dependency detection, risk scoring, and blast radius simulations continue to function with 100% fidelity.

---

## 2. Core Parser & Static Analysis Libraries

| Library | Version | Official Documentation | Purpose |
| :--- | :--- | :--- | :--- |
| `@babel/parser` | `^7.26.9` | https://babeljs.io/docs/babel-parser | Parses modern JavaScript, TypeScript, JSX, and TSX into concrete Abstract Syntax Trees. |
| `@babel/traverse` | `^7.26.9` | https://babeljs.io/docs/babel-traverse | Traverses AST nodes to extract function declarations, classes, call expressions, and decorators. |
| `@babel/types` | `^7.26.9` | https://babeljs.io/docs/babel-types | Type definitions and AST node validators for Babel tree manipulation. |
| `simple-git` | `^3.27.0` | https://github.com/steveukx/simple-git | Safe Git subprocess wrapper for shallow cloning, commit logging, and branch inspection. |

---

## 3. Visualization & Rendering Engines

| Library | Version | Official Documentation | Purpose |
| :--- | :--- | :--- | :--- |
| `d3-force` | `^3.0.0` | https://d3js.org/d3-force | Physics simulation engine for high-performance 2D force-directed node positioning on HTML5 Canvas. |
| `three` | `^0.174.0` | https://threejs.org/docs/ | WebGL 3D rendering engine for interactive 3D spatial galaxy view of microservices and architectural tiers. |
| `framer-motion` | `^12.4.7` | https://www.framer.com/motion/ | Smooth UI micro-interactions, modal transitions, and accordion animations. |
| `lucide-react` | `^1.16.0` | https://lucide.dev/icons/ | High-clarity developer tool icon set. |

---

## 4. API Endpoints Reference

| Route | Method | Payload / Params | Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/analyze` | `POST` | `{ repoUrl, branch?, token?, isLocal?, prUrl? }` | `AnalysisSummary` | Initiates repository ingestion, AST parsing, graph generation, and health calculation. |
| `/api/repositories/:id` | `GET` | `id: string` | `AnalysisSummary` | Retrieves cached analysis results and graph data for a previously analyzed repository. |
| `/api/repositories/:id/impact` | `POST` | `{ nodeId: string, maxDepth?: number }` | `ImpactAnalysisResult` | Performs reverse graph traversal and calculates multi-layer change blast radius. |
| `/api/repositories/:id/ask` | `POST` | `{ question: string, contextNodeId?: string }` | `{ answer: string, relevantNodes: string[] }` | Queries grounded AI engine with focused subgraph neighborhood context. |
| `/api/repositories/:id/source` | `GET` | `filePath: string, line?: number` | `{ content: string, line: number }` | Fetches raw source code for inline evidence verification. |
| `/api/card` | `GET` | `id: string, theme?: string` | `image/svg+xml` | Generates a dynamic GitHub README badge card displaying health grade and architecture stats. |
| `/api/samples` | `GET` | `none` | `SampleRepoInfo[]` | Returns the list of pre-configured sample repositories for 1-click live analysis. |
