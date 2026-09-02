import * as path from "path";
import * as vscode from "vscode";
import { ScanResult } from "../types";

export interface DetailedFindingsDashboardModel {
  filePath: string;
  result: ScanResult;
}

export class DetailedFindingsDashboardPanel {
  private panel: vscode.WebviewPanel | undefined;

  public open(model: DetailedFindingsDashboardModel): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      this.panel.webview.html = this.render(model);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "rocketAiShieldDetailedFindingsDashboard",
      "Rocket - IPG: Detailed Scan Dashboard",
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.html = this.render(model);
  }

  private render(model: DetailedFindingsDashboardModel): string {
    const { filePath, result } = model;
    const findings = [...result.findings];
    const total = findings.length;

    const categoryCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    for (const finding of findings) {
      const category = finding.category ?? "uncategorized";
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      for (const source of finding.sources) {
        sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
      }
    }

    const sortedCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    const sortedSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
    const prioritized = findings
      .slice()
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (a.startLine !== b.startLine) {
          return a.startLine - b.startLine;
        }
        return a.startChar - b.startChar;
      })

    const riskBand = (score: number): "critical" | "high" | "medium" | "low" => {
      if (score >= 0.85) {
        return "critical";
      }
      if (score >= 0.75) {
        return "high";
      }
      if (score >= 0.6) {
        return "medium";
      }
      return "low";
    };

    const escapeHtml = (value: string): string =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const compactPath = path.basename(filePath);

    const categoryRows =
      sortedCategories.length === 0
        ? `<tr><td>none</td><td class="num">0</td><td class="num">0.0%</td></tr>`
        : sortedCategories
            .map(([name, count]) => {
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
              return `<tr><td>${escapeHtml(name)}</td><td class="num">${count}</td><td class="num">${pct}%</td></tr>`;
            })
            .join("");

    const sourceRows =
      sortedSources.length === 0
        ? `<tr><td>none</td><td class="num">0</td><td class="num">0.0%</td></tr>`
        : sortedSources
            .map(([name, count]) => {
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
              return `<tr><td>${escapeHtml(name)}</td><td class="num">${count}</td><td class="num">${pct}%</td></tr>`;
            })
            .join("");

    const findingsRows =
      prioritized.length === 0
        ? `<tr><td colspan="7">No sensitive data detected.</td></tr>`
        : prioritized
            .map((finding, index) => {
              const band = riskBand(finding.score);
              const category = escapeHtml(finding.category ?? "n/a");
              const rule = escapeHtml(finding.ruleName ?? finding.contextHint ?? "n/a");
              const preview = escapeHtml(finding.preview || "n/a");
              return `<tr class="finding-row">
                <td class="num">${index + 1}</td>
                <td class="num">${finding.startLine + 1}</td>
                <td class="num">${finding.score.toFixed(2)}</td>
                <td><span class="risk risk-${band}">${band}</span></td>
                <td>${category}</td>
                <td>${rule}</td>
                <td class="preview">${preview}</td>
              </tr>`;
            })
            .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rocket - IPG: Detailed Scan Dashboard</title>
  <style>
    * { box-sizing: border-box; }

    :root {
      --accent-teal: #4ec9b0;
      --accent-blue: #569cd6;
      --accent-amber: #dcdcaa;
      --accent-coral: #f48771;
      --critical: #9f1239;
      --high: #c2410c;
      --low: #0f766e;
    }

    body {
      margin: 0;
      padding: 0;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .header {
      padding: 12px 20px;
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      border-top: 3px solid var(--accent-teal);
      flex-shrink: 0;
    }

    .header h1 {
      font-size: 1.2rem;
      margin: 0 0 2px 0;
      color: var(--accent-teal);
    }

    .subtitle {
      font-size: 0.75rem;
      color: var(--vscode-descriptionForeground);
      margin: 0;
    }

    .wrap {
      flex: 1;
      min-height: 0;
      width: 100%;
      overflow-y: scroll;
      overflow-x: hidden;
      scrollbar-gutter: stable;
      padding: 16px 20px 20px;
      display: block;
    }

    .card {
      width: 100%;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-left: 3px solid var(--accent-blue);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .card h2 {
      margin: 0;
      padding: 10px 14px;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      color: var(--vscode-descriptionForeground);
      font-size: 0.9rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .card > h2 {
      border-left: 3px solid var(--accent-blue);
      margin-left: -3px;
    }

    .summary-grid .metric:nth-child(1) { border-left: 3px solid var(--accent-teal); }
    .summary-grid .metric:nth-child(2) { border-left: 3px solid var(--accent-coral); }
    .summary-grid .metric:nth-child(3) { border-left: 3px solid var(--accent-amber); }
    .summary-grid .metric:nth-child(4) { border-left: 3px solid var(--accent-blue); }

    details.card > summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
    }

    details.card > summary::-webkit-details-marker {
      display: none;
    }

    details.card > summary::before {
      content: "+";
      display: inline-block;
      width: 1.2em;
      flex: 0 0 1.2em;
      color: var(--vscode-descriptionForeground);
    }

    details.card[open] > summary::before {
      content: "-";
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      padding: 14px;
    }

    .metric {
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 6px;
      padding: 10px;
      background: var(--vscode-editor-background);
    }

    .metric .label {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 6px;
    }

    .metric .value {
      font-size: 18px;
      font-weight: 700;
      word-break: break-word;
    }

    .metric .file-name {
      font-weight: 400;
    }

    .table-wrap {
      overflow: auto;
    }

    .findings-table-wrap {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 14px;
      border-top: 1px solid var(--vscode-editorWidget-border);
      color: var(--vscode-descriptionForeground);
      font-size: 0.75rem;
    }

    .pagination button {
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      padding: 4px 10px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
    }

    .pagination button:disabled {
      opacity: 0.5;
      cursor: default;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    .findings-table {
      display: table;
      width: 100% !important;
      min-width: 100%;
      max-width: 100%;
      table-layout: fixed;
    }

    .findings-table th:nth-child(1),
    .findings-table td:nth-child(1) { width: 8%; }
    .findings-table th:nth-child(2),
    .findings-table td:nth-child(2) { width: 10%; }
    .findings-table th:nth-child(3),
    .findings-table td:nth-child(3) { width: 10%; }
    .findings-table th:nth-child(4),
    .findings-table td:nth-child(4) { width: 15%; }
    .findings-table th:nth-child(5),
    .findings-table td:nth-child(5) { width: 15%; }
    .findings-table th:nth-child(6),
    .findings-table td:nth-child(6) { width: 20%; }
    .findings-table th:nth-child(7),
    .findings-table td:nth-child(7) { width: 22%; }

    th,
    td {
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      text-align: left;
      padding: 9px 10px;
      vertical-align: top;
    }

    th {
      background: var(--vscode-editor-background);
      color: var(--vscode-descriptionForeground);
      font-weight: 700;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    td.num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .risk {
      display: inline-block;
      white-space: nowrap;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .risk-critical {
      color: #fff;
      background: var(--critical);
    }

    .risk-high {
      color: #fff;
      background: var(--high);
    }

    .risk-medium {
      color: #1f2937;
      background: #fde68a;
    }

    .risk-low {
      color: #ecfeff;
      background: var(--low);
    }

    td.preview {
      white-space: normal;
      word-break: break-word;
    }

    .findings-table td {
      overflow-wrap: anywhere;
    }

    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 12px;
    }

    @media (max-width: 920px) {
      .split {
        grid-template-columns: 1fr;
      }
      .wrap {
        padding: 12px;
      }

      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rocket - IPG: Detailed Scan Dashboard</h1>
    <p class="subtitle">Sensitive data findings and risk analysis</p>
  </div>
  <div class="wrap">
    <div class="card">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="metric"><div class="label">File</div><div class="value file-name">${escapeHtml(compactPath)}</div></div>
        <div class="metric"><div class="label">Decision</div><div class="value">${escapeHtml(result.decision.toUpperCase())}</div></div>
        <div class="metric"><div class="label">Highest Score</div><div class="value">${result.highestScore.toFixed(2)}</div></div>
        <div class="metric"><div class="label">Total Findings</div><div class="value">${total}</div></div>
      </div>
      <div style="padding: 0 14px 12px 14px; color: var(--vscode-descriptionForeground); font-size: 12px;">
        Path: ${escapeHtml(filePath)}
      </div>
    </div>

    <div class="split">
      <details class="card" open>
        <summary><h2>Category Breakdown</h2></summary>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Category</th><th class="num">Count</th><th class="num">Share</th></tr>
            </thead>
            <tbody>${categoryRows}</tbody>
          </table>
        </div>
      </details>
      <details class="card" open>
        <summary><h2>Detection Sources</h2></summary>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Source</th><th class="num">Count</th><th class="num">Share</th></tr>
            </thead>
            <tbody>${sourceRows}</tbody>
          </table>
        </div>
      </details>
    </div>

    <div class="card">
      <h2>Prioritized Findings (10 per page)</h2>
      <div class="table-wrap findings-table-wrap">
        <table class="findings-table">
          <thead>
            <tr>
              <th class="num">#</th>
              <th class="num">Line</th>
              <th class="num">Score</th>
              <th>Risk</th>
              <th>Category</th>
              <th>Rule</th>
              <th>Preview</th>
            </tr>
          </thead>
          <tbody>${findingsRows}</tbody>
        </table>
      </div>
      <div class="pagination" aria-label="Prioritized findings pagination">
        <button id="previous-page" type="button">Previous</button>
        <span id="page-status"></span>
        <button id="next-page" type="button">Next</button>
      </div>
    </div>
  </div>
  <script>
    (() => {
      const rows = Array.from(document.querySelectorAll(".finding-row"));
      const pageSize = 10;
      const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
      let currentPage = 1;
      const previousButton = document.getElementById("previous-page");
      const nextButton = document.getElementById("next-page");
      const pageStatus = document.getElementById("page-status");

      const renderPage = () => {
        const firstRow = (currentPage - 1) * pageSize;
        rows.forEach((row, index) => {
          row.style.display = index >= firstRow && index < firstRow + pageSize ? "" : "none";
        });
        pageStatus.textContent = "Page " + currentPage + " of " + pageCount;
        previousButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === pageCount;
      };

      previousButton.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage -= 1;
          renderPage();
        }
      });
      nextButton.addEventListener("click", () => {
        if (currentPage < pageCount) {
          currentPage += 1;
          renderPage();
        }
      });
      renderPage();
    })();
  </script>
</body>
</html>`;
  }
}
