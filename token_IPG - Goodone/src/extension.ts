import * as vscode from "vscode";
import * as path from "path";
import { collectEditorContext, collectSelectionContext } from "./pipeline/contextCollector";
import { optimizeAndSend } from "./pipeline/optimizer";
import { analyzeFileWithQuery } from "./pipeline/fileAnalyzer";
import { OptimizerConfig, MetricRecord } from "./pipeline/types";
import { MetricsStore } from "./metrics/metricsStore";
import { DashboardPanel } from "./dashboard/dashboardPanel";

let metricsStore: MetricsStore;

function getConfig(): OptimizerConfig {
  const cfg = vscode.workspace.getConfiguration("rocketToken");
  return {
    maxInputTokens: cfg.get<number>("maxInputTokens", 6000),
    contextFocusThresholdPercent: cfg.get<number>("contextFocusThresholdPercent", 50),
    enableCompression: cfg.get<boolean>("enableCompression", true),
    contextFocusTimeoutMs: cfg.get<number>("contextFocusTimeoutMs", 120),
    compressionTimeoutMs: cfg.get<number>("compressionTimeoutMs", 180),
  };
}

function getFullContextDemoConfig(rawContext: string): OptimizerConfig {
  const base = getConfig();
  const rawTokens = Math.max(estimateRoughTokens(rawContext), base.maxInputTokens);
  return {
    ...base,
    maxInputTokens: rawTokens + 1000,
    contextFocusThresholdPercent: 101,
    enableCompression: false,
  };
}

function estimateRoughTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getOptimizedPromptFolder(context: vscode.ExtensionContext): vscode.Uri {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  return workspaceFolder
    ? vscode.Uri.joinPath(workspaceFolder.uri, ".rocket-ai-shield")
    : vscode.Uri.joinPath(context.globalStorageUri, "optimized-prompts");
}

function getOptimizedPromptUri(context: vscode.ExtensionContext, sourceFilePath?: string): vscode.Uri {
  if (sourceFilePath) {
    const parsed = path.parse(sourceFilePath);
    return vscode.Uri.file(path.join(parsed.dir, `${parsed.name}_optimized.txt`));
  }

  return vscode.Uri.joinPath(getOptimizedPromptFolder(context), "optimized-prompt-latest.txt");
}

async function saveOptimizedPrompt(
  context: vscode.ExtensionContext,
  optimizedPrompt: string,
  sourceFilePath?: string
): Promise<vscode.Uri> {
  const promptUri = getOptimizedPromptUri(context, sourceFilePath);
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(promptUri.fsPath)));
  await vscode.workspace.fs.writeFile(promptUri, Buffer.from(optimizedPrompt, "utf8"));
  return promptUri;
}

async function saveAndOpenOptimizedPrompt(
  context: vscode.ExtensionContext,
  optimizedPrompt: string,
  sourceFilePath?: string
): Promise<string> {
  const promptUri = await saveOptimizedPrompt(context, optimizedPrompt, sourceFilePath);
  await vscode.window.showTextDocument(promptUri, { viewColumn: vscode.ViewColumn.One, preview: false });
  return vscode.workspace.asRelativePath(promptUri, false);
}

async function openNewChatForSavedPrompt(query: string, promptUri: vscode.Uri): Promise<void> {
  const savedPath = vscode.workspace.asRelativePath(promptUri, false);
  const chatPrompt = `${query}\n\nUse the optimized prompt context saved in ${savedPath}.`;

  try {
    await vscode.commands.executeCommand("workbench.action.chat.newChat");
    await vscode.commands.executeCommand("workbench.action.chat.open", { query: chatPrompt });
  } catch {
    await vscode.env.clipboard.writeText(chatPrompt);
    vscode.window.showWarningMessage("Optimized prompt saved, but Chat could not be opened automatically. The chat prompt was copied to clipboard.");
  }
}

function persistMetricRecord(query: string, result: Awaited<ReturnType<typeof optimizeAndSend>>): void {
  const record: MetricRecord = {
    id: Date.now().toString(36),
    timestamp: Date.now(),
    query,
    rawFileTokens: result.rawFileTokens,
    beforeTokens: result.beforeTokens,
    afterTokens: result.afterTokens,
    reductionPercent: result.reductionPercent,
    stagesUsed: result.stagesUsed,
    preprocessLatencyMs: result.preprocessLatencyMs,
    optimizedPrompt: result.optimizedPrompt,
    stageSavings: result.stageSavings,
  };

  metricsStore.add(record);
}

