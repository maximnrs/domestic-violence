import { mockCases } from "../data/mockData";
import type { Evidence } from "../types/legalDashboard";

export async function listIncidentEvidence(incidentId: string): Promise<Evidence[]> {
  // Mirrors the mobile app endpoint shape: GET /evidence/?incident_id={incidentId}.
  const incident = mockCases
    .flatMap((legalCase) => legalCase.incidents)
    .find((caseIncident) => caseIncident.id === incidentId);

  return Promise.resolve(incident?.evidence ?? []);
}

export async function listCaseEvidence(caseId: string): Promise<Evidence[]> {
  const legalCase = mockCases.find((caseRecord) => caseRecord.id === caseId);
  return Promise.resolve(legalCase?.incidents.flatMap((incident) => incident.evidence) ?? []);
}

export async function verifyEvidence(evidenceId: string): Promise<{ evidenceId: string; verified: boolean }> {
  // Placeholder for controlled verification action. No raw download/export is exposed here.
  return Promise.resolve({ evidenceId, verified: true });
}
