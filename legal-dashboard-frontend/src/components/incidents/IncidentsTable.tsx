import type { Incident } from "../../types/legalDashboard";
import { StatusPill } from "../ui/StatusPill";

type IncidentsTableProps = {
  incidents: Incident[];
  selectedIncidentId?: string;
  onSelectIncident: (incidentId: string) => void;
};

export function IncidentsTable({ incidents, selectedIncidentId, onSelectIncident }: IncidentsTableProps) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Incident ID</th>
            <th>Date & Time</th>
            <th>Type</th>
            <th>Evidence</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              className={selectedIncidentId === incident.id ? "selected-row" : ""}
              onClick={() => onSelectIncident(incident.id)}
            >
              <td className="mono">{incident.id}</td>
              <td>{incident.dateTime}</td>
              <td>{incident.type}</td>
              <td>{incident.evidence.length}</td>
              <td>
                <StatusPill status={incident.status} />
              </td>
              <td className="row-action">{">"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
