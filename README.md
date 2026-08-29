<div align="center">

# ARCHON
### AI-Powered Codebase Architecture Intelligence 

*Understand the architecture. Trace the dependencies. Predict the impact.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Babel AST](https://img.shields.io/badge/Babel-AST%20Parser-F9DC3E?logo=babel&logoColor=black)](https://babeljs.io/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Galaxy-000000?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Zero Mock](https://img.shields.io/badge/Engine-100%25%20Deterministic-10B981)](#)

</div>

---

## What is Archon?

**Archon** transforms any Git repository URL or local folder into an interactive, multi-layer software architecture model. It provides a structured **Discover Mind Map** for hierarchical folder-to-file exploration and reading, alongside an interactive **2D/3D Graph Visualizer** that simulates the exact **blast radius** before you modify a line of code.

```text
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│  Git Repository │ ────► │ Multi-Language AST   │ ────► │ Knowledge Graph &    │
│  (URL / Local)  │       │ (TS / JS / PY / MD)  │       │ Blast Radius Engine  │
└─────────────────┘       └──────────────────────┘       └──────────┬───────────┘
                                                                    │
          ┌─────────────────────────────────────────────────────────┼────────────────────────────────┐
          ▼                                                         ▼                                ▼
┌──────────────────┐                                      ┌──────────────────┐             ┌──────────────────┐
│ Discover MindMap │                                      │ Graph Visualizer │             │ Grounded AI      │
│ & File Reader    │                                      │ (2D & 3D Galaxy) │             │ Blast Radius     │
└──────────────────┘                                      └──────────────────┘             └──────────────────┘
```

---

## Architectural Tree

```text
archon-engine/
├── Ingestion Layer
│   ├── Git Ingestion (simple-git, shallow clone, .gitignore & vendor filtering)
│   └── Local Folder Picker (Direct browser memory processing)
├── Multi-Language AST Parsers
│   ├── JsTsParser (@babel/parser & @babel/traverse) ──► Functions, Classes, Calls, APIs, ORMs
│   ├── PythonParser (AST Regex Engine)              ──► Flask/FastAPI routes, SQLAlchemy models
│   ├── MarkdownParser (Obsidian/Wiki-links)         ──► Architecture documentation mapping
│   └── SecurityScanner                              ──► Hardcoded API keys, JWTs, eval(), SQL injections
├── Deterministic Graph Core
│   ├── GraphBuilder       ──► Multi-layer directed graph with verified source coordinates
│   ├── GraphAlgorithms    ──► Cycle detection (Tarjan/DFS), shortest path, degree centrality
│   ├── ImpactEngine       ──► Reverse dependency traversal, API breakages, affected test suite
│   └── HealthCalculator   ──► Letter grade (A-F), circular dependencies, coupling bottlenecks
└── Interface Views
    ├── DiscoverView       ──► Category-to-file mind map explorer with inline code reader
    ├── ArchitectureMap2D  ──► High-performance HTML5 Canvas 2D graph visualizer
    ├── ArchitectureMap3D  ──► Three.js WebGL 3D spatial galaxy view
    ├── CodeCanvasView     ──► Interactive code editor with symbol navigation & file tree
    └── AiProvider         ──► Subgraph neighborhood grounding (OpenRouter / OpenAI / Anthropic)
```

---

## Key Capabilities

| Capability | Description |
| :--- | :--- |
| **Discover Mind Map Explorer** | NotebookLM-style interactive category-to-file mind map. Click any category to reveal modules, expand files, and read syntax-highlighted source code inline. |
| **Multi-Language AST Extraction** | Extracts concrete functions, interfaces, methods, Express/Next.js/FastAPI routes, Prisma/Mongoose models, and SQL queries with exact file and line coordinates. |
| **Change Impact Blast Radius** | 1-click blast radius simulator computing downstream casualties across services, API routes, database entities, and test files before modifying code. |
| **Circular Dependency Detection** | Algorithmic cycle detection identifying circular loops (A -> B -> C -> A) and high-coupling architectural bottlenecks. |
| **Health & Security Scorecard** | Letter-graded codebase health scoring (A to F) calculating cyclomatic complexity, test coverage, and exposed secrets (AWS, Stripe, OpenAI, JWT). |
| **Evidence-Grounded AI** | AI architectural reasoning grounded strictly in the extracted subgraph neighborhood with built-in prompt-injection defenses. |
| **2D Canvas & 3D WebGL Visualizer** | Switch effortlessly between high-speed 2D force-directed canvas maps and illuminated 3D spatial visual representations. |

---

## Change Impact Pipeline

```text
[Modified Function] ──► Direct Callers (Depth 1)
                             │
                             ├──► Indirect Callers (Depth 2+)
                             │          │
                             │          └──► Exposed HTTP APIs (POST /api/orders)
                             │
                             ├──► Database Models (Prisma / Mongoose / SQL)
                             │
                             └──► Affected Unit / Integration Test Suites
```

---

## Quickstart

### 1. Install & Run
```bash
# Clone and install dependencies
git clone https://github.com/your-username/archon.git
cd archon
npm install

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Test Suite
```bash
npm test
```
```text
✔ RepoManager - URL Parsing & Validation
✔ JsTsParser - AST Extraction for Functions, Calls, APIs, DBs
✔ PythonParser - Python AST Routes & Models Extraction
✔ GraphAlgorithms - Cycle Detection & Downstream Traversal
✔ IssueDetector - Circular Dependencies & Coupling Hotspots
✔ End-to-End Orchestrator, Impact Analysis, and AI Insights
✔ SecurityScanner - Secret Leaks, Dangerous eval, and SQL Injection Detection
✔ HealthCalculator - Letter Grade & Codebase Health Scoring

9 passed, 0 failed (100% deterministic)
```

---

## Configuration (Optional)

Archon is **100% functional offline** with zero setup. To enable online AI explanations:

```bash
# Copy example configuration
cp .env.example .env.local
```

```env
# Optional AI Provider (OpenRouter, OpenAI, or Anthropic)
OPENROUTER_API_KEY=your_key_here
AI_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Optional GitHub Personal Access Token (for private repos & higher rate limits)
GITHUB_TOKEN=ghp_your_token_here
```

---

## Documentation

- [Product Requirements Document (PRD)](docs/PRD.md)
- [System Architecture & Data Flows](docs/ARCHITECTURE.md)
- [External APIs & Sources Reference](docs/SOURCES_AND_APIS.md)

---

## License

MIT License. Built for the Autonomous Codebase Architecture Mapper Hackathon.
