import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { EnforcementDecision, PolicyConfig } from "./types";

const DEFAULT_CONFIG: PolicyConfig = {
  blockOnSave: true,
  blockOnCommit: true,
  entropyThreshold: 4.5,
  ignorePatterns: [],
  blockThreshold: 0.85,
  warnThreshold: 0.65
};

export class PolicyEngine {
  private config: PolicyConfig = { ...DEFAULT_CONFIG };

  public async loadConfig(): Promise<PolicyConfig> {
    const workspaceConfig = await this.readWorkspaceConfig();
    const editorConfig = vscode.workspace.getConfiguration("aiDlpGuard");

    this.config = {
      ...DEFAULT_CONFIG,
      blockOnSave: workspaceConfig?.blockOnSave ?? editorConfig.get<boolean>("blockOnSave", DEFAULT_CONFIG.blockOnSave),
      blockOnCommit: workspaceConfig?.blockOnCommit ?? editorConfig.get<boolean>("blockOnCommit", DEFAULT_CONFIG.blockOnCommit),
      entropyThreshold:
        workspaceConfig?.entropyThreshold ?? editorConfig.get<number>("entropyThreshold", DEFAULT_CONFIG.entropyThreshold),
      ignorePatterns: workspaceConfig?.ignorePatterns ?? editorConfig.get<string[]>("ignorePatterns", DEFAULT_CONFIG.ignorePatterns),
      blockThreshold: workspaceConfig?.blockThreshold ?? editorConfig.get<number>("blockThreshold", DEFAULT_CONFIG.blockThreshold),
      warnThreshold: workspaceConfig?.warnThreshold ?? editorConfig.get<number>("warnThreshold", DEFAULT_CONFIG.warnThreshold)
    };

    this.validate();
    return this.config;
  }

  public getConfig(): PolicyConfig {
    return this.config;
  }

  public evaluateScore(score: number): EnforcementDecision {
    if (score > this.config.blockThreshold) {
      return "block";
    }
    if (score > this.config.warnThreshold) {
      return "warn";
    }
    return "allow";
  }

  public isIgnored(text: string): boolean {
    if (!this.config.ignorePatterns.length) {
      return false;
    }

    return this.config.ignorePatterns.some((pattern) => {
      if (!pattern) {
        return false;
      }
      return text.includes(pattern);
    });
  }

  public addIgnorePattern(pattern: string): void {
    if (!pattern || this.config.ignorePatterns.includes(pattern)) {
      return;
    }
    this.config.ignorePatterns.push(pattern);
  }

  private validate(): void {
    if (this.config.warnThreshold < 0 || this.config.warnThreshold > 1) {
      this.config.warnThreshold = DEFAULT_CONFIG.warnThreshold;
    }
    if (this.config.blockThreshold < 0 || this.config.blockThreshold > 1) {
      this.config.blockThreshold = DEFAULT_CONFIG.blockThreshold;
    }
    if (this.config.warnThreshold >= this.config.blockThreshold) {
      this.config.warnThreshold = Math.max(0, this.config.blockThreshold - 0.2);
    }
    if (this.config.entropyThreshold < 0 || this.config.entropyThreshold > 8) {
      this.config.entropyThreshold = DEFAULT_CONFIG.entropyThreshold;
    }
    if (!Array.isArray(this.config.ignorePatterns)) {
      this.config.ignorePatterns = [];
    }
  }

  private async readWorkspaceConfig(): Promise<Partial<PolicyConfig> | undefined> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return undefined;
    }

    const configPath = path.join(workspaceFolder, "security-config.json");
    if (!fs.existsSync(configPath)) {
      return undefined;
    }

    try {
      const raw = await fs.promises.readFile(configPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<PolicyConfig>;
      return parsed;
    } catch {
      vscode.window.showWarningMessage("Rocket - IPG: Invalid security-config.json. Falling back to safe defaults.");
      return undefined;
    }
  }
}
