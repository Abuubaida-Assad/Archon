import { ArchNode, ArchEdge, ArchIssue, SecurityFinding, PatternFinding, HealthScore, HealthGrade } from '@/types';

export class HealthCalculator {
  /**
   * Calculate codebase health metrics, letter grade (A+ through F), and fragility
   * based strictly on observable architectural evidence and graph topology.
   */
  public computeHealthScore(
    nodes: ArchNode[],
    edges: ArchEdge[],
    issues: ArchIssue[],
    securityFindings: SecurityFinding[],
    patterns: PatternFinding[]
  ): HealthScore {
    const totalNodes = nodes.length || 1;

    // 1. Dead Code calculation (isolated true unused components)
    const deadCodeNodes = nodes.filter((n) => n.metrics.isDeadCode);
    const deadCodePercent = Math.min(100, Math.round((deadCodeNodes.length / totalNodes) * 100));

    // 2. Circular Dependencies (critical architectural flaw)
    const circularIssues = issues.filter((i) => i.type === 'circular_dependency');
    const circularCycles = circularIssues.map((i) => i.cyclePath || i.nodeIds);
    const circularCount = circularIssues.length;

    // 3. Coupling Hotspots & God Objects
    const couplingHotspots = issues.filter((i) => i.type === 'high_coupling_hotspot');
    const godObjects = patterns.filter((p) => p.type === 'god_object');

    // 4. Security Findings
    const criticalSecCount = securityFindings.filter((s) => s.severity === 'critical').length;
    const highSecCount = securityFindings.filter((s) => s.severity === 'high').length;
    const mediumSecCount = securityFindings.filter((s) => s.severity === 'medium').length;

    // 5. Test Coverage Presence
    const testNodes = nodes.filter((n) => n.type === 'test' || n.layer === 'test');
    const hasTests = testNodes.length > 0;

    // 6. Layer Separation (Clean separation across tiers)
    const distinctLayers = new Set(nodes.map((n) => n.layer)).size;
    const isWellLayered = distinctLayers >= 3;

    // --- Sub-Metric Calculations (0 - 100) ---

    // A. Maintainability
    // Baseline 100. Deductions for dead code, high coupling bottlenecks, and excessive cyclomatic complexity
    const avgComplexity = totalNodes > 0
      ? nodes.reduce((sum, n) => sum + (n.metrics.complexity || 1), 0) / totalNodes
      : 1;
    let maintainability = 100
      - (deadCodePercent * 0.5)
      - (couplingHotspots.length * 3)
      - (godObjects.length * 4)
      - Math.min(15, Math.max(0, (avgComplexity - 3) * 2));
    if (isWellLayered) maintainability += 4;
    maintainability = Math.max(15, Math.min(100, Math.round(maintainability)));

    // B. Reliability
    // Baseline 100. Heavily penalized by circular import cycles and unhandled god objects
    let reliability = 100
      - (circularCount * 10)
      - (godObjects.length * 5)
      - (couplingHotspots.length * 2);
    if (hasTests) reliability += 5;
    reliability = Math.max(10, Math.min(100, Math.round(reliability)));

    // C. Security Score
    // Baseline 100. Penalized strictly by detected leaked secrets, dangerous evals, or SQL injections
    let security = 100
      - (criticalSecCount * 25)
      - (highSecCount * 12)
      - (mediumSecCount * 5);
    security = Math.max(10, Math.min(100, Math.round(security)));

    // D. Fragility Index (0 - 100: lower is better / safer)
    // Higher average blast radius & cyclic coupling = higher probability of cascading breakages
    const avgBlast = totalNodes > 0
      ? nodes.reduce((sum, n) => sum + (n.metrics.downstreamCount || 0), 0) / totalNodes
      : 0;
    let fragility = Math.min(100, Math.round(
      (circularCount * 12) +
      (couplingHotspots.length * 6) +
      (godObjects.length * 5) +
      (avgBlast * 2.5)
    ));
    fragility = Math.max(0, fragility);

    // E. Overall Composite Score (0 - 100)
    const overallScore = Math.max(0, Math.min(100, Math.round(
      maintainability * 0.40 + reliability * 0.40 + security * 0.20
    )));

    // F. Determine Letter Grade
    let grade: HealthGrade = 'A';
    if (overallScore >= 95 && circularCount === 0 && criticalSecCount === 0) grade = 'A+';
    else if (overallScore >= 85 && circularCount === 0) grade = 'A';
    else if (overallScore >= 75) grade = 'B';
    else if (overallScore >= 60) grade = 'C';
    else if (overallScore >= 45) grade = 'D';
    else grade = 'F';

    // G. Scale Category
    let scaleGrade: HealthScore['scaleGrade'] = 'Medium';
    if (totalNodes < 15) scaleGrade = 'Micro';
    else if (totalNodes <= 40) scaleGrade = 'Small';
    else if (totalNodes <= 150) scaleGrade = 'Medium';
    else if (totalNodes <= 500) scaleGrade = 'Large';
    else scaleGrade = 'Enterprise';

    // H. Summary Statement
    let summary = '';
    if (grade.startsWith('A')) {
      summary = `High-quality modular codebase with clean layer separation, ${deadCodePercent}% dead code, and zero dependency cycles.`;
    } else if (grade === 'B') {
      summary = `Solid architecture with minor coupling hotspots (${couplingHotspots.length}) and ${circularCount} dependency cycle${circularCount === 1 ? '' : 's'}.`;
    } else if (grade === 'C') {
      summary = `Moderate architectural debt: ${circularCount} circular dependenc${circularCount === 1 ? 'y' : 'ies'} and ${securityFindings.length} security alerts detected.`;
    } else {
      summary = `Architectural refactoring advised: high fragility (${fragility}%), cascading coupling bottlenecks, and security exposures.`;
    }

    return {
      grade,
      overallScore,
      maintainability,
      reliability,
      security,
      fragility,
      deadCodePercent,
      circularDependenciesCount: circularCount,
      circularCycles,
      couplingHotspotsCount: couplingHotspots.length,
      securityIssuesCount: securityFindings.length,
      patternsCount: patterns.length,
      scaleGrade,
      summary,
    };
  }
}

export const defaultHealthCalculator = new HealthCalculator();
