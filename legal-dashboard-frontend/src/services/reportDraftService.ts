import { mockReportDraft } from "../data/mockData";
import type { Evidence, LegalCase, ReportDraft, TranscriptionStatus } from "../types/legalDashboard";
import type { TranscriptionResult } from "./transcriptionService";
import { hydrateReportCaseData } from "./legalReportApi";
import { buildLegalReportDocument } from "./legalReportMapper";
import { downloadLegalReportPdf } from "./legalReportPdfRenderer";

export async function createReportDraft(caseId: string): Promise<ReportDraft> {
  return Promise.resolve({
    ...mockReportDraft,
    selectedCaseId: caseId,
  });
}

export async function updateReportDraftEvidence(
  reportDraftId: string,
  selectedEvidenceIds: string[]
): Promise<ReportDraft> {
  return Promise.resolve({
    ...mockReportDraft,
    id: reportDraftId,
    selectedEvidenceIds,
  });
}

export async function requestTranscription(reportDraftId: string, evidenceId: string) {
  void reportDraftId;
  void evidenceId;
  // TODO junior-dev:
  // Call requestReportAudioTranscription from transcriptionService after the backend endpoint is ready.
  // This should be invoked from the report-generation flow only, after evidence is selected.
  throw new Error("Not implemented yet");
}

export async function getTranscriptionJobStatus(jobId: string): Promise<TranscriptionStatus> {
  void jobId;
  // TODO junior-dev:
  // Poll the backend transcription job status here and map the backend response to TranscriptionStatus.
  throw new Error("Not implemented yet");
}

export async function attachTranscriptToReportDraft(reportDraftId: string, transcriptId: string) {
  void reportDraftId;
  void transcriptId;
  // TODO junior-dev:
  // Attach completed transcripts to the draft so generated reports include verified audio text.
  throw new Error("Not implemented yet");
}

export async function generateLegalReportPackage({
  caseRecord,
  selectedEvidence,
  selectedEvidenceIds,
  transcriptsByEvidenceId,
}: {
  caseRecord: LegalCase;
  selectedEvidence: Evidence[];
  selectedEvidenceIds: string[];
  transcriptsByEvidenceId: Record<string, TranscriptionResult>;
}) {
  const hydrated = await hydrateReportCaseData({ caseRecord, selectedEvidenceIds });
  const report = buildLegalReportDocument({
    caseRecord: hydrated.caseRecord,
    selectedEvidence: hydrated.selectedEvidence.length > 0 ? hydrated.selectedEvidence : selectedEvidence,
    transcriptsByEvidenceId,
    warnings: hydrated.warnings,
  });

  downloadLegalReportPdf(report);
  return report;
}
