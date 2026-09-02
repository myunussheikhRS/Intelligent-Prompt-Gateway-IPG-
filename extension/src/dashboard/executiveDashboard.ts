import * as vscode from "vscode";
import { AnalyticsSnapshot } from "../aiShield/analytics";
import { AuditRecord } from "../models/auditRecord";
import { OptimizationSummary } from "../optimization/optimizationMetrics";
import { RiskCharts } from "./riskCharts";

export class ExecutiveDashboard {
  private panel: vscode.WebviewPanel | undefined;
  private readonly charts = new RiskCharts();

  public open(snapshot: AnalyticsSnapshot, records: AuditRecord[], efficiency?: OptimizationSummary): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "rocketAiShieldExecutive",
        "Rocket - IPG Executive Dashboard",
        vscode.ViewColumn.Beside,
        { enableScripts: false }
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    } else {
      this.panel.reveal(vscode.ViewColumn.Beside);
    }

    this.panel.webview.html = this.render(snapshot, records, efficiency);
  }

  private render(snapshot: AnalyticsSnapshot, records: AuditRecord[], efficiency?: OptimizationSummary): string {
    const topEvents = records.slice(0, 8);
    const lineData = this.charts.lineData(snapshot).join(", ");
    const trend7 = this.charts.sparkline(snapshot.findingsTrend7);
    const trend30 = this.charts.sparkline(snapshot.findingsTrend30);
    const trend90 = this.charts.sparkline(snapshot.findingsTrend90);
    const barData = this.charts.barData(snapshot)
      .map((item) => `${item.label}:${item.value}`)
      .join(" | ");
    const pieData = this.charts.pieData(snapshot)
      .map((item) => `${item.label}:${item.value}`)
      .join(" | ");
    const efficiencyScore = efficiency?.efficiencyScore ?? snapshot.efficiencyScore;
    const tokensSaved = efficiency?.totalSavedTokens ?? snapshot.tokensSavedTotal;
    const estimatedSavings = efficiency?.estimatedCostSavingsUsd ?? snapshot.estimatedCostSavingsUsd;

    const eventsHtml =
      topEvents.length === 0
        ? "<tr><td colspan='6'>No events yet</td></tr>"
        : topEvents
            .map(
              (event) =>
                `<tr><td>${event.time}</td><td>${event.user}</td><td>${event.provider}</td><td>${event.riskLabel.toUpperCase()} (${event.riskScore})</td><td>${event.findings.length}</td><td>${event.action}</td></tr>`
            )
            .join("");

    return `<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>Rocket - IPG</title>
  <style>
    :root {
      --bg: #0b1320;
      --bg-soft: #101d33;
      --card: #132441;
      --text: #dce8ff;
      --muted: #9db1d4;
      --critical: #ff5d5d;
      --high: #ff9f43;
      --accent: #3ddc97;
      --line: #2a4067;
      --brand: #00c2ff;
    }
    body {
      margin: 0;
      padding: 18px;
      background:
        radial-gradient(800px 420px at 15% -10%, rgba(0,194,255,0.25), transparent),
        radial-gradient(700px 360px at 90% -15%, rgba(61,220,151,0.16), transparent),
        var(--bg);
      color: var(--text);
      font-family: "Segoe UI", Tahoma, sans-serif;
    }
    .brand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .title { font-size: 23px; font-weight: 700; letter-spacing: 0.3px; }
    .tag { color: var(--muted); font-size: 12px; }
    .threat {
      background: linear-gradient(90deg, rgba(255,93,93,0.2), rgba(255,159,67,0.08));
      border: 1px solid rgba(255,93,93,0.5);
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 14px;
      animation: pulse 2.2s infinite;
    }
    @keyframes pulse { 0% { box-shadow: 0 0 0 rgba(255,93,93,0); } 50% { box-shadow: 0 0 18px rgba(255,93,93,0.25); } 100% { box-shadow: 0 0 0 rgba(255,93,93,0); } }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }
    .card {
      background: linear-gradient(180deg, rgba(19,36,65,0.95), rgba(16,29,51,0.92));
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
    }
    .k { color: var(--muted); font-size: 12px; }
    .v { font-size: 26px; font-weight: 700; margin-top: 3px; }
    .v.critical { color: var(--critical); }
    .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .chart { background: var(--bg-soft); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
    .chart-title { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid var(--line); text-align: left; padding: 8px 6px; }
    th { color: var(--muted); }
    .feed { max-height: 230px; overflow: auto; }
    @media (max-width: 900px) { .charts { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="grid">
    <div class="card"><div class="k">Total Scans</div><div class="v">${snapshot.totalScans}</div></div>
    <div class="card"><div class="k">Blocked</div><div class="v critical">${snapshot.totalBlocked}</div></div>
    <div class="card"><div class="k">Warned</div><div class="v">${snapshot.totalWarned}</div></div>
    <div class="card"><div class="k">Tokenized</div><div class="v">${snapshot.tokenizedEvents}</div></div>
    <div class="card"><div class="k">Top Provider</div><div class="v">${snapshot.topProviders[0]?.provider ?? "n/a"}</div></div>
    <div class="card"><div class="k">Top Leak Type</div><div class="v">${snapshot.topLeakTypes[0]?.key ?? "n/a"}</div></div>
    <div class="card"><div class="k">AI Red Team Score</div><div class="v">${snapshot.redTeamScore}</div></div>
    <div class="card"><div class="k">MCP Security Score</div><div class="v">${snapshot.mcpSecurityScore}</div></div>
    <div class="card"><div class="k">LLM Security Score</div><div class="v">${snapshot.llmSecurityScore}</div></div>
    <div class="card"><div class="k">AI Efficiency Score</div><div class="v">${efficiencyScore}</div></div>
    <div class="card"><div class="k">Rocket Security Rating</div><div class="v">${snapshot.unifiedSecurityScore.score}</div></div>
  </div>

  <div class="chart" style="margin-bottom: 12px;">
    <div class="chart-title">Overall AI Security Posture (${snapshot.unifiedSecurityScore.score}/100)</div>
    <div>Prompt Security: ${snapshot.promptFirewallScore >= 75 ? "PASS" : "WARN"}</div>
    <div>Response Security: ${snapshot.responseFirewallScore >= 75 ? "PASS" : "WARN"}</div>
    <div>MCP Security: ${snapshot.mcpSecurityScore >= 75 ? "PASS" : "WARN"}</div>
    <div>LLM Security: ${snapshot.llmSecurityScore >= 75 ? "PASS" : "WARN"}</div>
    <div>Rating: ${snapshot.unifiedSecurityScore.label === "enterprise_ready" ? "Enterprise Ready" : snapshot.unifiedSecurityScore.label === "improving" ? "Improving" : "High Risk"}</div>
  </div>

  <div class="charts">
    <div class="chart"><div class="chart-title">Line Chart (Blocked/Warned/Tokenized %)</div><div>${lineData}</div></div>
    <div class="chart"><div class="chart-title">Pie Chart Snapshot</div><div>${pieData}</div></div>
    <div class="chart"><div class="chart-title">Bar Chart Top Leak Types</div><div>${barData}</div></div>
    <div class="chart"><div class="chart-title">Risk Heatmap</div><div>Provider x Risk matrix generated from audit records.</div><div>${snapshot.topProviders.map((p) => `${p.provider}:${Math.min(100, p.count * 8)}`).join(" | ") || "n/a"}</div></div>
    <div class="chart"><div class="chart-title">Security Maturity Gauge</div><div>${"|".repeat(Math.max(1, Math.round(snapshot.unifiedSecurityScore.score / 10)))} ${snapshot.unifiedSecurityScore.score}/100</div></div>
    <div class="chart"><div class="chart-title">Security Trends</div><div>7d: ${trend7}</div><div>30d: ${trend30}</div><div>90d: ${trend90}</div></div>
    <div class="chart"><div class="chart-title">AI Security Assessment</div><div>Prompt Injection Score: ${snapshot.redTeamScore}</div><div>Jailbreak Resistance: ${snapshot.llmSecurityScore}</div><div>Data Leakage Resistance: ${snapshot.responseFirewallScore}</div><div>Tool Abuse Resistance: ${snapshot.mcpSecurityScore}</div><div>Overall Score: ${snapshot.unifiedSecurityScore.score}</div></div>
  </div>

  <div class="chart" style="margin-bottom: 12px;">
    <div class="chart-title">Hackathon Demo View</div>
    <div>Threat Detected: ${snapshot.totalWarned + snapshot.totalBlocked > 0 ? "YES" : "NO"}</div>
    <div>Blocked: ${snapshot.totalBlocked}</div>
    <div>Tokenized: ${snapshot.tokenizedEvents}</div>
    <div>Protected: ${snapshot.totalScans > 0 ? "YES" : "NO"}</div>
    <div>Validated: ${snapshot.redTeamScore > 0 && snapshot.mcpSecurityScore > 0 && snapshot.llmSecurityScore > 0 ? "YES" : "NO"}</div>
    <div>AI Security Score: ${snapshot.redTeamScore}</div>
    <div>MCP Security Score: ${snapshot.mcpSecurityScore}</div>
    <div>LLM Security Score: ${snapshot.llmSecurityScore}</div>
    <div>Token Savings: ${tokensSaved.toLocaleString()}</div>
    <div>Estimated Cost Saved: $${estimatedSavings.toLocaleString()}</div>
  </div>

  <div class="chart" style="margin-bottom: 12px;">
    <div class="chart-title">Business Value</div>
    <div>Leaks Prevented: ${snapshot.totalBlocked}</div>
    <div>Secrets Protected: ${snapshot.tokenizedEvents}</div>
    <div>Token Savings: ${tokensSaved.toLocaleString()}</div>
    <div>Estimated Cost Saved: $${estimatedSavings.toLocaleString()}</div>
    <div>Repository Health: ${snapshot.repositorySecurityScore}</div>
    <div>AI Security: ${snapshot.unifiedSecurityScore.score}</div>
  </div>

  <div class=\"chart feed\">
    <div class=\"chart-title\">Threat Activity Feed (Recent Events)</div>
    <table>
      <thead><tr><th>Time</th><th>User</th><th>Provider</th><th>Risk</th><th>Findings</th><th>Action</th></tr></thead>
      <tbody>${eventsHtml}</tbody>
    </table>
  </div>
</body>
</html>`;
  }
}
