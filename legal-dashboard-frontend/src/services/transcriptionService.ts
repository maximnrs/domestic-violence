import type { TranscriptionStatus } from "../types/legalDashboard";

export type DemoTranscriptionRequest = {
  file: File;
  reportDraftId?: string;
  evidenceId?: string;
};

export type TranscriptionResult = {
  id: string;
  fileName: string;
  status: TranscriptionStatus;
  text: string;
  requestedAt: string;
};

const DEMO_TRANSCRIPT_TEXT =
  "Demo transcript: The caller describes a recent incident, references the selected report evidence, and confirms the audio should be included in the legal report package.";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function transcribeReportAudioForDemo({
  file,
}: DemoTranscriptionRequest): Promise<TranscriptionResult> {
  // TODO junior-dev:
  // Replace this mock with a backend upload call that runs only during report generation.
  // The frontend should send FormData to the backend. The backend should hold the OpenAI
  // API key and call Whisper/transcriptions from there, never directly from the browser.
  await wait(700);

  return {
    id: `demo-transcript-${Date.now()}`,
    fileName: file.name,
    status: "completed",
    text: DEMO_TRANSCRIPT_TEXT,
    requestedAt: new Date().toISOString(),
  };
}

export async function requestReportAudioTranscription(
  request: DemoTranscriptionRequest
): Promise<TranscriptionResult> {
  void request;
  // TODO junior-dev:
  // Implement the production report-flow transcription request here.
  // Suggested contract:
  // POST /report-drafts/:reportDraftId/transcriptions
  // multipart/form-data: audio file, evidenceId, caseId if needed
  // response: transcript id, status, text, timestamps, model metadata
  throw new Error("Report audio transcription is not implemented yet.");
}
