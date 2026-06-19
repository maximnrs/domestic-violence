import { useCallback, useMemo, useState } from 'react';

import {
  createIncident,
  getCases,
  getEvidenceTypes,
  listIncidents,
  type CaseResponse,
  type EvidenceTypeResponse,
  type IncidentResponse,
  type IncidentType,
} from '@/services/api';
import { normalizeOptional, normalizeTime, todayIsoDate } from '@/utils/incidents';

export function useEvidenceCaptureContext() {
  const [caseInfo, setCaseInfo] = useState<CaseResponse | null>(null);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<EvidenceTypeResponse[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [isIncidentLoading, setIsIncidentLoading] = useState(false);
  const [isCreatingIncident, setIsCreatingIncident] = useState(false);
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [newIncidentDate, setNewIncidentDate] = useState(todayIsoDate);
  const [newIncidentTime, setNewIncidentTime] = useState('');
  const [newIncidentLocation, setNewIncidentLocation] = useState('');
  const [newIncidentDescription, setNewIncidentDescription] = useState('');
  const [newIncidentType, setNewIncidentType] = useState<IncidentType>('other');

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.incident_id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );

  const loadContext = useCallback(async () => {
    setIsContextLoading(true);
    setContextError(null);
    setIncidentError(null);
    setTypeError(null);
    setCaseInfo(null);
    setIncidents([]);
    setSelectedIncidentId(null);

    const [caseResult, typeResult] = await Promise.allSettled([getCases(), getEvidenceTypes()]);

    if (typeResult.status === 'fulfilled') {
      setEvidenceTypes(typeResult.value);
    } else {
      setEvidenceTypes([]);
      setTypeError(
        typeResult.reason instanceof Error
          ? typeResult.reason.message
          : 'Unable to load evidence types.'
      );
    }

    if (caseResult.status === 'rejected') {
      setContextError(
        caseResult.reason instanceof Error ? caseResult.reason.message : 'Unable to load your case.'
      );
      setIsContextLoading(false);
      return;
    }

    const currentCase = caseResult.value[0];

    if (!currentCase) {
      setContextError('No case is available for this account.');
      setIsContextLoading(false);
      return;
    }

    setCaseInfo(currentCase);
    setIsContextLoading(false);
    setIsIncidentLoading(true);

    try {
      const nextIncidents = await listIncidents(currentCase.case_id);
      setIncidents(nextIncidents);
      setSelectedIncidentId(nextIncidents[0]?.incident_id ?? null);
      setShowCreateIncident(nextIncidents.length === 0);
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Unable to load incidents.');
    } finally {
      setIsIncidentLoading(false);
    }
  }, []);

  async function refreshEvidenceTypes() {
    const nextTypes = await getEvidenceTypes();
    setEvidenceTypes(nextTypes);
    setTypeError(null);
    return nextTypes;
  }

  async function resolveEvidenceTypeId(typeName: string, label: string) {
    const types = evidenceTypes.length > 0 ? evidenceTypes : await refreshEvidenceTypes();
    const evidenceType = types.find((type) => type.type_name === typeName);

    if (!evidenceType) {
      throw new Error(`${label} evidence configuration is missing on the server.`);
    }

    return evidenceType.evidence_type_id;
  }

  function selectIncident(incidentId: number) {
    setSelectedIncidentId(incidentId);
    setShowCreateIncident(false);
  }

  function toggleCreateIncident() {
    setShowCreateIncident((current) => !current);
    setIncidentError(null);
  }

  async function handleCreateIncident() {
    if (!caseInfo) {
      setIncidentError('Your case must load before an incident can be created.');
      return null;
    }

    setIncidentError(null);

    if (newIncidentDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(newIncidentDate.trim())) {
      setIncidentError('Use YYYY-MM-DD for incident date.');
      return null;
    }

    try {
      setIsCreatingIncident(true);
      const createdIncident = await createIncident({
        case_id: caseInfo.case_id,
        incident_date: normalizeOptional(newIncidentDate),
        incident_time: normalizeTime(newIncidentTime),
        location: normalizeOptional(newIncidentLocation),
        incident_type: newIncidentType,
        description: normalizeOptional(newIncidentDescription),
      });

      setIncidents((current) => [createdIncident, ...current]);
      setSelectedIncidentId(createdIncident.incident_id);
      setShowCreateIncident(false);
      setNewIncidentDate(todayIsoDate());
      setNewIncidentTime('');
      setNewIncidentLocation('');
      setNewIncidentDescription('');
      setNewIncidentType('other');
      return createdIncident;
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Unable to create incident.');
      return null;
    } finally {
      setIsCreatingIncident(false);
    }
  }

  return {
    caseInfo,
    contextError,
    evidenceTypes,
    handleCreateIncident,
    incidentError,
    incidents,
    isContextLoading,
    isCreatingIncident,
    isIncidentLoading,
    loadContext,
    newIncidentDate,
    newIncidentDescription,
    newIncidentLocation,
    newIncidentTime,
    newIncidentType,
    refreshEvidenceTypes,
    resolveEvidenceTypeId,
    selectedIncident,
    selectedIncidentId,
    selectIncident,
    setIncidentError,
    setNewIncidentDate,
    setNewIncidentDescription,
    setNewIncidentLocation,
    setNewIncidentTime,
    setNewIncidentType,
    setTypeError,
    showCreateIncident,
    toggleCreateIncident,
    typeError,
  };
}
