import { Card } from "../ui/Card";
import type { LegalCase } from "../../types/legalDashboard";
import { Icon } from "../ui/Icon";

type CaseStatsProps = {
  cases: LegalCase[];
};

export function CaseStats({ cases }: CaseStatsProps) {
  const openCases = cases.filter((caseRecord) => caseRecord.status === "open").length;
  const closedCases = cases.filter((caseRecord) => caseRecord.status === "closed").length;
  const reportsGenerated = cases.reduce((total, caseRecord) => total + caseRecord.reportsGenerated, 0);

  const stats = [
    { label: "Total Cases", value: cases.length, icon: "folder" },
    { label: "Open Cases", value: openCases, icon: "calendar" },
    { label: "Closed Cases", value: closedCases, icon: "checkCircle" },
    { label: "Reports Generated", value: reportsGenerated, icon: "fileText" },
  ] as const;

  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <Card key={stat.label} className="stat-card">
          <span className="stat-icon">
            <Icon name={stat.icon} size={23} />
          </span>
          <div>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
