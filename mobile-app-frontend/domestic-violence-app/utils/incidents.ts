import type { IncidentResponse, IncidentType } from '@/services/api';

export const incidentTypes: IncidentType[] = [
  'other',
  'verbal',
  'physical',
  'psychological',
  'financial',
  'sexual',
  'stalking',
];

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function formatIncidentType(type: IncidentResponse['incident_type']) {
  if (!type) {
    return 'Incident';
  }

  return `${type.charAt(0).toUpperCase()}${type.slice(1)} incident`;
}

export function formatIncidentMeta(incident: IncidentResponse) {
  const date = incident.incident_date ?? incident.creation_date;
  const time = incident.incident_time ? ` - ${incident.incident_time.slice(0, 5)}` : '';
  return `${date}${time}`;
}

export function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeTime(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error('Use HH:mm for incident time.');
}
