import type { LegalCase } from "../../types/legalDashboard";
import { Icon } from "../ui/Icon";
import { StatusPill } from "../ui/StatusPill";

type CasesTableProps = {
  cases: LegalCase[];
  onOpenCase: (caseId: string) => void;
};

export function CasesTable({ cases, onOpenCase }: CasesTableProps) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Survivor Alias</th>
            <th>Status</th>
            <th>Last Incident</th>
            <th>Updated</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {cases.map((caseRecord) => (
            <tr key={caseRecord.id} onClick={() => onOpenCase(caseRecord.id)}>
              <td className="mono">{caseRecord.id}</td>
              <td>{caseRecord.survivorAlias}</td>
              <td>
                <StatusPill status={caseRecord.status} />
              </td>
              <td>{caseRecord.lastIncidentAt}</td>
              <td>{caseRecord.updatedAt}</td>
              <td className="row-action">
                <Icon name="chevronRight" size={18} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
