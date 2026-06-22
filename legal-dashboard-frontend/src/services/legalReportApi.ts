import type { Evidence, Incident, LegalCase } from "../types/legalDashboard";
import * as api from "./api";
import {
  buildEvidenceTypeLookup,
  mapEvidenceResponse,
  mapIncidentResponse,
  parseCaseId,
} from "./legalDashboardMappers";

type HydrateReportCaseInput = {
  caseRecord: LegalCase;
  selectedEvidenceIds: string[];
};

type HydrateReportCaseResult = {
  caseRecord: LegalCase;
  selectedEvidence: Evidence[];
  warnings: string[];
};

function uniqueEvidence(evidence: Evidence[]) {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function filterSelectedEvidence(evidence: Evidence[], selectedEvidenceIds: string[]) {
  if (selectedEvidenceIds.length === 0) {
    return evidence;
  }

  return evidence.filter((item) => selectedEvidenceIds.includes(item.id));
}

export async function hydrateReportCaseData({
  caseRecord,
  selectedEvidenceIds,
}: HydrateReportCaseInput): Promise<HydrateReportCaseResult> {
  const warnings: string[] = [];
  const caseId = parseCaseId(caseRecord.id);
  const evidenceTypeLookup = buildEvidenceTypeLookup(await api.getEvidenceTypes().catch(() => []));

  let incidents: Incident[] = caseRecord.incidents;

  try {
    const incidentResponses = await api.listIncidents(caseId);
    incidents = incidentResponses
      .filter((incident) => incident.case_id === caseId)
      .map((incident) => mapIncidentResponse(incident));
  } catch (err) {
    warnings.push(
      `Incident endpoint unavailable; using currently loaded incident data. ${
        err instanceof Error ? err.message : "Unknown error"
      }`
    );
  }

  const hydratedIncidents = await Promise.all(
    incidents.map(async (incident) => {
      try {
        const evidenceResponses = await api.listIncidentEvidence(Number(incident.id));
        return {
          ...incident,
          evidence: evidenceResponses.map((item) => mapEvidenceResponse(item, evidenceTypeLookup)),
        };
      } catch (err) {
        const existingIncident = caseRecord.incidents.find((item) => item.id === incident.id);
        warnings.push(
          `Evidence endpoint unavailable for incident ${incident.id}; using currently loaded evidence. ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        return {
          ...incident,
          evidence: existingIncident?.evidence ?? incident.evidence,
        };
      }
    })
  );

  const allEvidence = uniqueEvidence(hydratedIncidents.flatMap((incident) => incident.evidence));
  const selectedEvidence = filterSelectedEvidence(allEvidence, selectedEvidenceIds);

  return {
    caseRecord: {
      ...caseRecord,
      incidents: hydratedIncidents,
    },
    selectedEvidence,
    warnings,
  };
}
