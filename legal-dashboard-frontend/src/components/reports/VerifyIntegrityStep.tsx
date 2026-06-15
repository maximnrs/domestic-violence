import type { Evidence } from "../../types/legalDashboard";
import { Card } from "../ui/Card";

type VerifyIntegrityStepProps = {
  evidence: Evidence[];
};

export function VerifyIntegrityStep({ evidence }: VerifyIntegrityStepProps) {
  const allHashesVerified = evidence.every((item) => item.hashVerified);
  const allTimestampsVerified = evidence.every((item) => item.timestampVerified);
  const auditTrailsAvailable = evidence.every((item) => item.auditTrailAvailable);

  return (
    <div className="wizard-panel">
      <h2>Verify Integrity</h2>
      <p>Confirm evidence integrity before the legal report package is reviewed.</p>
      <div className="integrity-grid">
        <Card className="integrity-card">
          <span>Hash verification</span>
          <strong>{allHashesVerified ? "Verified" : "Needs review"}</strong>
        </Card>
        <Card className="integrity-card">
          <span>Timestamp verification</span>
          <strong>{allTimestampsVerified ? "Verified" : "Needs review"}</strong>
        </Card>
        <Card className="integrity-card">
          <span>Audit trail</span>
          <strong>{auditTrailsAvailable ? "Available" : "Unavailable"}</strong>
        </Card>
      </div>
    </div>
  );
}
