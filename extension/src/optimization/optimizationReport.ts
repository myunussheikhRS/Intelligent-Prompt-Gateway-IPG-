import { OptimizationRunMetric, OptimizationSummary } from "./optimizationMetrics";

export class OptimizationReport {
  public buildRunReport(metric: OptimizationRunMetric): string {
    const modeLabel = metric.copilotPayloadMode ? metric.copilotPayloadMode.toUpperCase() : "n/a";
    const baselineTokens = metric.baselineTokens?.toLocaleString() ?? "n/a";
    const payloadTokens = metric.copilotPayloadTokens?.toLocaleString() ?? "n/a";
    const payloadSaved =
      metric.baselineTokens !== undefined && metric.copilotPayloadTokens !== undefined
        ? Math.max(0, metric.baselineTokens - metric.copilotPayloadTokens).toLocaleString()
        : "n/a";

    return [
      "Rocket - IPG - Context Optimization Report",
      `Timestamp: ${metric.timestamp}`,
      `Query: ${metric.query}`,
      `Files Processed: ${metric.filesProcessed}`,
      `Original Tokens: ${metric.originalTokens.toLocaleString()}`,
      `Optimized Tokens: ${metric.optimizedTokens.toLocaleString()}`,
      `Saved Tokens: ${metric.savedTokens.toLocaleString()}`,
      `Reduction: ${metric.reductionPercent}%`,
      metric.largestFile ? `Largest Context File: ${metric.largestFile}` : "Largest Context File: n/a",
      `Copilot Payload Mode: ${modeLabel}`,
      `Baseline Tokens (Raw Context + Question): ${baselineTokens}`,
      `Payload Tokens (Copied Prompt): ${payloadTokens}`,
      `Payload Tokens Saved: ${payloadSaved}`,
      metric.estimatedSavingsUsd !== undefined ? `Estimated Payload Savings (USD): $${metric.estimatedSavingsUsd}` : "Estimated Payload Savings (USD): n/a"
    ].join("\n");
  }

  public buildSummary(summary: OptimizationSummary): string {
    return [
      "Rocket - IPG - AI Efficiency Dashboard",
      `Total Runs: ${summary.totalRuns}`,
      `Total Tokens Processed: ${summary.totalTokensProcessed.toLocaleString()}`,
      `Optimized Tokens: ${summary.totalOptimizedTokens.toLocaleString()}`,
      `Saved Tokens: ${summary.totalSavedTokens.toLocaleString()}`,
      `Average Reduction: ${summary.averageReduction}%`,
      `Largest Reduction: ${summary.largestReduction}%`,
      `Estimated Cost Savings: $${summary.estimatedCostSavingsUsd.toLocaleString()}`,
      `Most Expensive Prompt: ${summary.mostExpensivePromptTokens.toLocaleString()} tokens`,
      `AI Efficiency Score: ${summary.efficiencyScore}/100`
    ].join("\n");
  }
}
