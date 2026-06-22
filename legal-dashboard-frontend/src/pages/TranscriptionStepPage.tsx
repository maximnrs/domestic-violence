import type { AudioEvidence, Evidence, LegalCase } from "../types/legalDashboard";
import { ReportFlowStepper } from "../components/reports/ReportFlowStepper";
import { reportSteps } from "./ReportFlowPage";
import { TranscriptionStepPlaceholder } from "../components/reports/TranscriptionStepPlaceholder";
import { Button } from "../components/ui/Button";
import type { TranscriptionResult } from "../services/transcriptionService";

type TranscriptionStepPageProps = {
  cases: LegalCase[];
  selectedCaseId?: string;
  selectedEvidenceIds: string[];
  transcriptsByEvidenceId: Record<string, TranscriptionResult>;
  onTranscriptComplete: (evidenceId: string, transcript: TranscriptionResult) => void;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
};

export function TranscriptionStepPage({
  cases,
  selectedCaseId,
  selectedEvidenceIds,
  transcriptsByEvidenceId,
  onTranscriptComplete,
  onBack,
  onNext,
  onCancel,
}: TranscriptionStepPageProps) {
  const selectedCase = cases.find((caseRecord) => caseRecord.id === selectedCaseId);
  const selectedEvidence: Evidence[] =
    selectedCase?.incidents
      .flatMap((incident) => incident.evidence)
      .filter((item) => selectedEvidenceIds.includes(item.id)) ?? [];
  const audioEvidence = selectedEvidence.filter((item): item is AudioEvidence => item.type === "Audio");

  return (
    <div className="report-shell">
      <div className="report-top">
        <div>
          <span className="breadcrumb">Reports / New Package / Transcription</span>
          <h1>New Legal Report Package</h1>
        </div>
        <span className="secure-chip">Secure workspace</span>
      </div>
      <div className="report-workspace">
        <ReportFlowStepper steps={reportSteps} activeStep={2} />
        <main className="report-content">
          <TranscriptionStepPlaceholder
            audioEvidence={audioEvidence}
            transcripts={transcriptsByEvidenceId}
            onTranscriptComplete={onTranscriptComplete}
          />
          <div className="wizard-actions">
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
            <Button variant="secondary" type="button" onClick={onBack}>Back</Button>
            <Button type="button" onClick={onNext}>Continue to Integrity</Button>
          </div>
        </main>
      </div>
    </div>
  );
}
