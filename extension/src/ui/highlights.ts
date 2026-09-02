import * as vscode from "vscode";
import { Finding } from "../types";

export class HighlightManager {
  private static readonly MAX_DECORATIONS = 1800;

  private readonly blockDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 0, 0, 0.20)",
    border: "1px solid rgba(255, 0, 0, 0.5)",
    overviewRulerColor: "rgba(255, 0, 0, 0.8)",
    overviewRulerLane: vscode.OverviewRulerLane.Right
  });

  private readonly warnDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 165, 0, 0.20)",
    border: "1px solid rgba(255, 165, 0, 0.5)",
    overviewRulerColor: "rgba(255, 165, 0, 0.8)",
    overviewRulerLane: vscode.OverviewRulerLane.Right
  });

  public apply(
    editor: vscode.TextEditor,
    findings: Finding[],
    blockThreshold: number,
    options?: { maxDecorations?: number }
  ): void {
    const blocked: vscode.DecorationOptions[] = [];
    const warned: vscode.DecorationOptions[] = [];
    const useWholeLine = findings.length > 900;
    const dedupe = new Set<string>();
    const maxDecorations = Math.max(1, options?.maxDecorations ?? HighlightManager.MAX_DECORATIONS);

    // Cap very large result sets to keep VS Code decorations responsive.
    const selectedFindings = findings
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, maxDecorations);

    for (const finding of selectedFindings) {
      let startLine = finding.startLine;
      let startChar = finding.startChar;
      let endLine = finding.endLine;
      let endChar = finding.endChar;

      if (editor.document.lineCount === 0) {
        continue;
      }

      const maxLine = editor.document.lineCount - 1;
      startLine = Math.max(0, Math.min(maxLine, startLine));
      endLine = Math.max(0, Math.min(maxLine, endLine));

      if (endLine < startLine) {
        endLine = startLine;
      }

      if (useWholeLine) {
        const safeLine = Math.max(0, Math.min(editor.document.lineCount - 1, finding.startLine));
        const lineRange = editor.document.lineAt(safeLine).range;
        startLine = lineRange.start.line;
        startChar = lineRange.start.character;
        endLine = lineRange.end.line;
        endChar = lineRange.end.character;
      } else {
        const startLineLength = editor.document.lineAt(startLine).text.length;
        const endLineLength = editor.document.lineAt(endLine).text.length;

        startChar = Math.max(0, Math.min(startLineLength, startChar));
        endChar = Math.max(0, Math.min(endLineLength, endChar));

        if (startLine === endLine && endChar <= startChar) {
          endChar = Math.min(endLineLength, startChar + 1);
        }

        if (startLine === endLine && startChar >= endLineLength && endLineLength > 0) {
          startChar = endLineLength - 1;
          endChar = endLineLength;
        }

        if (startLine === endLine && endLineLength === 0) {
          continue;
        }
      }

      const key = `${startLine}:${startChar}:${endLine}:${endChar}:${finding.score > blockThreshold ? "b" : "w"}`;
      if (dedupe.has(key)) {
        continue;
      }
      dedupe.add(key);

      const range = new vscode.Range(startLine, startChar, endLine, endChar);

      const option: vscode.DecorationOptions = {
        range,
        hoverMessage: this.hoverText(finding)
      };

      if (finding.score > blockThreshold) {
        blocked.push(option);
      } else {
        warned.push(option);
      }
    }

    editor.setDecorations(this.blockDecoration, blocked);
    editor.setDecorations(this.warnDecoration, warned);
  }

  public clear(editor: vscode.TextEditor): void {
    editor.setDecorations(this.blockDecoration, []);
    editor.setDecorations(this.warnDecoration, []);
  }

  public dispose(): void {
    this.blockDecoration.dispose();
    this.warnDecoration.dispose();
  }

  private hoverText(finding: Finding): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = false;
    markdown.appendMarkdown(`**Rocket - IPG**\n\n`);
    markdown.appendMarkdown(`- Score: ${finding.score.toFixed(2)}\n`);
    markdown.appendMarkdown(`- Sources: ${finding.sources.join(", ")}\n`);
    if (finding.ruleName) {
      markdown.appendMarkdown(`- Rule: ${finding.ruleName}\n`);
    }
    if (finding.contextHint) {
      markdown.appendMarkdown(`- Context: ${finding.contextHint}\n`);
    }
    markdown.appendMarkdown(`- Preview: ${finding.preview}`);
    return markdown;
  }
}
