# Rocket - IPG

Protect AI. Optimize AI. Govern AI.

Rocket - IPG is a local-first VS Code extension for AI Data Leak Prevention and AI Governance.
It preserves and enhances all existing Rocket - IPG functionality while adding prompt and response firewalls, reversible tokenization, policy-based governance, enterprise audit trail, and executive dashboards.

## AI Token Optimization Architecture

New additive optimization modules live under `src/optimization`:

- `src/optimization/contextBuilder.ts`
- `src/optimization/contextRanker.ts`
- `src/optimization/contextExtractor.ts`
- `src/optimization/tokenAnalyzer.ts`
- `src/optimization/tokenOptimizer.ts`
- `src/optimization/duplicateRemover.ts`
- `src/optimization/compressionEngine.ts`
- `src/optimization/responseCompressor.ts`
- `src/optimization/repositoryIndexer.ts`
- `src/optimization/optimizationMetrics.ts`
- `src/optimization/optimizationReport.ts`

Security-preserving optimization pipeline:

Context Builder
-> Context Optimization
-> Secret and PII Detection
-> Tokenization
-> Prompt Firewall
-> LLM

## Local-First Security Guarantees

- No mandatory cloud dependency
- Detection and governance run locally by default
- No external secret scanning service required
- Hash-based handling for sensitive values in logs and audit metadata

## Legacy Features Preserved

- Regex-based secret detection
- Entropy detection
- Context detection
- Save scanning
- Paste scanning
- Selection scanning
- Git commit scanning
- Risk scoring and policy evaluation
- Dashboard and highlights
- Secure commit workflow

## New Product Architecture

- `src/aiShield/promptFirewall.ts`
- `src/aiShield/responseFirewall.ts`
- `src/aiShield/tokenizer.ts`
- `src/aiShield/detokenizer.ts`
- `src/aiShield/classifier.ts`
- `src/aiShield/policyManager.ts`
- `src/aiShield/auditEngine.ts`
- `src/aiShield/llmAdapters.ts`
- `src/aiShield/riskEngine.ts`
- `src/aiShield/detectionEngine.ts`
- `src/aiShield/analytics.ts`
- `src/dashboard/executiveDashboard.ts`
- `src/dashboard/telemetry.ts`
- `src/dashboard/riskCharts.ts`
- `src/models/finding.ts`
- `src/models/auditRecord.ts`
- `src/models/policy.ts`
- `src/models/tokenMap.ts`
- `src/models/riskScore.ts`

## Prompt Firewall Flow

User Prompt
-> Detection Engine
-> Risk Engine (0-100)
-> Policy Manager (role-based)
-> Tokenization (reversible)
-> Safe Prompt
-> LLM

## Response Firewall Flow

LLM Response
-> Detection Engine
-> Risk Engine
-> Policy Manager
-> Block/Warn/Allow
-> Detokenization (for token placeholders)
-> Safe Response to user

## Risk Bands

- 0-20 Safe
- 21-40 Low
- 41-60 Medium
- 61-80 High
- 81-100 Critical

## Commands

### Existing
- `Rocket - IPG: Open Security Dashboard`
- `Rocket - IPG: Scan Current File`
- `Rocket - IPG: Scan Selected Text`
- `Rocket - IPG: Scan Staged Changes`
- `Rocket - IPG: Secure Commit (Scan then Commit)`

### Rocket - IPG
- `Rocket - IPG: Open Executive Dashboard`
- `Rocket - IPG: Scan Selected Text`
- `Rocket - IPG: Inspect AI Response (Output Firewall)`
- `Rocket - IPG: AI Red Team Assessment`
- `Rocket - IPG: Scan MCP Server`
- `Rocket - IPG: LLM Security Assessment`
- `Rocket - IPG: Scan Entire Repository`
- `Rocket - IPG: Scan Pull Request Diff`
- `Rocket - IPG: Repository Security Health`
- `Rocket - IPG: Open SOC View`
- `Rocket - IPG: Build Smart Context`
- `Rocket - IPG: Analyze Token Usage`
- `Rocket - IPG: Optimize AI Response`
- `Rocket - IPG: Open AI Efficiency Dashboard`
- `Rocket - IPG: Generate Demo Scenario`
- `Rocket - IPG: Export Audit JSON`
- `Rocket - IPG: Export Audit CSV`
- `Rocket - IPG: Export Policy`
- `Rocket - IPG: Import Policy`

