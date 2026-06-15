import type { LegalCase } from "../types/legalDashboard";
import { CaseStats } from "../components/cases/CaseStats";
import { CasesTable } from "../components/cases/CasesTable";
import { Card } from "../components/ui/Card";

type CasesPageProps = {
  cases: LegalCase[];
  onOpenCase: (caseId: string) => void;
};

export function CasesPage({ cases, onOpenCase }: CasesPageProps) {
  return (
    <div className="stack">
      <CaseStats cases={cases} />
      <Card>
        <CasesTable cases={cases} onOpenCase={onOpenCase} />
        <div className="table-footer">
          <span>Showing 1 to {cases.length} of 128 cases</span>
          <div className="pagination">
            <button type="button">Prev</button>
            <button className="active" type="button">1</button>
            <button type="button">2</button>
            <button type="button">3</button>
            <span>...</span>
            <button type="button">26</button>
            <button type="button">Next</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
