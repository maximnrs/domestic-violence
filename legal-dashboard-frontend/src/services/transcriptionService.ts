import type { TranscriptionStatus } from "../types/legalDashboard";
import { transcribeEvidence, transcribeDemo } from "./api";

export type DemoTranscriptionRequest = {
  file: File;
  reportDraftId?: string;
  evidenceId?: string;
};

export type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptionResult = {
  id: string;
  fileName: string;
  status: TranscriptionStatus;
  text: string;
  segments?: TranscriptionSegment[];
  requestedAt: string;
  language?: string;
  languageProbability?: number;
};

export async function transcribeReportAudioForDemo({
  file,
}: DemoTranscriptionRequest): Promise<TranscriptionResult> {
  // Call the Whisper service directly from the browser when the URL is configured.
  // This allows testing without needing the full FastAPI backend running locally.
  const whisperUrl = import.meta.env.VITE_WHISPER_URL;

  if (whisperUrl) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(whisperUrl, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Whisper service error");

    const result = await response.json() as { text: string; language: string; language_probability: number; segments?: TranscriptionSegment[] };
    return {
      id: `demo-transcript-${Date.now()}`,
      fileName: file.name,
      status: "completed",
      text: result.text,
      segments: result.segments,
      requestedAt: new Date().toISOString(),
      language: result.language,
      languageProbability: result.language_probability,
    };
  }

  // Fall back to the backend demo endpoint when no direct Whisper URL is set
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