## Configuration

Backward compatible settings remain under `aiDlpGuard.*`:

- `aiDlpGuard.blockOnSave`
- `aiDlpGuard.blockOnCommit`
- `aiDlpGuard.entropyThreshold`
- `aiDlpGuard.ignorePatterns`
- `aiDlpGuard.blockThreshold`
- `aiDlpGuard.warnThreshold`
- `aiDlpGuard.debounceMs`
- `aiDlpGuard.userRole` (`developer`, `support`, `hr`, `finance`, `admin`)

Workspace policy file support:

- `security-config.json` (legacy scanner settings)
- `rocket-policy.json` (role-based enterprise policy bundle)

Optimization settings:

- `rocketAIShield.autoOptimizeContext` (default: `false`)
- `rocketAIShield.costPer1kTokensUsd` (default: `0.002`)
- `rocketAIShield.clipboardGuardEnabled` (default: `false`)
- `rocketAIShield.clipboardGuardPollMs` (default: `1200`)
- `rocketAIShield.clipboardGuardMinChars` (default: `24`)
- `rocketAIShield.clipboardGuardProvider` (default: `copilot`)
- `rocketAIShield.clipboardGuardNotify` (default: `true`)
- `rocketAIShield.clipboardGuardShowBadge` (default: `true`)

## Copilot Chat Middle-Layer Workflow

Rocket - IPG cannot directly hook into private Copilot network internals, but it provides a practical middle-layer for paste workflows:

1. Copy prompt/context text.
2. Rocket - IPG optimizes and secures clipboard content.
3. Paste into Copilot Chat.

Commands:

- `Rocket - IPG: Prepare Clipboard For Copilot Chat` (manual one-shot)
- `Rocket - IPG: Toggle Copilot Clipboard Guard` (continuous auto mode)

When enabled, clipboard content is processed through token optimization and prompt firewall tokenization before paste.
The status bar shows a live badge with token counts before/after and reduction percentage so users can verify protection before pasting into Copilot chat.

## Run

1. Open the `extension` folder in VS Code.
2. Install dependencies:
   - `npm.cmd install`
3. Compile:
   - `npm.cmd run compile`
4. Press `F5` to launch Extension Development Host.

## Demo Workflow (Hackathon/Judges)

1. Run `Rocket - IPG: Generate Demo Scenario`.
2. Open generated file and run `Rocket - IPG: Scan Current File`.
3. Run `Rocket - IPG: Scan Selected Text` on sensitive prompt text.
4. Confirm risk score and tokenization action.
5. Run `Rocket - IPG: Inspect AI Response (Output Firewall)` with a risky SQL or dump response.
6. Open `Rocket - IPG: Open Executive Dashboard` for visual metrics and threat feed.
7. Export artifacts using `Rocket - IPG: Export Audit JSON` and `Rocket - IPG: Export Audit CSV`.

## AI Security Validation Platform

Rocket - IPG now supports a complete AI Security Validation workflow:

1. `Rocket - IPG: AI Red Team Assessment`
- Runs 100+ attack templates across prompt injection, jailbreaks, exfiltration, impersonation, tool abuse, and RAG attacks.
- Exports JSON/CSV/HTML reports and logs all findings in audit.

2. `Rocket - IPG: Scan MCP Server`
- Assesses MCP tools for unsafe definitions, over-privilege, weak auth, prompt injection risk, and data leakage risk.
- Produces MCP security score and recommendations.

3. `Rocket - IPG: LLM Security Assessment`
- Runs model security benchmark cases across injection, leakage, hallucination, unsafe following, toxicity, and compliance risks.
- Produces LLM security score and recommendations.

4. Unified Security Score
- Executive dashboard computes a 0-100 score from prompt firewall, response firewall, repository security, MCP, LLM security, and red-team results.
- Includes trend views for 7/30/90 days, risk heatmap, and maturity gauge.

## Notes

- VS Code does not expose a universal API to transparently intercept every third-party extension network request. This implementation provides local pre-send and post-receive inspection workflows and editor-path enforcement.
- Future provider-specific deep hooks can be added via adapter implementations in `llmAdapters.ts`.
