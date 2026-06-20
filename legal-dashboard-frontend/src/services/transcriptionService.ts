import type { TranscriptionStatus } from "../types/legalDashboard";
import { transcribeEvidence, transcribeDemo } from "./api";

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
  language?: string;
  languageProbability?: number;
};

export async function transcribeReportAudioForDemo({
  file,
}: DemoTranscriptionRequest): Promise<TranscriptionResult> {
  // Sends the uploaded file to the backend demo endpoint, which forwards it
  // to the Whisper service. No evidence record is created in the database.
  const result = await transcribeDemo(file);

  return {
    id: `demo-transcript-${Date.now()}`,
    fileName: file.name,
    status: "completed",
    text: result.text,
    requestedAt: new Date().toISOString(),
    language: result.language,
    languageProbability: result.language_probability,
  };
}

export async function requestReportAudioTranscription({
  evidenceId,
}: {
  evidenceId: string;
}): Promise<TranscriptionResult> {
  // Sends the evidence ID to the backend, which downloads and decrypts
  // the audio from MinIO and sends it to the Whisper service.
  const result = await transcribeEvidence(parseInt(evidenceId, 10));

  return {
    id: `transcript-${result.evidence_id}-${Date.now()}`,
    fileName: `evidence-${result.evidence_id}`,
    status: "completed",
    text: result.text,
    requestedAt: new Date().toISOString(),
    language: result.language,
    languageProbability: result.language_probability,
  };
}
