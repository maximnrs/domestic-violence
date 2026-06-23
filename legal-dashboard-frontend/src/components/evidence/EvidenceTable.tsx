import type { Evidence } from "../../types/legalDashboard";
import { Button } from "../ui/Button";
import { StatusPill } from "../ui/StatusPill";

type EvidenceTableProps = {
  evidence: Evidence[];
  selectedEvidenceIds?: string[];
  onToggleSelect?: (evidenceId: string) => void;
};

export function EvidenceTable({ evidence, selectedEvidenceIds = [], onToggleSelect }: EvidenceTableProps) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Evidence ID</th>
            <th>Type</th>
            <th>Captured</th>
            <th>Size</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((item) => {
            const isSelected = selectedEvidenceIds.includes(item.id);

            return (
              <tr key={item.id}>
                <td className="mono">{item.id}</td>
                <td>{item.type}</td>
                <td>{item.capturedAt}</td>
                <td>{item.size}</td>
                <td>
                  <StatusPill status={item.status} />
                </td>
                <td className="table-actions">
                  <Button variant="quiet" type="button">View</Button>
                  <Button variant="quiet" type="button">Verify</Button>
                  <Button
                    variant={isSelected ? "secondary" : "quiet"}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleSelect?.(item.id);
                    }}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
