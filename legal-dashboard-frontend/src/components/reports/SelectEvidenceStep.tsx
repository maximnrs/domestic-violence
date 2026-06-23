import type { Evidence, LegalCase } from "../../types/legalDashboard";
import { EvidenceSecurityNotice } from "../evidence/EvidenceSecurityNotice";
import { EvidenceTable } from "../evidence/EvidenceTable";

type SelectEvidenceStepProps = {
  selectedCase?: LegalCase;
  selectedEvidenceIds: string[];
  onToggleEvidence: (evidenceId: string) => void;
};

export function SelectEvidenceStep({
  selectedCase,
  selectedEvidenceIds,
  onToggleEvidence,
}: SelectEvidenceStepProps) {
  const evidence: Evidence[] =
    selectedCase?.incidents.flatMap((incident) => incident.evidence) ?? [];

  return (
    <div className="wizard-panel wide-panel">
      <h2>Select Evidence</h2>
      <p>Select controlled evidence items for the draft report package.</p>
      <EvidenceTable
        evidence={evidence}
        selectedEvidenceIds={selectedEvidenceIds}
        onToggleSelect={onToggleEvidence}
      />
      <EvidenceSecurityNotice />
    </div>
  );
}
