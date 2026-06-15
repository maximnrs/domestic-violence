import { Card } from "../ui/Card";
import type { LegalCase } from "../../types/legalDashboard";

type CaseStatsProps = {
  cases: LegalCase[];
};

export function CaseStats({ cases }: CaseStatsProps) {
  const openCases = cases.filter((caseRecord) => caseRecord.status === "open").length;
  const closedCases = cases.filter((caseRecord) => caseRecord.status === "closed").length;
  const reportsGenerated = cases.reduce((total, caseRecord) => total + caseRecord.reportsGenerated, 0);

  const stats = [
    { label: "Total Cases", value: cases.length, marker: "folder" },
    { label: "Open Cases", value: openCases, marker: "calendar" },
    { label: "Closed Cases", value: closedCases, marker: "check" },
    { label: "Reports Generated", value: reportsGenerated, marker: "report" },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <Card key={stat.label} className="stat-card">
          <span className={`stat-icon stat-${stat.marker}`} aria-hidden="true" />
          <div>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
