import type { Incident, LegalCase } from "../types/legalDashboard";
import * as api from "./api";

export async function getCases(): Promise<LegalCase[]> {
  return api.getCases();
}

export async function getCaseById(caseId: string): Promise<LegalCase | undefined> {
  const cases = await getCases();
  return cases.find((legalCase) => legalCase.id === caseId);
}

export async function listIncidents(caseId: string): Promise<Incident[]> {
  return api.listIncidents(caseId);
}