async function runOptimize(
  query: string,
  rawContext: string,
  context: vscode.ExtensionContext,
  configOverride?: OptimizerConfig,
  progressMessage = "Optimizing context..."
): Promise<void> {
  if (!query.trim()) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Rocket - IPG", cancellable: false },
    async (progress) => {
      progress.report({ message: progressMessage });

      const config = configOverride ?? getConfig();
      const result = await optimizeAndSend(query, rawContext, config);
      persistMetricRecord(query, result);

      // Auto-copy and auto-open dashboard after every optimization
      const savedPath = await saveAndOpenOptimizedPrompt(context, result.optimizedPrompt);
      await vscode.env.clipboard.writeText(result.optimizedPrompt);
      DashboardPanel.show(context, metricsStore);

      const summary =
        `✓ Optimized prompt saved to ${savedPath} and copied to clipboard | ` +
        `${result.beforeTokens.toLocaleString()} → ${result.afterTokens.toLocaleString()} tokens ` +
        `(${result.reductionPercent}% saved) | ${result.preprocessLatencyMs}ms`;

      vscode.window.showInformationMessage(summary);
    }
  );
}

export function activate(context: vscode.ExtensionContext): void {
  metricsStore = new MetricsStore(context);

  // Ask Optimized: user types a question, pipeline optimizes current editor context
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.askOptimized", async () => {
      const query = await vscode.window.showInputBox({
        prompt: "Ask with token optimization",
        placeHolder: "e.g. Why does the retry logic fail in payment service?",
      });
      if (!query) return;
      const raw = await collectEditorContext();
      await runOptimize(query, raw, context);
    })
  );

  // Optimize Selection: only uses highlighted text as context
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.optimizeSelection", async () => {
      const query = await vscode.window.showInputBox({
        prompt: "Question about the selected text",
        placeHolder: "e.g. Explain what this block does",
      });
      if (!query) return;

      const raw = await collectSelectionContext();
      if (!raw.trim()) {
        vscode.window.showWarningMessage("No text selected. Select code or text first.");
        return;
      }
      await runOptimize(query, raw, context);
    })
  );

  // Optimize Active File: whole file as context
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.optimizeActiveFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor open.");
        return;
      }
      const query = await vscode.window.showInputBox({
        prompt: "Question about this file",
        placeHolder: "e.g. What is the main responsibility of this class?",
      });
      if (!query) return;
      const raw = editor.document.getText();
      await runOptimize(query, raw, context);
    })
  );

  // Optimize Active File (Full Context Demo): bypass context focus and deep compression
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.optimizeActiveFileFullContext", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor open.");
        return;
      }
      const query = await vscode.window.showInputBox({
        prompt: "Question about this file (full-context demo mode)",
        placeHolder: "e.g. What are the top 3 bug risks in this class?",
      });
      if (!query) return;

      const raw = editor.document.getText();
      const demoConfig = getFullContextDemoConfig(raw);
      await runOptimize(
        query,
        raw,
        context,
        demoConfig,
        "Optimizing in full-context demo mode..."
      );
    })
  );

  // Analyze File: query-guided smart extraction from any file (logs, traces, large source)
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.analyzeFile", async () => {
      // Let user pick a file OR fall back to active editor file
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: "Analyze this file",
        filters: { "All Files": ["*"] },
      });
      const filePath = uris?.[0]?.fsPath
        ?? vscode.window.activeTextEditor?.document.uri.fsPath;

      if (!filePath) {
        vscode.window.showWarningMessage("No file selected and no active editor.");
        return;
      }

      const query = await vscode.window.showInputBox({
        prompt: "What do you want to know about this file?",
        placeHolder: "e.g. Where is the error?  /  What was the processing time?  /  Which records failed?",
      });
      if (!query) return;

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Rocket - IPG", cancellable: false },
        async (progress) => {
          progress.report({ message: "Analyzing file with query context..." });
          const config = getConfig();

          let result: Awaited<ReturnType<typeof analyzeFileWithQuery>>;
          try {
            result = await analyzeFileWithQuery(filePath, query, config);
          } catch (e: any) {
            vscode.window.showErrorMessage(`File analysis failed: ${e?.message ?? e}`);
            return;
          }

          persistMetricRecord(query, result);

          // Auto-copy and auto-open dashboard after every file analysis
          const promptUri = await saveOptimizedPrompt(context, result.optimizedPrompt, filePath);
          const savedPath = vscode.workspace.asRelativePath(promptUri, false);
          await vscode.env.clipboard.writeText(result.optimizedPrompt);
          DashboardPanel.show(context, metricsStore);
          await vscode.window.showTextDocument(promptUri, { viewColumn: vscode.ViewColumn.One, preview: false });
          await openNewChatForSavedPrompt(query, promptUri);

          const summary =
            `✓ Optimized prompt saved to ${savedPath} and copied | Matched: ${result.rawMatchCount} lines | ` +
            `${result.beforeTokens.toLocaleString()} → ${result.afterTokens.toLocaleString()} tokens ` +
            `(${result.reductionPercent}% saved) | ${result.preprocessLatencyMs}ms`;

          vscode.window.showInformationMessage(summary);
        }
      );
    })
  );

  // Optimize Current File (Query-Guided) — skips file picker, uses active editor
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.analyzeCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No file open. Open a trace/log file first.");
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const query = await vscode.window.showInputBox({
        prompt: "What do you want to know about this file?",
        placeHolder: "e.g. what is the return message?  /  which record failed?  /  what was the duration?",
      });
      if (!query) return;

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Rocket - IPG", cancellable: false },
        async (progress) => {
          progress.report({ message: "Analyzing file with query context..." });
          const config = getConfig();

          let result: Awaited<ReturnType<typeof analyzeFileWithQuery>>;
          try {
            result = await analyzeFileWithQuery(filePath, query, config);
          } catch (e: any) {
            vscode.window.showErrorMessage(`File analysis failed: ${e?.message ?? e}`);
            return;
          }

          persistMetricRecord(query, result);

          const promptUri = await saveOptimizedPrompt(context, result.optimizedPrompt, filePath);
          const savedPath = vscode.workspace.asRelativePath(promptUri, false);
          await vscode.env.clipboard.writeText(result.optimizedPrompt);
          DashboardPanel.show(context, metricsStore);
          await vscode.window.showTextDocument(promptUri, { viewColumn: vscode.ViewColumn.One, preview: false });
          await openNewChatForSavedPrompt(query, promptUri);

          const summary =
            `✓ Optimized prompt saved to ${savedPath} and copied | Matched: ${result.rawMatchCount} lines | ` +
            `${result.beforeTokens.toLocaleString()} → ${result.afterTokens.toLocaleString()} tokens ` +
            `(${result.reductionPercent}% saved) | ${result.preprocessLatencyMs}ms`;

          vscode.window.showInformationMessage(summary);
        }
      );
    })
  );

  // Open Dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.openDashboard", () => {
      DashboardPanel.show(context, metricsStore);
    })
  );

  // Show Last Reduction Report in output channel
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.showReductionReport", () => {
      const records = metricsStore.getAll();
      if (records.length === 0) {
        vscode.window.showInformationMessage("No requests recorded yet.");
        return;
      }
      const last = records[0];
      const msg =
        `Last request:\n` +
        `  Query: ${last.query}\n` +
        `  Before: ${last.beforeTokens} tokens\n` +
        `  After:  ${last.afterTokens} tokens\n` +
        `  Saved:  ${last.beforeTokens - last.afterTokens} tokens (${last.reductionPercent}%)\n` +
        `  Stages: ${last.stagesUsed.join(" → ")}\n` +
        `  Preprocess latency: ${last.preprocessLatencyMs}ms`;
      vscode.window.showInformationMessage(msg);
    })
  );

  // Configure Budgets
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.configureBudgets", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "rocketToken"
      );
    })
  );

  // Clear Metrics
  context.subscriptions.push(
    vscode.commands.registerCommand("rocketToken.clearMetrics", async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Clear all token optimization metrics?",
        { modal: true },
        "Clear"
      );
      if (confirm === "Clear") {
        metricsStore.clear();
        DashboardPanel.refresh();
        vscode.window.showInformationMessage("Metrics cleared.");
      }
    })
  );

  // Chat participant: @rocket-optimize <question>
  const chatApi = (vscode as any).chat;
  if (chatApi?.createChatParticipant) {
    const participant = chatApi.createChatParticipant(
      "rocket-optimize",
      async (request: any, _chatCtx: any, stream: any, _token: vscode.CancellationToken) => {
        const query: string = request?.prompt ?? "";
        if (!query.trim()) {
          stream.markdown("Please provide a question. Example: `@rocket-optimize Why does retry fail?`");
          return;
        }

        stream.markdown("Optimizing context...\n");
        const raw = await collectEditorContext();
        const config = getConfig();
        const result = await optimizeAndSend(query, raw, config);

        persistMetricRecord(query, result);
        DashboardPanel.refresh();

        stream.markdown(
          `**Token reduction:** ${result.beforeTokens.toLocaleString()} → ${result.afterTokens.toLocaleString()} ` +
          `(**${result.reductionPercent}% saved**) | Stages: \`${result.stagesUsed.join(" → ")}\` | ` +
          `Preprocess: ${result.preprocessLatencyMs}ms\n\n` +
          `**Optimized prompt ready.** Copy it to your LLM tool of choice or trigger your API call.\n\n` +
          `\`\`\`\n${result.optimizedPrompt.slice(0, 800)}${result.optimizedPrompt.length > 800 ? "\n...(truncated for display)" : ""}\n\`\`\``
        );
      }
    );
    if (participant) context.subscriptions.push(participant);
  }
}

export function deactivate(): void {}
