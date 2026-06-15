import type { LegalCase } from "../../types/legalDashboard";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";

type CaseSummaryCardProps = {
  legalCase: LegalCase;
};

export function CaseSummaryCard({ legalCase }: CaseSummaryCardProps) {
  const totalEvidence = legalCase.incidents.reduce(
    (total, incident) => total + incident.evidence.length,
    0
  );

  return (
    <Card className="case-summary-card">
      <div className="case-folder" aria-hidden="true" />
      <div className="case-summary-main">
        <div className="case-title-line">
          <h2>{legalCase.id}</h2>
          <StatusPill status={legalCase.status} />
        </div>
        <div className="summary-fields">
          <div>
            <span>Survivor Alias</span>
            <strong>{legalCase.survivorAlias}</strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{legalCase.createdAt}</strong>
          </div>
          <div>
            <span>Last Incident</span>
            <strong>{legalCase.lastIncidentAt}</strong>
          </div>
          <div>
            <span>Total Evidence</span>
            <strong>{totalEvidence} items</strong>
          </div>
        </div>
      </div>
    </Card>
  );
}
