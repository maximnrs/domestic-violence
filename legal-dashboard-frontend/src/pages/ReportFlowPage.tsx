import type { Evidence, LegalCase, ReportFlowStep } from "../types/legalDashboard";
import { ReportFlowStepper } from "../components/reports/ReportFlowStepper";
import { ReviewPackageStep } from "../components/reports/ReviewPackageStep";
import { SelectCaseStep } from "../components/reports/SelectCaseStep";
import { SelectEvidenceStep } from "../components/reports/SelectEvidenceStep";
import { VerifyIntegrityStep } from "../components/reports/VerifyIntegrityStep";
import { Button } from "../components/ui/Button";

type ReportFlowPageProps = {
  cases: LegalCase[];
  activeStep: number;
  selectedCaseId?: string;
  selectedEvidenceIds: string[];
  onSelectCase: (caseId: string) => void;
  onToggleEvidence: (evidenceId: string) => void;
  onStepChange: (step: number) => void;
  onCancel: () => void;
  onTranscriptionStep: () => void;
};

export const reportSteps: ReportFlowStep[] = [
  { id: 0, title: "Select case" },
  { id: 1, title: "Select evidence" },
  { id: 2, title: "Transcribe audio evidence" },
  { id: 3, title: "Verify integrity" },
  { id: 4, title: "Review package" },
  { id: 5, title: "Generate legal report package" },
];

export function ReportFlowPage({
  cases,
  activeStep,
  selectedCaseId,
  selectedEvidenceIds,
  onSelectCase,
  onToggleEvidence,
  onStepChange,
  onCancel,
  onTranscriptionStep,
}: ReportFlowPageProps) {
  const selectedCase = cases.find((caseRecord) => caseRecord.id === selectedCaseId);
  const selectedEvidence: Evidence[] =
    selectedCase?.incidents
      .flatMap((incident) => incident.evidence)
      .filter((item) => selectedEvidenceIds.includes(item.id)) ?? [];

  function handleNext() {
    if (activeStep === 1) {
      onTranscriptionStep();
      return;
    }

    onStepChange(Math.min(activeStep + 1, reportSteps.length - 1));
  }

  return (
    <div className="report-shell">
      <div className="report-top">
        <div>
          <span className="breadcrumb">Reports / New Package</span>
          <h1>New Legal Report Package</h1>
        </div>
        <span className="secure-chip">Secure workspace</span>
      </div>

      <div className="report-workspace">
        <ReportFlowStepper steps={reportSteps} activeStep={activeStep} />
        <main className="report-content">
          {activeStep === 0 ? (
            <SelectCaseStep cases={cases} selectedCaseId={selectedCaseId} onSelectCase={onSelectCase} />
          ) : null}
          {activeStep === 1 ? (
            <SelectEvidenceStep
              selectedCase={selectedCase}
              selectedEvidenceIds={selectedEvidenceIds}
              onToggleEvidence={onToggleEvidence}
            />
          ) : null}
          {activeStep === 3 ? <VerifyIntegrityStep evidence={selectedEvidence} /> : null}
          {activeStep === 4 || activeStep === 5 ? (
            <ReviewPackageStep selectedCase={selectedCase} selectedEvidence={selectedEvidence} />
          ) : null}

          {activeStep === 5 ? (
            <div className="generation-note">
              PDF/package generation is intentionally reserved for the backend implementation.
            </div>
          ) : null}

          <div className="wizard-actions">
            <Button variant="secondary" type="button" onClick={onTranscriptionStep}>
              Transcription Demo
            </Button>
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
            <Button
              variant="secondary"
              type="button"
              disabled={activeStep === 0}
              onClick={() => onStepChange(Math.max(activeStep - 1, 0))}
            >
              Back
            </Button>
            <Button type="button" onClick={handleNext}>
              {activeStep === 5 ? "Reserve Generation" : "Next"}
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
