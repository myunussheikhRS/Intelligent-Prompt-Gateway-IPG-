export interface StageSaving {
  key: "cleanup" | "headroom" | "focus" | "compression" | "extraction";
  label: string;
  savedTokens: number;
}

export interface SecuritySummary {
  scanDecision: "allow" | "warn" | "block";
  sensitiveFound: number;
  tokenizedCount: number;
  remainingFindings: number;
}

export interface MetricRecord {
  id: string;
  timestamp: number;
  query: string;
  rawFileTokens: number;
  beforeTokens: number;
  afterTokens: number;
  reductionPercent: number;
  stagesUsed: string[];
  preprocessLatencyMs: number;
  optimizedPrompt: string;
  stageSavings?: StageSaving[];
  securitySummary?: SecuritySummary;
}
