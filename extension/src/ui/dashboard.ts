import * as vscode from "vscode";

export interface DashboardSnapshot {
  totalScans: number;
  secretsDetected: number;
  blockedEvents: number;
  warnedEvents: number;
  filesAffected: number;
}

export class DashboardPanel {
  private panel: vscode.WebviewPanel | undefined;

  public open(snapshot: DashboardSnapshot): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      this.panel.webview.html = this.render(snapshot);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "aiDlpGuardDashboard",
      "Rocket - IPG Dashboard",
      vscode.ViewColumn.Beside,
      { enableScripts: false }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.html = this.render(snapshot);
  }

  public refresh(snapshot: DashboardSnapshot): void {
    if (!this.panel) {
      return;
    }
    this.panel.webview.html = this.render(snapshot);
  }

  private render(snapshot: DashboardSnapshot): string {
    const risk = snapshot.blockedEvents > 0 ? "High" : snapshot.warnedEvents > 0 ? "Medium" : "Low";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rocket - IPG Dashboard</title>
  <style>
    :root {
      --bg: #f5f7fb;
      --card: #ffffff;
      --text: #17223b;
      --accent: #0c7c59;
      --warn: #d97706;
      --block: #b91c1c;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: Segoe UI, sans-serif;
      background: radial-gradient(circle at top right, #e4f2ff, var(--bg));
      color: var(--text);
    }
    h1 {
      margin-top: 0;
      font-size: 22px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }
    .card {
      background: var(--card);
      border-radius: 10px;
      padding: 12px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
    }
    .label {
      font-size: 12px;
      opacity: 0.75;
    }
    .value {
      font-size: 24px;
      font-weight: 600;
    }
    .risk-high { color: var(--block); }
    .risk-medium { color: var(--warn); }
    .risk-low { color: var(--accent); }
  </style>
</head>
<body>
  <h1>AI Data Leakage Prevention Guard</h1>
  <div class="grid">
    <div class="card"><div class="label">Total Scans</div><div class="value">${snapshot.totalScans}</div></div>
    <div class="card"><div class="label">Secrets Detected</div><div class="value">${snapshot.secretsDetected}</div></div>
    <div class="card"><div class="label">Blocked Events</div><div class="value">${snapshot.blockedEvents}</div></div>
    <div class="card"><div class="label">Warned Events</div><div class="value">${snapshot.warnedEvents}</div></div>
    <div class="card"><div class="label">Files Affected</div><div class="value">${snapshot.filesAffected}</div></div>
    <div class="card"><div class="label">Risk Level</div><div class="value risk-${risk.toLowerCase()}">${risk}</div></div>
  </div>
</body>
</html>`;
  }
}
