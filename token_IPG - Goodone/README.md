# Rocket - IPG

A VS Code extension that reduces the tokens sent to any LLM by intelligently extracting and filtering only the context relevant to your question — before each request.

---

## What it does

Instead of sending your full file, chat history, or trace log to the model, this extension runs a smart pipeline that keeps only what matters and removes the rest — reducing token usage by 30–99% depending on the input type.

---

## Pipeline stages

| Stage | Runs when | Purpose |
|---|---|---|
| Targeted Extraction | File/trace analysis only | Extract only lines relevant to the query from large files |
| Failure Forensics | Failure-intent queries | Widen extraction around error markers and storage dump blocks |
| Error Start Evidence | Error-origin queries | Deterministically pull failure timestamp, process fail line, dump ASCII, RC and Return Message |
| Cleanup | Always | Remove comments, whitespace noise, hex dump noise, SQL metadata |
| Budget Gate | Always | Measure tokens after cleanup; skip ranking if already within budget |
| Context Focus | Only if over threshold | Score and keep only highest-relevance chunks in timeline order |
| Deep Compression | Only if still over budget | Keep signatures, control flow, and key keywords |

---

## Commands

Open Command Palette (`Ctrl+Shift+P`) and type `rocket - ipg`:

| Command | Best for |
|---|---|
| `Rocket - IPG: Ask Optimized` | Ask a question using current editor as context |
| `Rocket - IPG: Optimize Selected Text` | Analyze only highlighted code or text |
| `Rocket - IPG: Optimize Active File Context` | Use full active file as context |
| `Rocket - IPG: Optimize Active File (Full Context Demo)` | One-click mode that keeps full file context (no context focus, no deep compression) |
| `Rocket - IPG: Optimize File (Query-Guided)` | Pick any file (log, trace, source) and ask a focused question |
| `Rocket - IPG: Optimize Current File` | Ask about the currently open file without file picker |
| `Rocket - IPG: Open Token Dashboard` | View token savings, stage breakdown, and optimized prompt |
| `Rocket - IPG: Show Last Reduction Report` | Quick stats for the most recent request |
| `Rocket - IPG: Configure Token Budgets` | Open settings for budget and threshold control |
| `Rocket - IPG: Clear Metrics History` | Reset all stored metrics |

---

## Demo scenarios

### 1 — Analyze File (trace / log)
Open Command Palette → `Optimize File (Query-Guided)` → pick a tcVISION trace file.
Question: `where is the error starting point ?`
Output: failure timestamp, process fail line, storage dump ASCII with failing payload, RC and Return Message.

### 2 — Optimize Current File
Open a trace file → `Optimize Current File`.
Question: `What failed and what is the return code and return message?`
Output: exception line, RC, Return Message, nearby context.

### 3 — Optimize Selected Text (code bug)
Open any source file, select a function block → `Optimize Selected Text`.
Question: `What bug risk exists in this parsing logic and what minimal patch should I apply?`
Output structured as: `ROOT CAUSE / PATCH DIFF / TEST CASE`

### 4 — Ask Optimized (project context)
Keep a source file open, no selection needed → `Ask Optimized`.
Question: `Why can RC be 12 in processing while SQL operations mostly succeed before failure?`
Output structured as: `PROBABLE CAUSE TREE / CODE PATH / VERIFICATION`

### 5 — Optimize Active File (Full Context Demo)
Keep a very large file open and run `Optimize Active File (Full Context Demo)`.
Use this when you want to keep the whole class/file context for demo quality without chunk ranking.

---

## Dashboard

After every command the dashboard opens automatically showing:

- Raw file tokens / After optimize / Saved / Latency
- Pipeline stages used
- Stage reduction breakdown:
  - Targeted Extraction reduced this
  - Cleanup reduced this
  - Budget Gate (Headroom) reduced this
  - Context Focus reduced this
- Copyable optimized prompt ready to paste into any LLM

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `rocketToken.maxInputTokens` | `6000` | Maximum tokens to send to the model |
| `rocketToken.contextFocusThresholdPercent` | `50` | Run Context Focus when token usage exceeds this % of budget |
| `rocketToken.enableCompression` | `true` | Enable deep compression as final fallback |
| `rocketToken.contextFocusTimeoutMs` | `120` | Max ms for Context Focus before fallback |
| `rocketToken.compressionTimeoutMs` | `180` | Max ms for compression before fallback |

---

## Architecture

```
src/
  extension.ts              ← Command registration and chat participant
  pipeline/
    types.ts                ← Shared interfaces and stage saving types
    contextCollector.ts     ← Gather editor/selection context
    fileAnalyzer.ts         ← Query-guided extraction for logs, traces, large files
    tokenEstimator.ts       ← Token counting (chars/4 approximation)
    optimizer.ts            ← Full pipeline orchestration for code/chat queries
    contextRanker.ts        ← Relevance scoring and context focus ranking
    cleanupContext.ts       ← Fast rule-based noise removal
    compressor.ts           ← Deep compression fallback
  metrics/
    metricsStore.ts         ← Persists metric records via VS Code global state
  dashboard/
    dashboardPanel.ts       ← Webview panel lifecycle
    dashboardHtml.ts        ← Dashboard HTML with stage reduction breakdown
```

---

## Production upgrade path

| Component | Current | Production |
|---|---|---|
| Token counting | `text.length / 4` | tiktoken WASM binding |
| Context Focus ranking | keyword frequency + forensic scoring | BGE reranker or hybrid BM25 + embeddings |
| Deep compression | regex line filter | LLMLingua or Tree-sitter AST |
| Metrics storage | VS Code global state | SQLite or remote telemetry |
| LLM call | copy-to-clipboard | GitHub Models API / Azure OpenAI |

---

