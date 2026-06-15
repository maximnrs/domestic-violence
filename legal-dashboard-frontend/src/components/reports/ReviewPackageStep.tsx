import type { Evidence, LegalCase } from "../../types/legalDashboard";
import { Card } from "../ui/Card";

type ReviewPackageStepProps = {
  selectedCase?: LegalCase;
  selectedEvidence: Evidence[];
};

export function ReviewPackageStep({ selectedCase, selectedEvidence }: ReviewPackageStepProps) {
  const audioCount = selectedEvidence.filter((item) => item.type === "Audio").length;

  return (
    <div className="wizard-panel">
      <h2>Review Package</h2>
      <p>Review what will be included before generation is requested.</p>

      {/* Report package inclusion notes for backend/PDF implementation:
          Include only selected case metadata, incident summaries for selected evidence,
          selected evidence manifest rows, integrity verification fields, completed verified
          transcripts when available, and generation audit metadata. Do not include raw file
          downloads or placeholder transcript text in the generated PDF package. */}
      <div className="review-grid">
        <Card className="review-card">
          <span>Case</span>
          <strong>{selectedCase?.id ?? "No case selected"}</strong>
        </Card>
        <Card className="review-card">
          <span>Selected evidence</span>
          <strong>{selectedEvidence.length} items</strong>
        </Card>
        <Card className="review-card">
          <span>Audio transcripts</span>
          <strong>{audioCount} pending request</strong>
        </Card>
      </div>
      <div className="package-list">
        {selectedEvidence.map((item) => (
          <div key={item.id} className="package-row">
            <span className="mono">{item.id}</span>
            <span>{item.type}</span>
            <span>{item.filename}</span>
            <span>{item.capturedAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
