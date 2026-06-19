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
  const [cases, evidenceTypes] = await Promise.all([
    api.getCases(),
    api.getEvidenceTypes().catch(() => []),
  ]);
  const evidenceTypeLookup = buildEvidenceTypeLookup(evidenceTypes);

  return Promise.all(
    cases.map(async (caseRecord) => {
      const incidents = await api.listIncidents(caseRecord.case_id);
      const mappedIncidents = await Promise.all(
        incidents.map(async (incident) => {
          const evidence = await api.listIncidentEvidence(incident.incident_id);

          return mapIncidentResponse(
            incident,
            evidence.map((item) => mapEvidenceResponse(item, evidenceTypeLookup))
          );
        })
      );

      return mapCaseResponse(caseRecord, mappedIncidents);
    })
  );
}

export async function getCaseById(caseId: string): Promise<LegalCase | undefined> {
  const cases = await getCases();
  return cases.find((legalCase) => legalCase.id === caseId);
}

export async function listIncidents(caseId: string): Promise<Incident[]> {
  const [incidents, evidenceTypes] = await Promise.all([
    api.listIncidents(parseCaseId(caseId)),
    api.getEvidenceTypes().catch(() => []),
  ]);
  const evidenceTypeLookup = buildEvidenceTypeLookup(evidenceTypes);

  return Promise.all(
    incidents.map(async (incident) => {
      const evidence = await api.listIncidentEvidence(incident.incident_id);

      return mapIncidentResponse(
        incident,
        evidence.map((item) => mapEvidenceResponse(item, evidenceTypeLookup))
      );
    })
  );
}
