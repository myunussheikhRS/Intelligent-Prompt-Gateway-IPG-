import * as vscode from "vscode";

export interface SmartContextDashboardModel {
  query: string;
  provider: string;
  copilotPayloadMode: "full" | "compact";
  baselineTokens: number;
  copilotPayloadTokens: number;
  copilotSavedTokens: number;
  copilotReductionPercent: number;
  estimatedCreditsSavedUsd: number;
  filesConsidered: number;
  filesProcessed: number;
  selectedFiles: string[];
  originalTokens: number;
  optimizedTokens: number;
  savedTokens: number;
  reductionPercent: number;
  duplicateLinesRemoved: number;
  riskLabel: "safe" | "low" | "medium" | "high" | "critical";
  riskScore: number;
  securityAction: "allow" | "warn" | "block";
  optimizedContextPreview: string;
}

export class SmartContextDashboard {
  private panel: vscode.WebviewPanel | undefined;

  public open(model: SmartContextDashboardModel): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "rocketAiShieldSmartContext",
        "Rocket - IPG Smart Context",
        vscode.ViewColumn.Active,
        { enableScripts: false }
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    } else {
      this.panel.reveal(vscode.ViewColumn.Active);
    }

    this.panel.webview.html = this.render(model);
  }

  private render(model: SmartContextDashboardModel): string {
    const meter = Math.max(0, Math.min(100, Math.round(model.reductionPercent)));
    const payloadMeter = Math.max(0, Math.min(100, Math.round(model.copilotReductionPercent)));
    const topFiles = model.selectedFiles.slice(0, 10);
    const actionLabel = model.securityAction.toUpperCase();
    const riskLabel = model.riskLabel.toUpperCase();
    const securityPass = model.securityAction === "block" ? "REVIEW REQUIRED" : "PASS";
    const summary = model.optimizedContextPreview
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .slice(0, 2400);

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rocket - IPG Smart Context</title>
  <style>
    :root {
      --bg:#071223;
      --card:#102844;
      --line:#2a4a73;
      --text:#e7f1ff;
      --muted:#a2bbde;
      --ok:#3ddc97;
      --warn:#ffb454;
      --bad:#ff6b6b;
      --brand:#00c2ff;
    }
    body {
      margin:0;
      padding:16px;
      color:var(--text);
      background:
        radial-gradient(850px 340px at 10% -25%, rgba(0,194,255,.26), transparent),
        radial-gradient(700px 320px at 92% -20%, rgba(61,220,151,.14), transparent),
        var(--bg);
      font-family: Segoe UI, Tahoma, sans-serif;
    }
    .header { margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 700; letter-spacing: .3px; }
    .tagline { font-size: 12px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(170px,1fr)); gap: 10px; margin-bottom: 12px; }
    .card { background: linear-gradient(180deg, rgba(16,40,68,.96), rgba(12,31,54,.94)); border: 1px solid var(--line); border-radius: 12px; padding: 10px; }
    .k { font-size: 12px; color: var(--muted); }
    .v { font-size: 24px; font-weight: 700; margin-top: 2px; }
    .meter-wrap { background: #0c1e35; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; margin-top: 6px; }
    .meter { height: 14px; background: linear-gradient(90deg, var(--brand), var(--ok)); width: ${meter}%; }
    .section { background: #0f223a; border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
    .section h3 { margin: 0 0 8px 0; font-size: 14px; color: #c9dcfa; }
    .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-right: 6px; }
    .ok { background: rgba(61,220,151,.18); border: 1px solid rgba(61,220,151,.42); color: var(--ok); }
    .warn { background: rgba(255,180,84,.15); border: 1px solid rgba(255,180,84,.4); color: var(--warn); }
    .bad { background: rgba(255,107,107,.17); border: 1px solid rgba(255,107,107,.4); color: var(--bad); }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid var(--line); text-align: left; padding: 6px; }
    th { color: var(--muted); }
    pre { white-space: pre-wrap; word-break: break-word; background: #09192d; border: 1px solid var(--line); border-radius: 10px; padding: 10px; font-size: 12px; max-height: 260px; overflow: auto; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Smart Context Report</div>
    <div class="tagline">Protect AI. Optimize AI. Govern AI.</div>
  </div>

  <div class="grid">
    <div class="card"><div class="k">Query</div><div class="v" style="font-size:15px">${model.query}</div></div>
    <div class="card"><div class="k">Provider</div><div class="v" style="font-size:16px">${model.provider}</div></div>
    <div class="card"><div class="k">Copied Prompt Mode</div><div class="v" style="font-size:16px">${model.copilotPayloadMode.toUpperCase()}</div></div>
    <div class="card"><div class="k">Files Considered</div><div class="v">${model.filesConsidered}</div></div>
    <div class="card"><div class="k">Files Processed</div><div class="v">${model.filesProcessed}</div></div>
    <div class="card"><div class="k">Original Tokens</div><div class="v">${model.originalTokens.toLocaleString()}</div></div>
    <div class="card"><div class="k">Optimized Tokens</div><div class="v">${model.optimizedTokens.toLocaleString()}</div></div>
    <div class="card"><div class="k">Saved Tokens</div><div class="v">${model.savedTokens.toLocaleString()}</div></div>
    <div class="card"><div class="k">Reduction</div><div class="v">${model.reductionPercent}%</div><div class="meter-wrap"><div class="meter"></div></div></div>
  </div>

  <div class="section">
    <h3>Copilot Payload A/B Estimate</h3>
    <div class="grid" style="margin-bottom:0;">
      <div class="card"><div class="k">Baseline Tokens (Raw + Question)</div><div class="v">${model.baselineTokens.toLocaleString()}</div></div>
      <div class="card"><div class="k">Copied Prompt Tokens</div><div class="v">${model.copilotPayloadTokens.toLocaleString()}</div></div>
      <div class="card"><div class="k">Copied Prompt Saved</div><div class="v">${model.copilotSavedTokens.toLocaleString()}</div></div>
      <div class="card"><div class="k">Copied Prompt Reduction</div><div class="v">${model.copilotReductionPercent}%</div><div class="meter-wrap"><div class="meter" style="width:${payloadMeter}%;"></div></div></div>
      <div class="card"><div class="k">Estimated Savings (USD)</div><div class="v" style="font-size:20px">$${model.estimatedCreditsSavedUsd.toFixed(4)}</div></div>
    </div>
  </div>

  <div class="section">
    <h3>Security Preservation</h3>
    <span class="pill ${model.securityAction === "block" ? "bad" : model.securityAction === "warn" ? "warn" : "ok"}">Firewall Action: ${actionLabel}</span>
    <span class="pill ${model.riskScore >= 75 ? "bad" : model.riskScore >= 45 ? "warn" : "ok"}">Risk: ${riskLabel} (${model.riskScore})</span>
    <span class="pill ${securityPass === "PASS" ? "ok" : "warn"}">Security Scan: ${securityPass}</span>
    <span class="pill ok">Duplicate Lines Removed: ${model.duplicateLinesRemoved}</span>
  </div>

  <div class="section">
    <h3>Most Relevant Files</h3>
    <table>
      <thead><tr><th>#</th><th>Path</th></tr></thead>
      <tbody>
        ${topFiles.length === 0 ? "<tr><td colspan='2'>No files selected.</td></tr>" : topFiles.map((f, i) => `<tr><td>${i + 1}</td><td>${f}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>Sanitized Preview (Safe Snippet)</h3>
    <div class="k" style="margin-bottom:8px;">This preview is truncated for readability. Full safe context is copied to clipboard after build.</div>
    <pre>${summary}</pre>
  </div>
</body>
</html>`;
  }
}
