import * as vscode from "vscode";
import { AnalyticsSnapshot } from "../aiShield/analytics";
import { AuditRecord } from "../models/auditRecord";
import { OptimizationSummary } from "../optimization/optimizationMetrics";

export class SocDashboard {
  private panel: vscode.WebviewPanel | undefined;

  public open(snapshot: AnalyticsSnapshot, records: AuditRecord[], trend7: number[], trend30: number[], efficiency?: OptimizationSummary): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel("rocketAiShieldSoc", "Rocket - IPG SOC Dashboard", vscode.ViewColumn.Beside, {
        enableScripts: false
      });
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    } else {
      this.panel.reveal(vscode.ViewColumn.Beside);
    }

    this.panel.webview.html = this.render(snapshot, records, trend7, trend30, efficiency);
  }

  private render(snapshot: AnalyticsSnapshot, records: AuditRecord[], trend7: number[], trend30: number[], efficiency?: OptimizationSummary): string {
    const vulnRows = this.topItems(records, "AI_RED_TEAM");
    const mcpRows = this.topItems(records, "MCP_SCAN");
    const optimizationRows = this.topOptimization(records);
    const totalSavedTokens = efficiency?.totalSavedTokens ?? snapshot.tokensSavedTotal;
    const estimatedCostSaved = efficiency?.estimatedCostSavingsUsd ?? snapshot.estimatedCostSavingsUsd;
    const expensivePrompt = efficiency?.mostExpensivePromptTokens ?? 0;

    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>
      body{font-family:Segoe UI,sans-serif;background:#081425;color:#e5efff;padding:16px;margin:0}
      h2{margin:0 0 12px 0}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-bottom:10px}
      .card{background:#112642;border:1px solid #274263;border-radius:10px;padding:10px}
      .k{font-size:12px;color:#9cb3d3}
      .v{font-size:24px;font-weight:700}
      table{width:100%;border-collapse:collapse;font-size:12px}
      td,th{border-bottom:1px solid #274263;padding:6px;text-align:left}
      .section{background:#0f213a;border:1px solid #274263;border-radius:10px;padding:10px;margin-bottom:10px}
    </style></head><body>
    <h2>SOC Security Operations View</h2>
    <div class="grid">
      <div class="card"><div class="k">Top AI Vulnerabilities</div><div class="v">${vulnRows.length}</div></div>
      <div class="card"><div class="k">Top MCP Risks</div><div class="v">${mcpRows.length}</div></div>
      <div class="card"><div class="k">Prompt Injection Attempts</div><div class="v">${this.countByKeyword(records, "injection")}</div></div>
      <div class="card"><div class="k">Blocked Red Team Findings</div><div class="v">${this.blockedByType(records, "AI_RED_TEAM")}</div></div>
      <div class="card"><div class="k">Most Vulnerable Repositories</div><div class="v">${this.uniqueRepos(records)}</div></div>
      <div class="card"><div class="k">Unified Security Score</div><div class="v">${snapshot.unifiedSecurityScore.score}</div></div>
      <div class="card"><div class="k">Token Savings</div><div class="v">${totalSavedTokens.toLocaleString()}</div></div>
      <div class="card"><div class="k">Estimated Cost Saved</div><div class="v">$${estimatedCostSaved.toLocaleString()}</div></div>
    </div>

    <div class="section"><strong>Security Trends</strong><div>Daily Findings: ${trend7.join(", ") || "n/a"}</div><div>Weekly Findings: ${this.sumChunks(trend30, 7).join(", ") || "n/a"}</div><div>Monthly Findings: ${trend30.reduce((sum, value) => sum + value, 0)}</div></div>
    <div class="section"><strong>Token Consumption Trends</strong><div>Before Optimization: ${snapshot.tokensBeforeTotal.toLocaleString()}</div><div>After Optimization: ${snapshot.tokensAfterTotal.toLocaleString()}</div><div>Saved Tokens: ${totalSavedTokens.toLocaleString()}</div><div>Most Expensive Prompt: ${expensivePrompt.toLocaleString()}</div></div>
    <div class="section"><strong>Optimization Trends</strong><table><thead><tr><th>Time</th><th>File/Prompt</th><th>Reduction %</th><th>Saved Tokens</th></tr></thead><tbody>${this.optimizationRows(optimizationRows)}</tbody></table></div>

    <div class="section"><strong>Most Risky MCP Tools</strong><table><thead><tr><th>Time</th><th>Repository</th><th>Score</th><th>Details</th></tr></thead><tbody>${this.rows(mcpRows)}</tbody></table></div>
    <div class="section"><strong>Top AI Vulnerabilities</strong><table><thead><tr><th>Time</th><th>Provider</th><th>Score</th><th>Details</th></tr></thead><tbody>${this.rows(vulnRows)}</tbody></table></div>
    </body></html>`;
  }

  private topItems(records: AuditRecord[], auditType: string): AuditRecord[] {
    return records
      .filter((record) => record.auditType === auditType)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 10);
  }

  private rows(records: AuditRecord[]): string {
    if (!records.length) {
      return "<tr><td colspan='4'>No data</td></tr>";
    }

    return records
      .map(
        (record) => `<tr><td>${record.time}</td><td>${record.repository ?? "n/a"}</td><td>${record.score ?? record.riskScore}</td><td>${record.details ?? ""}</td></tr>`
      )
      .join("");
  }

  private countByKeyword(records: AuditRecord[], keyword: string): number {
    return records.filter((record) => (record.details ?? "").toLowerCase().includes(keyword.toLowerCase())).length;
  }

  private blockedByType(records: AuditRecord[], auditType: string): number {
    return records.filter((record) => record.auditType === auditType && record.action === "blocked").length;
  }

  private uniqueRepos(records: AuditRecord[]): number {
    return new Set(records.map((record) => record.repository).filter(Boolean)).size;
  }

  private sumChunks(values: number[], chunkSize: number): number[] {
    const chunks: number[] = [];
    for (let i = 0; i < values.length; i += chunkSize) {
      chunks.push(values.slice(i, i + chunkSize).reduce((sum, value) => sum + value, 0));
    }
    return chunks;
  }

  private topOptimization(records: AuditRecord[]): Array<{ time: string; file: string; reduction: number; saved: number }> {
    return records
      .filter((record) => record.auditType === "CONTEXT_OPTIMIZED" || record.auditType === "TOKEN_ANALYSIS")
      .map((record) => {
        const details = record.details ?? "";
        const before = this.metric(details, "before") ?? 0;
        const after = this.metric(details, "after") ?? 0;
        const reduction = this.metric(details, "reduction") ?? 0;
        return {
          time: record.time,
          file: record.file,
          reduction,
          saved: Math.max(0, before - after)
        };
      })
      .sort((a, b) => b.reduction - a.reduction)
      .slice(0, 10);
  }

  private optimizationRows(rows: Array<{ time: string; file: string; reduction: number; saved: number }>): string {
    if (!rows.length) {
      return "<tr><td colspan='4'>No optimization events yet</td></tr>";
    }

    return rows.map((row) => `<tr><td>${row.time}</td><td>${row.file}</td><td>${row.reduction.toFixed(1)}%</td><td>${row.saved}</td></tr>`).join("");
  }

  private metric(details: string, key: string): number | undefined {
    const match = details.match(new RegExp(`${key}=([0-9]+(?:\\.[0-9]+)?)`, "i"));
    if (!match) {
      return undefined;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : undefined;
  }
}
