import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  transcribeReportAudioForDemo,
  requestReportAudioTranscription,
  type TranscriptionResult,
  type TranscriptionSegment,
} from "../../services/transcriptionService";
import type { AudioEvidence, TranscriptionStatus } from "../../types/legalDashboard";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";

// Renders transcript segments with timestamps, or falls back to plain text
function TranscriptSegments({
  segments,
  fallbackText,
}: {
  segments?: TranscriptionSegment[];
  fallbackText: string;
}) {
  if (!segments || segments.length === 0) {
    return <p>{fallbackText}</p>;
  }
  return (
    <div className="transcript-segments">
      {segments.map((seg, i) => (
        <div key={i} className="transcript-segment">
          <span className="segment-timestamp">
            [{seg.start.toFixed(2)}s – {seg.end.toFixed(2)}s]
          </span>
          <span className="segment-text">{seg.text}</span>
        </div>
      ))}
    </div>
  );
}

type TranscriptionStepPlaceholderProps = {
  audioEvidence: AudioEvidence[];
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
  status = "not_requested",
}: TranscriptionStepPlaceholderProps) {
  // Tracks the transcript result for each evidence item by its ID
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptionResult>>({});
  // Tracks which evidence items are currently being transcribed
  const [transcribing, setTranscribing] = useState<Record<string, boolean>>({});
  // Tracks any transcription errors per evidence item
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Demo upload state (kept for showcase day)
  const [demoAudioFile, setDemoAudioFile] = useState<File | null>(null);
  const [demoTranscript, setDemoTranscript] = useState<TranscriptionResult | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [isDemoTranscribing, setIsDemoTranscribing] = useState(false);
  const demoAudioUrl = useMemo(
    () => (demoAudioFile ? URL.createObjectURL(demoAudioFile) : ""),
    [demoAudioFile]
  );

  useEffect(() => {
    return () => {
      if (demoAudioUrl) {
        URL.revokeObjectURL(demoAudioUrl);
      }
    };
  }, [demoAudioUrl]);

  // Sends a selected evidence item to the backend, which downloads the audio
  // from the database and sends it to the Whisper service for transcription.
  async function handleTranscribeEvidence(evidenceId: string) {
    setTranscribing((prev) => ({ ...prev, [evidenceId]: true }));
    setErrors((prev) => ({ ...prev, [evidenceId]: "" }));

    try {
      const result = await requestReportAudioTranscription({ evidenceId });
      setTranscripts((prev) => ({ ...prev, [evidenceId]: result }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [evidenceId]: err instanceof Error ? err.message : "Transcription failed.",
      }));
    } finally {
      setTranscribing((prev) => ({ ...prev, [evidenceId]: false }));
    }
  }

  function handleDemoAudioChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setDemoAudioFile(file);
    setDemoTranscript(null);
    setDemoError(null);
  }

  async function handleDemoTranscription() {
    if (!demoAudioFile) {
      return;
    }

    setIsDemoTranscribing(true);
    setDemoError(null);

    try {
      // Calls the real backend demo endpoint instead of returning mock data
      const result = await transcribeReportAudioForDemo({ file: demoAudioFile });
      setDemoTranscript(result);
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Could not transcribe this audio file.");
    } finally {
      setIsDemoTranscribing(false);
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
            <div className="empty-state">
              No audio evidence selected for transcription. Use the demo upload below to test this
              step without completing the earlier report steps.
            </div>
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
                      onClick={() => handleTranscribeEvidence(item.id)}
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

          {/* Demo upload — kept for showcase day. Uses the real Whisper backend
              but does not require going through the full report flow. */}
          <section className="demo-transcription-panel" aria-label="Demo transcription upload">
            <div className="demo-panel-heading">
              <div>
                <span className="muted-label">Demo shortcut</span>
                <h3>Upload audio</h3>
              </div>
              <StatusPill status={demoTranscript?.status ?? (isDemoTranscribing ? "processing" : "not_requested")} />
            </div>

            <label className="audio-upload-target">
              <span>Choose an audio file</span>
              <input
                type="file"
                accept="audio/*,.aac,.m4a,.mp3,.wav,.webm"
                onChange={handleDemoAudioChange}
              />
            </label>

            {demoAudioFile ? (
              <div className="demo-audio-preview">
                <div>
                  <span className="muted-label">Uploaded file</span>
                  <strong>{demoAudioFile.name}</strong>
                </div>
                {demoAudioUrl ? <audio controls src={demoAudioUrl} /> : null}
              </div>
            ) : null}

            <div className="demo-transcription-actions">
              <Button
                type="button"
                onClick={handleDemoTranscription}
                disabled={!demoAudioFile || isDemoTranscribing}
              >
                {isDemoTranscribing ? "Transcribing..." : "Show Transcript"}
              </Button>
            </div>

            {demoError ? <div className="transcript-error">{demoError}</div> : null}

            <div className="transcript-preview">
              <span className="muted-label">Transcript preview</span>
              {demoTranscript ? (
                <>
                  <strong>{demoTranscript.fileName}</strong>
                  {demoTranscript.language ? (
                    <span className="muted-label"> · Language: {demoTranscript.language.toUpperCase()}</span>
                  ) : null}
                  <TranscriptSegments segments={demoTranscript.segments} fallbackText={demoTranscript.text} />
                </>
              ) : (
                <p>The transcript will appear here after the demo upload is processed.</p>
              )}
            </div>
          </section>
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
