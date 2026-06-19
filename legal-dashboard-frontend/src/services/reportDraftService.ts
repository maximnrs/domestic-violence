import { mockReportDraft } from "../data/mockData";
import type { ReportDraft, TranscriptionStatus } from "../types/legalDashboard";

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

export async function generateLegalReportPackage(reportDraftId: string) {
  void reportDraftId;
  // TODO report-generation:
  // This will eventually request the backend PDF/package generation endpoint.
  // Proposed PDF package sections for dev selection:
  // 1. Case header: case ID, survivor alias, status, created date, latest incident date.
  // 2. Incident summary: incident IDs, date/time, type, evidence counts, review status.
  // 3. Selected evidence manifest: evidence IDs, type, filename, captured timestamp, source, size.
  // 4. Integrity appendix: hash verification, timestamp verification, audit trail availability.
  // 5. Audio transcript appendix: include only completed verified transcripts, never placeholder text.
  // 6. Officer review notes and package generation audit metadata.
  throw new Error("Not implemented yet");
}
