import * as vscode from "vscode";
import { MetricsStore } from "../metrics/metricsStore";
import { buildDashboardHtml } from "./dashboardHtml";

export class DashboardPanel {
  private static currentPanel: DashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly store: MetricsStore
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => { DashboardPanel.currentPanel = undefined; });
    this.render();
  }

  static show(context: vscode.ExtensionContext, store: MetricsStore): void {
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.panel.reveal(vscode.ViewColumn.Two);
      DashboardPanel.currentPanel.render();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "rocketTokenDashboard",
      "Rocket - IPG Dashboard",
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const instance = new DashboardPanel(panel, store);
    DashboardPanel.currentPanel = instance;

    // Handle clear-history message posted from the dashboard button
    panel.webview.onDidReceiveMessage((msg) => {
      if (msg.command === "clearHistory") {
        store.clear();
        instance.render();
      }
    }, undefined, context.subscriptions);

    context.subscriptions.push(panel);
  }

  render(): void {
    const records = this.store.getAll();
    const summary = this.store.getSessionSummary();
    this.panel.webview.html = buildDashboardHtml(records, summary);
  }

  static refresh(): void {
    DashboardPanel.currentPanel?.render();
  }
}
