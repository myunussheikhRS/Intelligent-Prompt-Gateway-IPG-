import * as vscode from "vscode";
import { MetricsStore } from "./metricsStore";
import { buildDashboardHtml } from "./dashboardHtml";

export class DashboardPanel {
  private static currentPanel: DashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;

  private constructor(panel: vscode.WebviewPanel, private readonly store: MetricsStore) {
    this.panel = panel;
    this.panel.onDidDispose(() => {
      DashboardPanel.currentPanel = undefined;
    });
    this.render();
  }

  public static show(context: vscode.ExtensionContext, store: MetricsStore): void {
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.panel.reveal(vscode.ViewColumn.Two);
      DashboardPanel.currentPanel.render();
      return;
    }

    const panel = vscode.window.createWebviewPanel("rocketTokenDashboard", "Rocket - IPG : Token Optimizer", vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true
    });

    const instance = new DashboardPanel(panel, store);
    DashboardPanel.currentPanel = instance;

    panel.webview.onDidReceiveMessage(
      (msg) => {
        if (msg.command === "clearHistory") {
          store.clear();
          instance.render();
        }
      },
      undefined,
      context.subscriptions
    );

    context.subscriptions.push(panel);
  }

  public render(): void {
    const records = this.store.getAll();
    this.panel.webview.html = buildDashboardHtml(records);
  }

  public static refresh(): void {
    DashboardPanel.currentPanel?.render();
  }
}
