import type { AudioEvidence, TranscriptionStatus } from "../../types/legalDashboard";
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
