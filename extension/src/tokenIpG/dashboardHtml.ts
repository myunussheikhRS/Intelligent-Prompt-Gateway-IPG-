import * as vscode from "vscode";
import { MetricRecord } from "./types";
import { MetricsStore } from "./metricsStore";

export function buildDashboardHtml(
  records: MetricRecord[]
): string {
  if (records.length === 0) {
    return noDataHtml();
  }

  const latest = records[0];
  const currentSaved = latest.rawFileTokens !== undefined && latest.afterTokens !== undefined
    ? (latest.rawFileTokens - latest.afterTokens).toLocaleString()
    : "-";

  const cards = records.length > 0
    ? (() => {
        const r = records[0];
        const rawTokens = r.rawFileTokens ?? 0;
        const afterTokens = r.afterTokens ?? 0;
        const rawSaved = Math.max(0, rawTokens - afterTokens);
        const rawReduction = rawTokens > 0 ? Math.round((rawSaved / rawTokens) * 100) : 0;
        const costPer1k = vscode.workspace.getConfiguration("rocketToken").get<number>("costPer1kTokens", 0.002);
        const costRaw = (rawTokens / 1000) * costPer1k;
        const costAfter = (afterTokens / 1000) * costPer1k;
        const creditSaved = Math.max(0, costRaw - costAfter);
        const savedClass = rawSaved > 0 ? "positive" : "neutral";
        const reductionClass = rawReduction >= 40 ? "great" : rawReduction >= 15 ? "good" : "ok";
        const bar = Math.max(0, Math.min(100, rawReduction));
        return `
      <div class="qcard latest">
        <div class="qcard-header">
          <span class="qtime">${new Date(r.timestamp).toLocaleString()}</span>
          <span class="qbadge ${reductionClass}">${rawReduction}% reduced</span>
        </div>
        <div class="qtext">${escHtml(r.query)}</div>
        <div class="bar-wrap"><div class="bar-fill" style="width:${bar}%"></div></div>
        <div class="qstats">
          <div class="stat"><span class="slabel">Raw File</span><span class="sval">${rawTokens.toLocaleString()}</span></div>
          <div class="stat"><span class="slabel">After Optimize</span><span class="sval">${afterTokens.toLocaleString()}</span></div>
          <div class="stat ${savedClass}"><span class="slabel">Tokens Saved</span><span class="sval">${rawSaved.toLocaleString()}</span></div>
          <div class="stat"><span class="slabel">Latency</span><span class="sval">${r.preprocessLatencyMs}ms</span></div>
        </div>
        <div class="cost-row">
          <span class="cost-item">Est. cost without optimize: <strong>$${costRaw.toFixed(4)}</strong></span>
          <span class="cost-arrow">-></span>
          <span class="cost-item">After optimize: <strong>$${costAfter.toFixed(4)}</strong></span>
          <span class="cost-badge">Credit saved: <strong>$${creditSaved.toFixed(4)}</strong></span>
        </div>
        <div class="qsteps">${r.stagesUsed.map((s) => `<span class="step">${s}</span>`).join("<span class='arrow'>-></span>")}</div>
      </div>
    `;
      })()
    : `<p class="no-data">No questions yet.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rocket - IPG : Token Optimizer</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 0; margin: 0; display: flex; flex-direction: column; height: 100vh; }
  .header { padding: 12px 20px; border-bottom: 1px solid var(--vscode-editorWidget-border); }
  h1 { font-size: 1.2rem; margin: 0 0 2px 0; }
  .subtitle { font-size: 0.75rem; color: var(--vscode-descriptionForeground); margin: 0; }
  .content { flex: 1; min-height: 0; overflow: auto; padding: 16px 20px 20px; display: flex; flex-direction: column; }
  h2 { font-size: 1rem; margin: 0 0 14px 0; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
  .qcard { background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; flex: 0 0 auto; height: auto; }
  .qcard.latest { border-color: #4ec9b0; }
  .qcard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-shrink: 0; }
  .qtime { font-size: 0.72rem; color: var(--vscode-descriptionForeground); }
  .qbadge { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
  .qbadge.great { background: #1e3a2e; color: #4ec9b0; }
  .qbadge.good { background: #2a3520; color: #b5cea8; }
  .qbadge.ok { background: var(--vscode-editorWidget-border); color: var(--vscode-editor-foreground); }
  .qtext { font-size: 0.88rem; margin-bottom: 10px; line-height: 1.4; word-break: break-word; flex-shrink: 0; }
  .bar-wrap { background: var(--vscode-editorWidget-border); border-radius: 4px; height: 5px; margin-bottom: 12px; overflow: hidden; flex-shrink: 0; }
  .bar-fill { background: #4ec9b0; height: 100%; border-radius: 4px; }
  .qstats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; flex-shrink: 0; }
  .stat { display: flex; flex-direction: column; }
  .slabel { font-size: 0.68rem; color: var(--vscode-descriptionForeground); }
  .sval { font-size: 0.95rem; font-weight: 600; }
  .stat.positive .sval { color: #4ec9b0; }
  .qsteps { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; flex-shrink: 0; }
  .step { font-size: 0.7rem; background: var(--vscode-editorWidget-border); padding: 2px 7px; border-radius: 4px; }
  .arrow { font-size: 0.7rem; color: var(--vscode-descriptionForeground); }
  .cost-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; padding: 6px 10px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-editorWidget-border); border-radius: 6px; font-size: 0.75rem; flex-shrink: 0; }
  .cost-item { color: var(--vscode-descriptionForeground); }
  .cost-arrow { color: var(--vscode-descriptionForeground); }
  .cost-badge { margin-left: auto; color: #4ec9b0; font-size: 0.78rem; }
</style>
</head>
<body>
<div class="header">
  <h1>AI Token Optimizer</h1>
  <p class="subtitle">Per-question token reduction</p>
</div>
<div class="content">
<h2>Details</h2>
${cards}
</div>
</body>
</html>`;
}

function escHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function noDataHtml(): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <style>body{font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);padding:40px;text-align:center;margin:0;}p{color:var(--vscode-descriptionForeground);margin:10px 0 0 0;}</style>
  </head><body><p style="margin-top:60px;">No questions yet. Run <strong>Optimize File</strong> or <strong>Ask Optimized</strong> to start.</p></body></html>`;
}
