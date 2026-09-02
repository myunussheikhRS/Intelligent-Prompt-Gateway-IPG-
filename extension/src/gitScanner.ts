import { execFile } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import { PolicyEngine } from "./policyEngine";
import { Scanner } from "./scanner";

const execFileAsync = promisify(execFile);

export class GitScanner {
  public constructor(
    private readonly scanner: Scanner,
    private readonly policyEngine: PolicyEngine
  ) {}

  public async scanStagedChanges(workspacePath: string): Promise<{ blocked: boolean; findings: number; highest: number }> {
    try {
      const { stdout } = await execFileAsync("git", ["diff", "--cached", "--unified=0", "--no-color"], {
        cwd: workspacePath,
        maxBuffer: 10 * 1024 * 1024
      });

      const addedLines = stdout
        .split(/\r?\n/)
        .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
        .map((line) => line.slice(1));

      if (!addedLines.length) {
        return { blocked: false, findings: 0, highest: 0 };
      }

      const scanResult = this.scanner.scanTextBlock(addedLines.join("\n"), "staged-diff");
      const blocked = this.policyEngine.getConfig().blockOnCommit && scanResult.decision === "block";

      return {
        blocked,
        findings: scanResult.findings.length,
        highest: scanResult.highestScore
      };
    } catch {
      vscode.window.showWarningMessage("Rocket - IPG: Unable to scan staged git diff.");
      return { blocked: false, findings: 0, highest: 0 };
    }
  }

  public async secureCommit(workspacePath: string): Promise<void> {
    const result = await this.scanStagedChanges(workspacePath);

    if (result.blocked) {
      vscode.window.showErrorMessage(
        `Rocket - IPG blocked commit. ${result.findings} sensitive finding(s), highest score ${result.highest.toFixed(2)}.`
      );
      return;
    }

    if (result.findings > 0) {
      const proceed = await vscode.window.showWarningMessage(
        `Rocket - IPG found ${result.findings} risky staged item(s). Highest score ${result.highest.toFixed(2)}. Continue commit?`,
        "Commit Anyway",
        "Cancel"
      );
      if (proceed !== "Commit Anyway") {
        return;
      }
    }

    await vscode.commands.executeCommand("git.commit");
  }

  public async scanRepository(workspacePath: string): Promise<{ findings: number; highest: number }> {
    try {
      const { stdout } = await execFileAsync("git", ["ls-files"], {
        cwd: workspacePath,
        maxBuffer: 10 * 1024 * 1024
      });

      const files = stdout.split(/\r?\n/).filter(Boolean).slice(0, 400);
      if (!files.length) {
        return { findings: 0, highest: 0 };
      }

      let totalFindings = 0;
      let highest = 0;

      for (const file of files) {
        try {
          const { stdout: content } = await execFileAsync("git", ["show", `HEAD:${file}`], {
            cwd: workspacePath,
            maxBuffer: 2 * 1024 * 1024
          });

          const result = this.scanner.scanTextBlock(content, file);
          totalFindings += result.findings.length;
          highest = Math.max(highest, result.highestScore);
        } catch {
          // Skip files that cannot be decoded as text from git show.
        }
      }

      return { findings: totalFindings, highest };
    } catch {
      return { findings: 0, highest: 0 };
    }
  }

  public async scanPullRequestLikeDiff(workspacePath: string, baseRef = "HEAD~1", headRef = "HEAD"): Promise<{ findings: number; highest: number }> {
    try {
      const { stdout } = await execFileAsync("git", ["diff", "--unified=0", "--no-color", `${baseRef}...${headRef}`], {
        cwd: workspacePath,
        maxBuffer: 10 * 1024 * 1024
      });

      const addedLines = stdout
        .split(/\r?\n/)
        .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
        .map((line) => line.slice(1));

      if (!addedLines.length) {
        return { findings: 0, highest: 0 };
      }

      const result = this.scanner.scanTextBlock(addedLines.join("\n"), "pr-diff");
      return { findings: result.findings.length, highest: result.highestScore };
    } catch {
      return { findings: 0, highest: 0 };
    }
  }

  public async getRepositorySecurityHealth(workspacePath: string): Promise<{ score: number; findings: number; highest: number }> {
    const staged = await this.scanStagedChanges(workspacePath);
    const repo = await this.scanRepository(workspacePath);

    const findings = staged.findings + repo.findings;
    const highest = Math.max(staged.highest, repo.highest);
    const penalty = Math.min(100, findings * 2 + Math.round(highest * 40));
    return {
      score: Math.max(0, 100 - penalty),
      findings,
      highest
    };
  }

  public async getSecretTrendAndDeveloperContribution(
    workspacePath: string
  ): Promise<{ trendLast7Days: number[]; trendLast30Days: number[]; developerRisk: Array<{ author: string; risk: number }> }> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["log", "--since=30 days ago", "--numstat", "--pretty=format:__COMMIT__|%an|%ad", "--date=short"],
        { cwd: workspacePath, maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = stdout.split(/\r?\n/);
      const byDate = new Map<string, number>();
      const byAuthor = new Map<string, number>();
      let currentAuthor = "unknown";
      let currentDate = "";

      for (const line of lines) {
        if (line.startsWith("__COMMIT__|")) {
          const parts = line.split("|");
          currentAuthor = parts[1] || "unknown";
          currentDate = parts[2] || "";
          continue;
        }

        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) {
          continue;
        }

        const added = Number(parts[0]);
        if (!Number.isFinite(added)) {
          continue;
        }

        byDate.set(currentDate, (byDate.get(currentDate) ?? 0) + added);
        byAuthor.set(currentAuthor, (byAuthor.get(currentAuthor) ?? 0) + added);
      }

      const trendLast30Days = this.buildTrendArray(30, byDate);
      const trendLast7Days = trendLast30Days.slice(-7);
      const developerRisk = [...byAuthor.entries()]
        .map(([author, changed]) => ({ author, risk: Math.min(100, Math.round(changed / 20)) }))
        .sort((a, b) => b.risk - a.risk)
        .slice(0, 10);

      return {
        trendLast7Days,
        trendLast30Days,
        developerRisk
      };
    } catch {
      return {
        trendLast7Days: [],
        trendLast30Days: [],
        developerRisk: []
      };
    }
  }

  private buildTrendArray(days: number, byDate: Map<string, number>): number[] {
    const values: number[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      values.push(byDate.get(key) ?? 0);
    }
    return values;
  }
}
