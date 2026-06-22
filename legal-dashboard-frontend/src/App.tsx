import { useEffect, useMemo, useState } from "react";
import { getCases, listIncidents } from "./services/caseService";
import { getCurrentUser, type UserResponse } from "./services/api";
import { LegalDashboardLayout } from "./layout/LegalDashboardLayout";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { CasesPage } from "./pages/CasesPage";
import { ReportFlowPage } from "./pages/ReportFlowPage";
import { TranscriptionStepPage } from "./pages/TranscriptionStepPage";
import type { LegalCase } from "./types/legalDashboard";
import { Card } from "./components/ui/Card";
import type { TranscriptionResult } from "./services/transcriptionService";

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
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [hydratedCaseIds, setHydratedCaseIds] = useState<string[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(undefined);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [transcriptsByEvidenceId, setTranscriptsByEvidenceId] = useState<Record<string, TranscriptionResult>>({});

  useEffect(() => {
    const handlePopState = () => setRoute(getRouteState());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [user, list] = await Promise.all([getCurrentUser(), getCases()]);
        setCurrentUser(user);
        setCases(list);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load dashboard data", err);
      }
    })();
  }, []);

  const activeStep = useMemo(() => parseStep(route.search), [route.search]);
  const caseIdFromPath = route.path.match(/^\/cases\/([^/]+)$/)?.[1];
  const selectedCase = cases.find((caseRecord) => caseRecord.id === caseIdFromPath);

  useEffect(() => {
    if (!caseIdFromPath || !selectedCase || hydratedCaseIds.includes(caseIdFromPath)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const incidents = await listIncidents(caseIdFromPath);

        if (cancelled) {
          return;
        }

        setCases((currentCases) =>
          currentCases.map((caseRecord) => {
            if (caseRecord.id !== caseIdFromPath) {
              return caseRecord;
            }

            const lastIncidentAt = incidents[0]?.dateTime ?? caseRecord.lastIncidentAt;

            return {
              ...caseRecord,
              incidents,
              lastIncidentAt,
              updatedAt: lastIncidentAt,
            };
          })
        );
        setHydratedCaseIds((currentIds) =>
          currentIds.includes(caseIdFromPath) ? currentIds : [...currentIds, caseIdFromPath]
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Failed to load case details for case ${caseIdFromPath}`, err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [caseIdFromPath, hydratedCaseIds, selectedCase?.id]);

  function navigate(path: string) {
    window.history.pushState(null, "", path);
    setRoute(getRouteState());
  }

  function handleSelectCase(caseId: string) {
    setSelectedCaseId(caseId);
    const legalCase = cases.find((caseRecord) => caseRecord.id === caseId);
    setSelectedEvidenceIds(legalCase?.incidents[0]?.evidence.slice(0, 2).map((item) => item.id) ?? []);
    setTranscriptsByEvidenceId({});
  }

  function handleToggleEvidence(evidenceId: string) {
    setSelectedEvidenceIds((current) =>
      current.includes(evidenceId)
        ? current.filter((id) => id !== evidenceId)
        : [...current, evidenceId]
    );
  }

  const title = route.path.startsWith("/reports") ? "Report Requests" : "Cases";

  return (
    <LegalDashboardLayout
      title={title}
      activePath={route.path}
      currentUser={currentUser}
      onNavigate={navigate}
    >
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
          transcriptsByEvidenceId={transcriptsByEvidenceId}
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
          transcriptsByEvidenceId={transcriptsByEvidenceId}
          onTranscriptComplete={(evidenceId, transcript) =>
            setTranscriptsByEvidenceId((current) => ({ ...current, [evidenceId]: transcript }))
          }
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
