import type { LegalCase } from "../../types/legalDashboard";

type SelectCaseStepProps = {
  cases: LegalCase[];
  selectedCaseId?: string;
  onSelectCase: (caseId: string) => void;
};

export function SelectCaseStep({ cases, selectedCaseId, onSelectCase }: SelectCaseStepProps) {
  return (
    <div className="wizard-panel">
      <h2>Select Case</h2>
      <p>Choose the case you want to include in this legal report package.</p>
      <label className="field-label" htmlFor="case-select">Case</label>
      <select
        id="case-select"
        className="select-input"
        value={selectedCaseId}
        onChange={(event) => onSelectCase(event.target.value)}
      >
        {cases.map((caseRecord) => (
          <option key={caseRecord.id} value={caseRecord.id}>
            {caseRecord.id} - {caseRecord.survivorAlias}
          </option>
        ))}
      </select>
    </div>
  );
}
