import type { Evidence, Incident, LegalCase } from "../types/legalDashboard";
import type { TranscriptionResult } from "./transcriptionService";

export type LegalReportTranscript = {
  evidenceId: string;
  fileName: string;
  status: string;
  text: string;
  requestedAt: string;
  language: string;
  languageProbability: string;
};

export type LegalReportSection = {
  title: string;
  rows?: Array<[string, string]>;
  paragraphs?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
};

export type LegalReportDocument = {
  title: string;
  generatedAt: string;
  caseRecord: LegalCase;
  selectedEvidence: Evidence[];
  includedIncidents: Incident[];
  transcripts: LegalReportTranscript[];
  sections: LegalReportSection[];
  warnings: string[];
};

export type LegalReportBuildInput = {
  caseRecord: LegalCase;
  selectedEvidence: Evidence[];
  transcriptsByEvidenceId: Record<string, TranscriptionResult>;
  generatedAt?: Date;
  warnings?: string[];
};
