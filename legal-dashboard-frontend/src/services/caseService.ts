import { mockCases } from "../data/mockData";
import type { Incident, LegalCase } from "../types/legalDashboard";

export async function getCases(): Promise<LegalCase[]> {
  // Mirrors the mobile app endpoint shape: GET /cases/.
  // Replace the mock return with apiRequest<LegalCase[]>("/cases/") when legal case DTOs are ready.
  return Promise.resolve(mockCases);
}

export async function getCaseById(caseId: string): Promise<LegalCase | undefined> {
  const cases = await getCases();
  return cases.find((legalCase) => legalCase.id === caseId);
}

export async function listIncidents(caseId: string): Promise<Incident[]> {
  // Mirrors the mobile app endpoint shape: GET /incidents/?case_id={caseId}.
  const legalCase = await getCaseById(caseId);
  return legalCase?.incidents ?? [];
}
