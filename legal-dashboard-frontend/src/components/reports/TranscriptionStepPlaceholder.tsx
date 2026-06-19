import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  transcribeReportAudioForDemo,
  type TranscriptionResult,
} from "../../services/transcriptionService";
import type { AudioEvidence, TranscriptionStatus } from "../../types/legalDashboard";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";

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
      // TODO junior-dev:
      // Swap this demo helper for requestReportAudioTranscription once the backend endpoint exists.
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

      {/* TODO junior-dev:
          1. Send selected audio evidence to backend transcription endpoint.
          2. Poll transcription job status.
          3. Display completed transcript or error.
          4. Attach transcript result to the report draft.
          5. Return control to the report flow.
      */}
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
                </Card>
              ))}
            </div>
          )}

          <section className="demo-transcription-panel" aria-label="Demo transcription upload">
            <div className="demo-panel-heading">
              <div>
                <span className="muted-label">Demo shortcut</span>
                <h3>Upload audio</h3>
              </div>
              <StatusPill status={demoTranscript?.status ?? (isDemoTranscribing ? "processing" : "not_requested")} />
            </div>

            {/* TODO junior-dev:
                Keep this upload demo available for showcase day, but wire the production path
                through report draft generation only. The real implementation should reuse the
                selected report evidence above instead of treating this as a permanent standalone tool.
            */}
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
                  <p>{demoTranscript.text}</p>
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
