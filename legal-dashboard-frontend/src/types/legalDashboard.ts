export type CaseStatus = "open" | "in_review" | "closed";

export type IncidentStatus = "new" | "reviewed" | "archived";

export type EvidenceType = "Audio" | "Photo" | "Video" | "Note" | "Metadata";

export type EvidenceStatus = "new" | "verified" | "reviewed" | "restricted";

export type TranscriptionStatus =
  | "not_requested"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type LegalCase = {
  id: string;
  survivorAlias: string;
  status: CaseStatus;
  createdAt: string;
  lastIncidentAt: string;
  updatedAt: string;
  reportsGenerated: number;
  incidents: Incident[];
};

export type Incident = {
  id: string;
  caseId: string;
  dateTime: string;
  type: string;
  status: IncidentStatus;
  evidence: Evidence[];
};

export type BaseEvidence = {
  id: string;
  incidentId: string;
  type: EvidenceType;
  filename: string;
  capturedAt: string;
  size: string;
  status: EvidenceStatus;
  source: "Nura Mobile App" | "Officer Upload" | "System Metadata";
  hashVerified: boolean;
  timestampVerified: boolean;
  auditTrailAvailable: boolean;
};

export type AudioEvidence = BaseEvidence & {
  type: "Audio";
  duration: string;
  transcriptionStatus: TranscriptionStatus;
};

export type Evidence =
  | AudioEvidence
  | (BaseEvidence & { type: "Photo" | "Video" | "Note" | "Metadata" });

export type ReportDraft = {
  id: string;
  selectedCaseId?: string;
  selectedEvidenceIds: string[];
  createdAt: string;
  status: "draft" | "ready_for_generation" | "generated";
};

export type ReportFlowStep = {
  id: number;
  title: string;
};
