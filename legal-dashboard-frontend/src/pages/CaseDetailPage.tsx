import { useEffect, useMemo, useState } from "react";
import { CaseSummaryCard } from "../components/cases/CaseSummaryCard";
import { EvidenceSecurityNotice } from "../components/evidence/EvidenceSecurityNotice";
import { EvidenceTable } from "../components/evidence/EvidenceTable";
import { IncidentsTable } from "../components/incidents/IncidentsTable";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { LegalCase } from "../types/legalDashboard";

type CaseDetailPageProps = {
  legalCase?: LegalCase;
  onStartReport: () => void;
};

const tabs = ["Overview", "Incidents", "Evidence", "Case Notes"] as const;

export function CaseDetailPage({ legalCase, onStartReport }: CaseDetailPageProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>(
    legalCase?.incidents[0]?.id
  );

  useEffect(() => {
    if (!legalCase?.incidents.length) {
      setSelectedIncidentId(undefined);
      return;
    }

    setSelectedIncidentId((currentId) =>
      legalCase.incidents.some((incident) => incident.id === currentId)
        ? currentId
        : legalCase.incidents[0].id
    );
  }, [legalCase]);

  const selectedIncident = useMemo(
    () => legalCase?.incidents.find((incident) => incident.id === selectedIncidentId),
    [legalCase, selectedIncidentId]
  );

  const allEvidence = legalCase?.incidents.flatMap((incident) => incident.evidence) ?? [];

  if (!legalCase) {
    return <Card className="empty-state">Case not found.</Card>;
  }

  return (
    <div className="stack">
      <div className="breadcrumb">Cases / {legalCase.id}</div>
      <div className="detail-heading">
        <CaseSummaryCard legalCase={legalCase} />
        <Button type="button" onClick={onStartReport}>Start Report Flow</Button>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === "Incidents" ? ` (${legalCase.incidents.length})` : ""}
            {tab === "Evidence" ? ` (${allEvidence.length})` : ""}
          </button>
        ))}
      </div>

      {activeTab === "Overview" || activeTab === "Incidents" ? (
        <Card>
          <div className="section-title">
            <h2>Incidents</h2>
          </div>
          <IncidentsTable
            incidents={legalCase.incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={setSelectedIncidentId}
          />
        </Card>
      ) : null}

      {activeTab === "Overview" || activeTab === "Evidence" ? (
        <Card>
          <div className="section-title">
            <div>
              <span className="breadcrumb">Incident evidence</span>
              <h2>{selectedIncident?.id ?? "All evidence"}</h2>
            </div>
            {selectedIncident ? <span>{selectedIncident.dateTime}</span> : null}
          </div>
          <EvidenceTable evidence={activeTab === "Evidence" ? allEvidence : selectedIncident?.evidence ?? []} />
          <EvidenceSecurityNotice />
        </Card>
      ) : null}

      {activeTab === "Case Notes" ? (
        <Card className="empty-state">
          Case notes are reserved for controlled officer annotations.
        </Card>
      ) : null}
    </div>
  );
}
