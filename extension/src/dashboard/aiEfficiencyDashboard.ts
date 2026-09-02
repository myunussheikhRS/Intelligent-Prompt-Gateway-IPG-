import * as vscode from "vscode";
import { OptimizationSummary } from "../optimization/optimizationMetrics";

export class AiEfficiencyDashboard {
  private panel: vscode.WebviewPanel | undefined;

  public open(summary: OptimizationSummary): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "rocketAiShieldEfficiency",
        "Rocket - IPG AI Efficiency Dashboard",
        vscode.ViewColumn.Beside,
        { enableScripts: false }
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    } else {
      this.panel.reveal(vscode.ViewColumn.Beside);
    }

    this.panel.webview.html = this.render(summary);
  }

  private render(summary: OptimizationSummary): string {
    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      :root{--bg:#091423;--card:#112944;--line:#2f4d71;--text:#e5f0ff;--muted:#9cb8dc;--ok:#44e0a6;--brand:#00c2ff}
      body{margin:0;padding:16px;background:radial-gradient(700px 260px at 8% -20%, rgba(0,194,255,.25), transparent), var(--bg);color:var(--text);font-family:Segoe UI, Tahoma, sans-serif}
      .title{font-size:22px;font-weight:700}
      .tag{font-size:12px;color:var(--muted);margin-bottom:10px}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
      .card{background:linear-gradient(180deg, rgba(17,41,68,.96), rgba(13,31,52,.92));border:1px solid var(--line);border-radius:10px;padding:10px}
      .k{font-size:12px;color:var(--muted)}
      .v{font-size:24px;font-weight:700}
      .ok{color:var(--ok)}
      .foot{margin-top:12px;padding:10px;background:#0f223a;border:1px solid var(--line);border-radius:10px}
    </style></head><body>
      <div class="title">AI Efficiency Dashboard</div>
      <div class="tag">Protect AI. Optimize AI. Govern AI.</div>
      <div class="grid">
        <div class="card"><div class="k">Total Tokens Processed</div><div class="v">${summary.totalTokensProcessed.toLocaleString()}</div></div>
        <div class="card"><div class="k">Optimized Tokens</div><div class="v">${summary.totalOptimizedTokens.toLocaleString()}</div></div>
        <div class="card"><div class="k">Saved Tokens</div><div class="v ok">${summary.totalSavedTokens.toLocaleString()}</div></div>
        <div class="card"><div class="k">Average Reduction</div><div class="v">${summary.averageReduction}%</div></div>
        <div class="card"><div class="k">Largest Reduction</div><div class="v">${summary.largestReduction}%</div></div>
        <div class="card"><div class="k">Estimated Cost Savings</div><div class="v">$${summary.estimatedCostSavingsUsd.toLocaleString()}</div></div>
        <div class="card"><div class="k">Most Expensive Prompt</div><div class="v">${summary.mostExpensivePromptTokens.toLocaleString()}</div></div>
        <div class="card"><div class="k">AI Efficiency Score</div><div class="v">${summary.efficiencyScore}/100</div></div>
      </div>
      <div class="foot">Runs analyzed: ${summary.totalRuns}</div>
    </body></html>`;
  }
}
