# Product Requirements Document (PRD)
## ARCHON — Autonomous Codebase Architecture Intelligence

**Version:** 1.0.0 (Production Release)  
**Status:** Complete & Demo-Ready  
**Product Positioning:** AI-Powered Codebase Architecture Mapping, Relationship Discovery, and Evidence-Grounded Change Impact Analysis  
**Tagline:** *Understand the architecture. Trace the dependencies. Predict the impact.*

---

## 1. Executive Summary & Vision

Software development teams are constantly faced with understanding large, unfamiliar, or rapidly evolving codebases. Traditional static code analysis or repository visualizers only offer surface-level file exploration, directory trees, or simple import lists. They fail to expose what a component does, what depends on it, what it depends on, and the ripple effects when a change is made.

**ARCHON** is an autonomous architectural intelligence platform. Given any Git repository URL or local directory, ARCHON parses ASTs, discovers multi-layer relationships (functions, classes, API routes, database models, events, tests), constructs an evidence-backed directed knowledge graph, calculates topological graph metrics, and provides explainable change-impact blast radius simulations paired with evidence-grounded AI architectural reasoning.

---

## 2. Core Problem & Solution

| Problem in Modern Engineering | ARCHON Solution |
| :--- | :--- |
| **Hidden Blast Radius**: Modifying a function breaks distant services, background jobs, or DB queries unexpectedly. | **Deterministic Change Impact Engine**: Traverses reverse dependency paths, categorizing impact into direct, indirect, API, database, and test boundaries. |
| **Architectural Drift & Circularities**: Hidden circular dependencies degrade modularity and increase build/test fragility. | **Algorithmic Issue Detection**: Detects circular loops via Tarjan's/Johnson's algorithm, flags coupling bottlenecks, and calculates centrality. |
| **Hallucinating AI Assistants**: Generic LLMs hallucinate non-existent files, functions, or outdated APIs. | **Grounded AI Context Engine**: AI prompts are injected strictly with observed graph neighborhood nodes, typed edge evidence, risk metrics, and source snippets. |
| **Lack of Evidence**: Visualizers draw abstract boxes without verifiable proof. | **100% Evidence-Backed Links**: Every graph edge and impact path links directly to exact file paths and line numbers with inline source viewers. |

---

## 3. User Personas & Core Journeys

### Primary Personas
1. **Senior / Staff Software Engineers**: Refactoring legacy modules, planning major architectural migrations, and evaluating pull request blast radiuses.
2. **Onboarding Engineers**: Rapidly grokking the end-to-end data flow, API endpoints, database interactions, and service layers of an unfamiliar repository.
3. **Tech Leads & Security Reviewers**: Auditing architectural health, security secret exposures, circular dependencies, and low-test/high-impact hotspots.

### The Golden User Journey
```text
1. Input Git Repository URL (e.g., https://github.com/expressjs/express or any public/private repo)
   ↓
2. Clone & Ingest safely into sandboxed storage with .gitignore and vendor filtering
   ↓
3. Multi-Language AST Parsing (TypeScript, JavaScript, Python, Markdown) extracting symbols
   ↓
4. Relationship Discovery (IMPORTS, CALLS, EXPOSES, CONSUMES, READS, WRITES, TESTED_BY)
   ↓
5. Graph Construction & Graph Algorithms (Centrality, Cycles, Connected Components, Risk Scoring)
   ↓
6. Interactive 2D & 3D Visual Architecture Map Exploration
   ↓
7. Component Inspection with Deep Evidence & Source Snippet Viewer
   ↓
8. 1-Click Change Impact Blast Radius Simulation (Calculates downstream cascade)
   ↓
9. Evidence-Grounded AI Reasoning ("What could break if I modify this component?")
```

---

## 4. Feature Matrix & Implementation Status

| Feature Area | PRD Requirement | Implementation | Status | Evidence Verification |
| :--- | :--- | :--- | :---: | :--- |
| **Repository Ingestion** | Safe Git cloning, shallow depth, vendor exclusion, size validation | `RepoManager` (`src/lib/analyzer/repo-manager.ts`) using `simple-git` | **Complete** | Real git clones, supports private PATs and local folders |
| **AST Symbol Extraction** | Functions, classes, interfaces, types, methods, export metadata | `JsTsParser` (`@babel/parser` & `@babel/traverse`) + `PythonParser` | **Complete** | Extracts AST nodes with exact file and line coordinates |
| **Relationship Discovery** | `CALLS`, `EXPOSES`, `CONSUMES`, `READS`, `WRITES`, `TESTED_BY`, `IMPORTS` | `PatternDetector` + `GraphBuilder` | **Complete** | Evidence object attached to every single edge |
| **Graph Intelligence** | Downstream traversal, shortest path, cycle detection, degree centrality | `GraphAlgorithms` (`src/lib/graph/graph-algorithms.ts`) | **Complete** | Graph algorithms pass deterministic unit tests |
| **Change Impact Engine** | Multi-depth blast radius, cascading indirect impact, affected APIs & DBs | `ImpactEngine` (`src/lib/impact/impact-engine.ts`) | **Complete** | Generates step-by-step verifiable impact paths |
| **Risk & Health Engine** | Risk score (0-100), Letter grade (A-F), circular dependencies, security leaks | `HealthCalculator` + `SecurityScanner` + `IssueDetector` | **Complete** | Deterministic formulas based on observable metrics |
| **Grounded AI Engine** | Multi-provider AI reasoning, fallback support, prompt-injection defense | `AiProvider` (`src/lib/ai/ai-provider.ts`) | **Complete** | Grounded in subgraph neighborhood evidence |
| **Interactive 2D Map** | Force-directed graph, pan, zoom, search, filtering, focus modes | `ArchitectureMap2D` (`src/components/graph/ArchitectureMap2D.tsx`) | **Complete** | Canvas-based force simulation with dynamic physics |
| **Interactive 3D Galaxy** | Spatial 3D representation of services, tiers, and data flows | `ArchitectureMap3D` (`src/components/graph/ArchitectureMap3D.tsx`) | **Complete** | Three.js WebGL spatial visualizer |
| **Code Canvas** | File tree explorer, code canvas nodes, and inline source inspection | `CodeCanvasView` (`src/components/code/CodeCanvasView.tsx`) | **Complete** | Integrated Monaco-style syntax highlighting & tabs |
| **Command Palette** | `Cmd+K` global search across all symbols, files, APIs, and actions | `CommandPalette` (`src/components/search/CommandPalette.tsx`) | **Complete** | Instant fuzzy search across entire symbol table |
| **Pull Request Blast Radius** | Analyze GitHub PR URL and calculate affected blast radius | `HeroInput` + `RepoManager.analyzePullRequest` | **Complete** | Diff-aware impact tracing |

---

## 5. Architectural Quality Attributes

- **Determinism**: Graph algorithms, metrics, risk scores, and blast radius simulations are 100% deterministic and do not depend on probabilistic LLMs.
- **Security**: Repository files are treated strictly as untrusted data. No arbitrary code execution (`npm install` or `eval`) is permitted. System prompts contain prompt-injection boundaries.
- **Resilience**: If AI API keys (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`) are missing or rate-limited, all core features (graph mapping, AST parsing, impact analysis, risk calculation, code viewing) continue to operate with graceful degradation.
