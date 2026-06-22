import type { Incident, LegalCase } from "../types/legalDashboard";
import * as api from "./api";
import {
  buildEvidenceTypeLookup,
  mapCaseResponse,
  mapEvidenceResponse,
  mapIncidentResponse,
  parseCaseId,
} from "./legalDashboardMappers";

export async function getCases(): Promise<LegalCase[]> {
  const cases = await api.getCases();

  return cases.map((caseRecord) => mapCaseResponse(caseRecord));
}

export async function getCaseById(caseId: string): Promise<LegalCase | undefined> {
  const cases = await getCases();
  return cases.find((legalCase) => legalCase.id === caseId);
}

export async function listIncidents(caseId: string): Promise<Incident[]> {
  const numericCaseId = parseCaseId(caseId);
  const [incidents, allEvidence, evidenceTypes] = await Promise.all([
    api.getAllIncidents(),
    api.getAllEvidence(),
    api.getEvidenceTypes().catch(() => []),
  ]);
  const evidenceTypeLookup = buildEvidenceTypeLookup(evidenceTypes);
  const incidentResponses = incidents.filter((incident) => incident.case_id === numericCaseId);

  return incidentResponses.map((incident) =>
    mapIncidentResponse(
      incident,
      allEvidence
        .filter((item) => item.incident_id === incident.incident_id)
        .map((item) => mapEvidenceResponse(item, evidenceTypeLookup))
    )
  );
}
