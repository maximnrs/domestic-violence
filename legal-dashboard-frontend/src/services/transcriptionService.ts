import type { TranscriptionStatus } from "../types/legalDashboard";
import { downloadEvidence, transcribeEvidence, transcribeDemo } from "./api";

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
  fileName,
}: {
  evidenceId: string;
  fileName?: string;
}): Promise<TranscriptionResult> {
  const whisperUrl = import.meta.env.VITE_WHISPER_URL;

  // If the Whisper URL is configured, download the audio from the existing
  // evidence endpoint and send it directly to the Whisper service.
  // This works without needing the new FastAPI transcription endpoints deployed.
  if (whisperUrl) {
    const download = await downloadEvidence(parseInt(evidenceId, 10));

    // Convert the hex-encoded bytes from the API back into a binary Blob
    const hex = download.data;
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const blob = new Blob([bytes], { type: "audio/mp4" });
    const audioFile = new File([blob], fileName ?? `evidence-${evidenceId}.m4a`, { type: "audio/mp4" });

    const formData = new FormData();
    formData.append("file", audioFile);

    const response = await fetch(whisperUrl, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Whisper service error");

    const result = await response.json() as { text: string; language: string; language_probability: number; segments?: TranscriptionSegment[] };
    return {
      id: `transcript-${evidenceId}-${Date.now()}`,
      fileName: audioFile.name,
      status: "completed",
      text: result.text,
      segments: result.segments,
      requestedAt: new Date().toISOString(),
      language: result.language,
      languageProbability: result.language_probability,
    };
  }

  // Fall back to the FastAPI transcription endpoint if no direct Whisper URL is set
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
