import type { ReportFlowStep } from "../../types/legalDashboard";

type ReportFlowStepperProps = {
  steps: ReportFlowStep[];
  activeStep: number;
};

export function ReportFlowStepper({ steps, activeStep }: ReportFlowStepperProps) {
  return (
    <aside className="report-stepper" aria-label="Report flow steps">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`stepper-item ${step.id === activeStep ? "active" : ""} ${
            step.id < activeStep ? "complete" : ""
          }`}
        >
          <span>{step.id + 1}</span>
          <strong>{step.title}</strong>
        </div>
      ))}
    </aside>
  );
}
