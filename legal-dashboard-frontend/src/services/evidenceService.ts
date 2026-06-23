import type { Evidence } from "../types/legalDashboard";
import * as api from "./api";
import {
  buildEvidenceTypeLookup,
  mapEvidenceResponse,
  parseCaseId,
  parseIncidentId,
} from "./legalDashboardMappers";

export async function listIncidentEvidence(incidentId: string): Promise<Evidence[]> {
  const [evidence, evidenceTypes] = await Promise.all([
    api.listIncidentEvidence(parseIncidentId(incidentId)),
    api.getEvidenceTypes().catch(() => []),
  ]);
  const evidenceTypeLookup = buildEvidenceTypeLookup(evidenceTypes);

  return evidence.map((item) => mapEvidenceResponse(item, evidenceTypeLookup));
}

export async function listCaseEvidence(caseId: string): Promise<Evidence[]> {
  const [evidence, evidenceTypes] = await Promise.all([
    api.listCaseEvidence(parseCaseId(caseId)),
    api.getEvidenceTypes().catch(() => []),
  ]);
  const evidenceTypeLookup = buildEvidenceTypeLookup(evidenceTypes);

  return evidence.map((item) => mapEvidenceResponse(item, evidenceTypeLookup));
}

export async function verifyEvidence(evidenceId: string): Promise<{ evidenceId: string; verified: boolean }> {
  // Placeholder for controlled verification action. No raw download/export is exposed here.
  return Promise.resolve({ evidenceId, verified: true });
}
