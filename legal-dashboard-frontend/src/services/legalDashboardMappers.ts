import type {
  BaseEvidence,
  CaseStatus,
  Evidence,
  EvidenceStatus,
  EvidenceType,
  Incident,
  IncidentStatus,
  LegalCase,
} from "../types/legalDashboard";
import type {
  CaseResponse,
  EvidenceResponse,
  EvidenceTypeResponse,
  IncidentResponse,
  IncidentType,
} from "./api";

type EvidenceTypeLookup = Record<number, EvidenceTypeResponse | undefined>;

const incidentTypeLabels: Record<IncidentType, string> = {
  verbal: "Verbal Abuse",
  physical: "Physical Abuse",
  psychological: "Psychological Abuse",
  financial: "Financial Abuse",
  sexual: "Sexual Abuse",
  stalking: "Stalking",
  other: "Other",
};

function parseNumericId(id: string, label: string) {
  const numericId = Number(id);

  if (Number.isInteger(numericId) && numericId > 0) {
    return numericId;
  }

  const trailingDigits = id.match(/\d+$/)?.[0];

  if (trailingDigits) {
    return Number(trailingDigits);
  }

  throw new Error(`Invalid ${label} ID: ${id}`);
}

export function parseCaseId(caseId: string) {
  return parseNumericId(caseId, "case");
}

export function parseIncidentId(incidentId: string) {
  return parseNumericId(incidentId, "incident");
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) {
    return "Unknown";
  }

  const parsed = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(dateValue?: string | null, timeValue?: string | null) {
  if (!dateValue) {
    return "Unknown";
  }

  const formattedDate = formatDate(dateValue);

  if (!timeValue) {
    return formattedDate;
  }

  return `${formattedDate}, ${timeValue.slice(0, 5)}`;
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
  const formattedTime = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);

  return `${formattedDate}, ${formattedTime}`;
}

function mapCaseStatus(status: string | null): CaseStatus {
  if (status === "closed" || status === "in_review") {
    return status;
  }

  return "open";
}

function mapIncidentStatus(incident: IncidentResponse): IncidentStatus {
  return incident.description ? "reviewed" : "new";
}

function mapEvidenceStatus(evidence: EvidenceResponse): EvidenceStatus {
  return evidence.file_hash ? "verified" : "new";
}

function mapEvidenceType(evidence: EvidenceResponse, evidenceTypes: EvidenceTypeLookup): EvidenceType {
  const typeName = evidenceTypes[evidence.evidence_type_id]?.type_name.toLowerCase() ?? "";

  if (typeName.includes("audio") || typeName.includes("voice")) {
    return "Audio";
  }

  if (typeName.includes("photo") || typeName.includes("image")) {
    return "Photo";
  }

  if (typeName.includes("video")) {
    return "Video";
  }

  if (typeName.includes("note") || typeName.includes("text") || typeName.includes("written")) {
    return "Note";
  }

  return "Metadata";
}

export function buildEvidenceTypeLookup(evidenceTypes: EvidenceTypeResponse[]) {
  return evidenceTypes.reduce<EvidenceTypeLookup>((lookup, evidenceType) => {
    lookup[evidenceType.evidence_type_id] = evidenceType;
    return lookup;
  }, {});
}

export function mapEvidenceResponse(
  evidence: EvidenceResponse,
  evidenceTypes: EvidenceTypeLookup = {}
): Evidence {
  const type = mapEvidenceType(evidence, evidenceTypes);
  const base = {
    id: String(evidence.evidence_id),
    incidentId: String(evidence.incident_id),
    type,
    filename: evidence.file_name,
    capturedAt: formatTimestamp(evidence.created_at),
    size: "-",
    status: mapEvidenceStatus(evidence),
    source: type === "Metadata" ? "System Metadata" : "Nura Mobile App",
    hashVerified: Boolean(evidence.file_hash),
    timestampVerified: Boolean(evidence.created_at),
    auditTrailAvailable: Boolean(evidence.file_hash),
  } satisfies BaseEvidence;

  if (type === "Audio") {
    return {
      ...base,
      type: "Audio",
      duration: "Unknown",
      transcriptionStatus: "not_requested",
    };
  }

  return { ...base, type };
}

export function mapIncidentResponse(
  incident: IncidentResponse,
  evidence: Evidence[] = []
): Incident {
  return {
    id: String(incident.incident_id),
    caseId: String(incident.case_id),
    dateTime: formatDateTime(incident.incident_date, incident.incident_time),
    type: incident.incident_type ? incidentTypeLabels[incident.incident_type] : "Unspecified",
    location: incident.location ?? undefined,
    description: incident.description ?? undefined,
    status: mapIncidentStatus(incident),
    evidence,
  };
}

export function mapCaseResponse(caseRecord: CaseResponse, incidents: Incident[] = []): LegalCase {
  const lastIncidentAt = incidents[0]?.dateTime ?? formatDate(caseRecord.creation_date);

  return {
    id: String(caseRecord.case_id),
    survivorAlias: caseRecord.case_title || `Case #${caseRecord.case_id}`,
    status: mapCaseStatus(caseRecord.status),
    createdAt: formatDate(caseRecord.creation_date),
    lastIncidentAt,
    updatedAt: lastIncidentAt,
    reportsGenerated: 0,
    incidents,
  };
}
