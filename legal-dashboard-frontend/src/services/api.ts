import { apiRequest } from "./legalApiClient";
import type { LegalCase, Incident, Evidence, AudioEvidence, TranscriptionStatus } from "../types/legalDashboard";

type CaseResponse = {
  case_id: number | string;
  user_id?: number;
  case_title?: string;
  description?: string | null;
  creation_date?: string;
  status?: string | null;
};

type IncidentResponse = {
  incident_id: number | string;
  case_id: number | string;
  incident_date?: string | null;
  incident_time?: string | null;
  location?: string | null;
  incident_type?: string | null;
  description?: string | null;
  creation_date?: string;
};

type EvidenceResponse = {
  evidence_id: number | string;
  incident_id: number | string;
  user_id?: number;
  evidence_type_id?: number | string;
  file_name?: string;
  evidence_location?: string | null;
  file_path?: string;
  file_hash?: string;
  created_at?: string;
  description?: string | null;
};

type EvidenceTypeResponse = {
  evidence_type_id: number | string;
  type_name: string;
  description?: string | null;
};

let evidenceTypeMap: Record<string, string> | null = null;

async function ensureEvidenceTypes() {
  if (evidenceTypeMap) return evidenceTypeMap;
  try {
    const types = await apiRequest<EvidenceTypeResponse[]>("/evidence/types/");
    evidenceTypeMap = {};
    types.forEach((t) => (evidenceTypeMap![String(t.evidence_type_id)] = t.type_name));
  } catch {
    evidenceTypeMap = {};
  }

  return evidenceTypeMap;
}

function mapCaseResponseToLegalCase(resp: CaseResponse): LegalCase {
  const id = String(resp.case_id);
  return {
    id,
    survivorAlias: resp.case_title ?? `Case ${id}`,
    status: (resp.status as LegalCase["status"]) ?? "open",
    createdAt: resp.creation_date ?? "",
    lastIncidentAt: "",
    updatedAt: resp.creation_date ?? "",
    reportsGenerated: 0,
    incidents: [],
  };
}

async function mapIncidentResponseToIncident(resp: IncidentResponse): Promise<Incident> {
  const id = String(resp.incident_id);
  const caseId = String(resp.case_id);
  const dateTime = resp.incident_date
    ? `${resp.incident_date}${resp.incident_time ? ", " + resp.incident_time : ""}`
    : resp.creation_date ?? "";

  const incident: Incident = {
    id,
    caseId,
    dateTime,
    type: resp.incident_type ?? "Unknown",
    status: "new",
    evidence: await listIncidentEvidence(id),
  };

  return incident;
}

async function mapEvidenceResponseToEvidence(resp: EvidenceResponse): Promise<Evidence> {
  await ensureEvidenceTypes();
  const id = String(resp.evidence_id);
  const incidentId = String(resp.incident_id);
  const typeName = evidenceTypeMap ? evidenceTypeMap[String(resp.evidence_type_id)] ?? "Metadata" : "Metadata";

  const base = {
    id,
    incidentId,
    type: (typeName as any),
    filename: resp.file_name ?? "",
    capturedAt: resp.created_at ?? "",
    size: "-",
    status: "new",
    source: "Nura Mobile App" as const,
    hashVerified: true,
    timestampVerified: true,
    auditTrailAvailable: true,
  };

  if (typeName.toLowerCase().includes("audio")) {
    const audio: AudioEvidence = {
      ...base,
      type: "Audio",
      duration: "",
      transcriptionStatus: "not_requested" as TranscriptionStatus,
    };
    return audio;
  }

  return base as Evidence;
}

export async function getCurrentUser() {
  return apiRequest<Record<string, unknown>>("/auth/me");
}

export async function getCases(): Promise<LegalCase[]> {
  const resp = await apiRequest<CaseResponse[]>("/cases/");
  const cases = resp.map(mapCaseResponseToLegalCase);

  // Load incidents for each case in parallel and attach them.
  await Promise.all(
    cases.map(async (c) => {
      const incidents = await listIncidents(c.id);
      c.incidents = incidents;
      if (incidents.length > 0) {
        c.lastIncidentAt = incidents[0].dateTime;
      }
    })
  );

  return cases;
}

export async function listIncidents(caseId: string): Promise<Incident[]> {
  const resp = await apiRequest<IncidentResponse[]>(`/incidents/?case_id=${caseId}`);
  const mapped = await Promise.all(resp.map(mapIncidentResponseToIncident));
  return mapped;
}

export async function listIncidentEvidence(incidentId: string): Promise<Evidence[]> {
  const resp = await apiRequest<EvidenceResponse[]>(`/evidence/?incident_id=${incidentId}`);
  const mapped = await Promise.all(resp.map(mapEvidenceResponseToEvidence));
  return mapped;
}

export async function listCaseEvidence(caseId: string): Promise<Evidence[]> {
  const incidents = await listIncidents(caseId);
  return incidents.flatMap((i) => i.evidence);
}

export async function getEvidenceTypes() {
  return apiRequest<EvidenceTypeResponse[]>("/evidence/types/");
}
