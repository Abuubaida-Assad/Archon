'use client';

import React, { useState } from 'react';
import { ArchNode, ArchitectureSummary, ImpactResult } from '@/types';
import { Header, AppViewMode } from '@/components/layout/Header';
import { HeroInput } from '@/components/hero/HeroInput';
import { DiscoverView } from '@/components/discover/DiscoverView';
import { ArchitectureMap2D } from '@/components/graph/ArchitectureMap2D';
import { ArchitectureMap3D } from '@/components/graph/ArchitectureMap3D';
import { CodeCanvasView } from '@/components/code/CodeCanvasView';
import { HealthSecurityView } from '@/components/health/HealthSecurityView';
import { ComponentInspector } from '@/components/inspector/ComponentInspector';
import { ImpactDrawer } from '@/components/impact/ImpactDrawer';
import { SourceViewerModal } from '@/components/source/SourceViewerModal';
import { IssuesList } from '@/components/issues/IssuesList';
import { ArchitectureOverview } from '@/components/overview/ArchitectureOverview';
import { CommandPalette } from '@/components/search/CommandPalette';
import { NaturalLanguageModal } from '@/components/ai/NaturalLanguageModal';
import { ArchonCardModal } from '@/components/card/CodeFlowCardModal';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function Home() {
  const [summary, setSummary] = useState<ArchitectureSummary | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchNode | null>(null);
  const [activeView, setActiveView] = useState<AppViewMode>('discover');

  // Loading & Progress States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [stageDetail, setStageDetail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Impact Analysis States
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
  const [impactedNodeIds, setImpactedNodeIds] = useState<string[]>([]);
  const [activePathNodeIds, setActivePathNodeIds] = useState<string[]>([]);

  // Modals & Panels
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [askAiOpen, setAskAiOpen] = useState<boolean>(false);
  const [cardModalOpen, setCardModalOpen] = useState<boolean>(false);
  const [sourceModalPath, setSourceModalPath] = useState<string | null>(null);
  const [sourceModalLine, setSourceModalLine] = useState<number>(1);

  // Analyze Repository Handler (Supports URL, Token, Branch, and Local Folder File uploads)
  const handleAnalyze = async (url: string, branch?: string, token?: string, localFiles?: any[]) => {
    setIsLoading(true);
    setErrorMessage('');
    setCurrentStage('Validating repository and preparing sandbox');
    setProgressPercent(15);
    setStageDetail(localFiles ? `Parsing ${localFiles.length} local files in browser` : `Target: ${url}`);

    try {
      const stageTimer = setTimeout(() => {
        setCurrentStage('AST Parsing & Symbol Extraction');
        setProgressPercent(50);
        setStageDetail('Extracting functions, classes, imports, routes, and DB operations');
      }, 1200);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, branch, token, files: localFiles }),
      });

      clearTimeout(stageTimer);

      let data: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status >= 500
            ? `Server encountered an issue (HTTP ${res.status}). If this repository is private, please provide a GitHub Personal Access Token.`
            : `Server response error (${res.status}): ${text.slice(0, 100)}`
        );
      }

      if (data.success && data.summary) {
        setProgressPercent(100);
        setCurrentStage('Analysis complete');
        setSummary(data.summary);

        // Select top hub or first important service/function by default
        const topNode =
          data.summary.nodes.find((n: ArchNode) => n.type === 'service' || n.metrics.centrality > 0.5) ||
          data.summary.nodes[0];
        if (topNode) {
          setSelectedNode(topNode);
        }
      } else {
        setErrorMessage(data.error || 'Repository analysis failed. Please verify the URL.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error connecting to analysis server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Change Impact Analysis Handler
  const handleAnalyzeImpact = async (nodeId: string) => {
    if (!summary) return;

    try {
      const res = await fetch(`/api/repositories/${summary.repository.id}/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: nodeId,
          nodes: summary.nodes,
          edges: summary.edges,
        }),
      });

      const data = await res.json();
      if (data.success && data.impact) {
        setImpactResult(data.impact);
        const impactedIds = data.impact.impactedComponents.map((item: any) => item.node.id);
        setImpactedNodeIds([nodeId, ...impactedIds]);

        if (data.impact.dependencyPaths.length > 0) {
          setActivePathNodeIds(data.impact.dependencyPaths[0].path);
        }
      }
    } catch (err) {
      console.error('[Change Impact] Failed:', err);
    }
  };

  const handleSelectNode = (node: ArchNode) => {
    setSelectedNode(node);
  };

  const handleSelectNodeById = (nodeId: string) => {
    if (!summary) return;
    const found = summary.nodes.find((n) => n.id === nodeId);
    if (found) {
      setSelectedNode(found);
      setActiveView('2d');
    }
  };

  const handleOpenSource = (filePath: string, line?: number) => {
    setSourceModalPath(filePath);
    setSourceModalLine(line || 1);
  };

  const handleNewAnalysis = () => {
    setSummary(null);
    setSelectedNode(null);
    setImpactResult(null);
    setImpactedNodeIds([]);
    setErrorMessage('');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Application Header */}
      <Header
        summary={summary}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAskAi={() => setAskAiOpen(true)}
        onOpenCardModal={() => setCardModalOpen(true)}
        onNewAnalysis={handleNewAnalysis}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {!summary ? (
          <HeroInput
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            currentStage={currentStage}
            progressPercent={progressPercent}
            stageDetail={stageDetail}
            errorMessage={errorMessage}
          />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Main Center Visualization / Dashboard Canvas */}
            <div className="flex-1 h-full relative overflow-hidden">
              {activeView === 'discover' && (
                <DiscoverView
                  summary={summary}
                  selectedNode={selectedNode}
                  onSelectNode={handleSelectNode}
                  onAnalyzeImpact={handleAnalyzeImpact}
                  onOpenSource={handleOpenSource}
                />
              )}

              {activeView === '2d' && (
                <ArchitectureMap2D
                  nodes={summary.nodes}
                  edges={summary.edges}
                  selectedNodeId={selectedNode?.id || null}
                  impactedNodeIds={impactedNodeIds}
                  activePathNodeIds={activePathNodeIds}
                  onSelectNode={handleSelectNode}
                  onAnalyzeImpact={handleAnalyzeImpact}
                />
              )}

              {activeView === 'code' && (
                <CodeCanvasView
                  nodes={summary.nodes}
                  edges={summary.edges}
                  selectedNodeId={selectedNode?.id || null}
                  impactedNodeIds={impactedNodeIds}
                  onSelectNode={handleSelectNode}
                  onOpenSource={handleOpenSource}
                  onAnalyzeImpact={handleAnalyzeImpact}
                />
              )}

              {activeView === '3d' && (
                <ArchitectureMap3D
                  nodes={summary.nodes}
                  edges={summary.edges}
                  selectedNodeId={selectedNode?.id || null}
                  impactedNodeIds={impactedNodeIds}
                  onSelectNode={handleSelectNode}
                />
              )}

              {activeView === 'health' && (
                <HealthSecurityView
                  health={summary.health}
                  securityFindings={summary.securityFindings}
                  patterns={summary.patterns}
                  issues={summary.issues}
                  nodes={summary.nodes}
                  onSelectNodeById={handleSelectNodeById}
                  onOpenSource={handleOpenSource}
                />
              )}

              {activeView === 'overview' && (
                <ArchitectureOverview
                  summary={summary}
                  onSelectNode={handleSelectNode}
                  onAnalyzeImpact={handleAnalyzeImpact}
                />
              )}

              {activeView === 'issues' && (
                <IssuesList
                  issues={summary.issues}
                  nodes={summary.nodes}
                  onSelectNodeById={handleSelectNodeById}
                />
              )}
            </div>

            {/* Right Component Inspector Panel (Only in 2D & 3D maps) */}
            {(activeView === '2d' || activeView === '3d') && (
              <div className="w-80 sm:w-96 h-full shrink-0 border-l border-surface-border">
                <ComponentInspector
                  node={selectedNode}
                  edges={summary.edges}
                  allNodes={summary.nodes}
                  onSelectNode={handleSelectNode}
                  onAnalyzeImpact={handleAnalyzeImpact}
                  onOpenSource={handleOpenSource}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      {impactResult && (
        <ImpactDrawer
          impact={impactResult}
          onClose={() => setImpactResult(null)}
          onSelectNodeById={handleSelectNodeById}
          onOpenSource={handleOpenSource}
        />
      )}

      {sourceModalPath && summary && (
        <SourceViewerModal
          repoId={summary.repository.id}
          filePath={sourceModalPath}
          targetLine={sourceModalLine}
          nodes={summary.nodes}
          onClose={() => setSourceModalPath(null)}
        />
      )}

      {summary && (
        <>
          <CommandPalette
            isOpen={searchOpen || askAiOpen}
            onClose={() => {
              setSearchOpen(false);
              setAskAiOpen(false);
            }}
            nodes={summary.nodes}
            repoId={summary.repository.id}
            onSelectNode={handleSelectNode}
            onSelectNodeById={handleSelectNodeById}
            onViewChange={(v: any) => setActiveView(v)}
            onOpenSource={handleOpenSource}
          />

          <ArchonCardModal
            isOpen={cardModalOpen}
            onClose={() => setCardModalOpen(false)}
            summary={summary}
          />
        </>
      )}

      {/* Floating Theme Toggle (Dark / Light Mode) */}
      <ThemeToggle />
    </div>
  );
}
