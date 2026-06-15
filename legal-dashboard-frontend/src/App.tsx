import { useEffect, useMemo, useState } from "react";
import { mockCases, mockReportDraft } from "./data/mockData";
import { LegalDashboardLayout } from "./layout/LegalDashboardLayout";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { CasesPage } from "./pages/CasesPage";
import { ReportFlowPage } from "./pages/ReportFlowPage";
import { TranscriptionStepPage } from "./pages/TranscriptionStepPage";
import type { LegalCase } from "./types/legalDashboard";
import { Card } from "./components/ui/Card";

type RouteState = {
  path: string;
  search: string;
};

function getRouteState(): RouteState {
  return {
    path: window.location.pathname === "/" ? "/cases" : window.location.pathname,
    search: window.location.search,
  };
}

function parseStep(search: string) {
  const step = Number(new URLSearchParams(search).get("step") ?? "0");
  return Number.isFinite(step) ? step : 0;
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(getRouteState);
  const [cases] = useState<LegalCase[]>(mockCases);
  const [selectedCaseId, setSelectedCaseId] = useState(mockReportDraft.selectedCaseId);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>(
    mockReportDraft.selectedEvidenceIds
  );

  useEffect(() => {
    const handlePopState = () => setRoute(getRouteState());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activeStep = useMemo(() => parseStep(route.search), [route.search]);

  function navigate(path: string) {
    window.history.pushState(null, "", path);
    setRoute(getRouteState());
  }

  function handleSelectCase(caseId: string) {
    setSelectedCaseId(caseId);
    const legalCase = cases.find((caseRecord) => caseRecord.id === caseId);
    setSelectedEvidenceIds(legalCase?.incidents[0]?.evidence.slice(0, 2).map((item) => item.id) ?? []);
  }

  function handleToggleEvidence(evidenceId: string) {
    setSelectedEvidenceIds((current) =>
      current.includes(evidenceId)
        ? current.filter((id) => id !== evidenceId)
        : [...current, evidenceId]
    );
  }

  const caseIdFromPath = route.path.match(/^\/cases\/([^/]+)$/)?.[1];
  const selectedCase = cases.find((caseRecord) => caseRecord.id === caseIdFromPath);
  const title = route.path.startsWith("/reports") ? "Report Requests" : "Cases";

  return (
    <LegalDashboardLayout title={title} activePath={route.path} onNavigate={navigate}>
      {route.path === "/cases" ? (
        <CasesPage cases={cases} onOpenCase={(caseId) => navigate(`/cases/${caseId}`)} />
      ) : null}

      {caseIdFromPath ? (
        <CaseDetailPage
          legalCase={selectedCase}
          onStartReport={() => {
            if (selectedCase?.id) {
              handleSelectCase(selectedCase.id);
            }
            navigate("/reports/new");
          }}
        />
      ) : null}

      {route.path === "/reports/new" ? (
        <ReportFlowPage
          cases={cases}
          activeStep={activeStep}
          selectedCaseId={selectedCaseId}
          selectedEvidenceIds={selectedEvidenceIds}
          onSelectCase={handleSelectCase}
          onToggleEvidence={handleToggleEvidence}
          onStepChange={(step) => navigate(`/reports/new?step=${step}`)}
          onCancel={() => navigate("/cases")}
          onTranscriptionStep={() => navigate("/reports/new/transcription")}
        />
      ) : null}

      {route.path === "/reports/new/transcription" ? (
        <TranscriptionStepPage
          cases={cases}
          selectedCaseId={selectedCaseId}
          selectedEvidenceIds={selectedEvidenceIds}
          onBack={() => navigate("/reports/new?step=1")}
          onNext={() => navigate("/reports/new?step=3")}
          onCancel={() => navigate("/cases")}
        />
      ) : null}

      {["/reports", "/users", "/settings"].includes(route.path) ? (
        <Card className="empty-state">This dashboard area is reserved for future legal workflows.</Card>
      ) : null}
    </LegalDashboardLayout>
  );
}
