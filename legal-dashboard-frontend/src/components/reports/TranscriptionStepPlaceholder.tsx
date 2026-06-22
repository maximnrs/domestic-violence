import { useState } from "react";
import {
  requestReportAudioTranscription,
  type TranscriptionResult,
} from "../../services/transcriptionService";
import type { AudioEvidence, TranscriptionStatus } from "../../types/legalDashboard";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";

type TranscriptionStepPlaceholderProps = {
  audioEvidence: AudioEvidence[];
  transcripts: Record<string, TranscriptionResult>;
  onTranscriptComplete: (evidenceId: string, transcript: TranscriptionResult) => void;
  status?: TranscriptionStatus;
};

const transcriptionStates: TranscriptionStatus[] = [
  "not_requested",
  "queued",
  "processing",
  "completed",
  "failed",
];

export function TranscriptionStepPlaceholder({
  audioEvidence,
  transcripts,
  onTranscriptComplete,
  status = "not_requested",
}: TranscriptionStepPlaceholderProps) {
  // Tracks which evidence items are currently being transcribed
  const [transcribing, setTranscribing] = useState<Record<string, boolean>>({});
  // Tracks any transcription errors per evidence item
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sends a selected evidence item to the backend, which downloads the audio
  // from the database and sends it to the Whisper service for transcription.
  async function handleTranscribeEvidence(evidenceId: string, fileName?: string) {
    setTranscribing((prev) => ({ ...prev, [evidenceId]: true }));
    setErrors((prev) => ({ ...prev, [evidenceId]: "" }));

    try {
      const result = await requestReportAudioTranscription({ evidenceId, fileName });
      onTranscriptComplete(evidenceId, result);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [evidenceId]: err instanceof Error ? err.message : "Transcription failed.",
      }));
    } finally {
      setTranscribing((prev) => ({ ...prev, [evidenceId]: false }));
    }
  }

  return (
    <div className="wizard-panel wide-panel">
      <h2>Transcribe Audio Evidence</h2>
      <p>Audio transcription will be requested before the report package is verified.</p>

      <div className="transcription-layout">
        <section>
          <h3>Selected audio evidence</h3>
          {audioEvidence.length === 0 ? (
            <div className="empty-state">No audio evidence selected for transcription.</div>
          ) : (
            <div className="audio-list">
              {audioEvidence.map((item) => (
                <Card key={item.id} className="audio-card">
                  <div>
                    <span className="muted-label">Evidence ID</span>
                    <strong>{item.id}</strong>
                  </div>
                  <div>
                    <span className="muted-label">Filename</span>
                    <strong>{item.filename}</strong>
                  </div>
                  <div className="audio-grid">
                    <span>Duration: {item.duration}</span>
                    <span>Source: {item.source}</span>
                    <span>Timestamp: {item.capturedAt}</span>
                    <span>Hash status: {item.hashVerified ? "Verified" : "Pending"}</span>
                  </div>

                  {/* Transcription controls for this evidence item */}
                  <div className="evidence-transcription">
                    <StatusPill
                      status={
                        transcribing[item.id]
                          ? "processing"
                          : transcripts[item.id]
                          ? "completed"
                          : errors[item.id]
                          ? "failed"
                          : "not_requested"
                      }
                    />
                    <Button
                      type="button"
                      onClick={() => handleTranscribeEvidence(item.id, item.filename)}
                      disabled={transcribing[item.id] || !!transcripts[item.id]}
                    >
                      {transcribing[item.id]
                        ? "Transcribing..."
                        : transcripts[item.id]
                        ? "Transcribed"
                        : "Transcribe"}
                    </Button>
                  </div>

                  {errors[item.id] ? (
                    <div className="transcript-error">{errors[item.id]}</div>
                  ) : null}

                  {transcripts[item.id] ? (
                    <div className="transcript-preview">
                      <span className="muted-label">Transcript</span>
                      <p>{transcripts[item.id].text}</p>
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </section>

        <aside className="status-panel">
          <span className="muted-label">Transcription status</span>
          <StatusPill status={status} />
          <div className="status-options" aria-label="Possible transcription states">
            {transcriptionStates.map((state) => (
              <StatusPill key={state} status={state} />
            ))}
          </div>
          <p>
            Transcript content will appear here only after a verified backend transcription job
            completes.
          </p>
        </aside>
      </div>
    </div>
  );
}
