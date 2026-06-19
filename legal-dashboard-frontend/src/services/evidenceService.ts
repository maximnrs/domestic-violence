import type { Evidence } from "../types/legalDashboard";
import * as api from "./api";

export async function listIncidentEvidence(incidentId: string): Promise<Evidence[]> {
  return api.listIncidentEvidence(incidentId);
}

export async function listCaseEvidence(caseId: string): Promise<Evidence[]> {
  return api.listCaseEvidence(caseId);
}

export async function verifyEvidence(evidenceId: string): Promise<{ evidenceId: string; verified: boolean }> {
  // Placeholder for controlled verification action. No raw download/export is exposed here.
  return Promise.resolve({ evidenceId, verified: true });
}
