import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = LoginRequest & {
  first_name: string;
  last_name: string;
  phone_number?: string | null;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type UserResponse = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  account_status: boolean;
  created_at: string;
};

export type CaseResponse = {
  case_id: number;
  user_id: number;
  case_title: string;
  description: string | null;
  creation_date: string;
  status: string | null;
};

export type IncidentType =
  | 'verbal'
  | 'physical'
  | 'psychological'
  | 'financial'
  | 'sexual'
  | 'stalking'
  | 'other';

export type IncidentResponse = {
  incident_id: number;
  case_id: number;
  incident_date: string | null;
  incident_time: string | null;
  location: string | null;
  incident_type: IncidentType | null;
  description: string | null;
  creation_date: string;
};

export type IncidentCreateRequest = {
  case_id: number;
  incident_date?: string | null;
  incident_time?: string | null;
  location?: string | null;
  incident_type?: IncidentType | null;
  description?: string | null;
};

export type EvidenceResponse = {
  evidence_id: number;
  incident_id: number;
  user_id: number;
  evidence_type_id: number;
  file_name: string;
  evidence_location: string | null;
  evidence_imei: string | null;
  evidence_device: string | null;
  evidence_activation: string | null;
  file_path: string;
  file_hash: string;
  timestamp_token: string | null;
  timestamp_authority: string | null;
  timestamp_status: string | null;
  timestamp_hash_algorithm: string | null;
  timestamp_message_imprint: string | null;
  timestamp_nonce: string | null;
  timestamp_time: string | null;
  created_at: string;
  description: string | null;
};

export type EvidenceTypeResponse = {
  evidence_type_id: number;
  type_name: string;
  description: string | null;
};

export type EvidenceDownloadResponse = {
  status: 'success';
  message: string;
  data: string;
};

export type UploadEvidenceRequest = {
  incident_id: number;
  evidence_type_id: number;
  file: {
    blob?: Blob;
    uri?: string;
    name: string;
    type: string;
  };
  description?: string | null;
  evidence_location?: string | null;
  evidence_imei?: string | null;
  evidence_device?: string | null;
  evidence_activation?: string | null;
};

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
  config: { jsonContentType?: boolean } = { jsonContentType: true }
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(config.jsonContentType ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  const bodyText = await response.text();
  const data = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : 'Something went wrong. Please try again.';

    throw new Error(message);
  }

  return data as TResponse;
}

export async function login(payload: LoginRequest) {
  const tokenResponse = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  setAuthToken(tokenResponse.access_token);
  return tokenResponse;
}

export function register(payload: RegisterRequest) {
  return apiRequest<UserResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return apiRequest<UserResponse>('/auth/me');
}

export function getCases() {
  return apiRequest<CaseResponse[]>('/cases/');
}

export function listIncidents(caseId: number) {
  console.log("Loading incidents for case", caseId);
 
  return apiRequest<IncidentResponse[]>(
    `/incidents/?case_id=${caseId}`
  );
}

export function getIncident(incidentId: number) {
  return apiRequest<IncidentResponse>(`/incidents/${incidentId}`);

}

export function createIncident(payload: IncidentCreateRequest) {
  return apiRequest<IncidentResponse>('/incidents/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getEvidenceTypes() {
  return apiRequest<EvidenceTypeResponse[]>('/evidence/types/');
}

export function listIncidentEvidence(incidentId: number) {
  return apiRequest<EvidenceResponse[]>(`/evidence/?incident_id=${incidentId}`);
}

function appendOptionalFormValue(formData: FormData, key: string, value?: string | null) {
  if (value) {
    formData.append(key, value);
  }
}

export function uploadEvidence(payload: UploadEvidenceRequest) {
  const formData = new FormData();

  formData.append('incident_id', String(payload.incident_id));
  formData.append('evidence_type_id', String(payload.evidence_type_id));

  if (payload.file.blob) {
    formData.append('file', payload.file.blob, payload.file.name);
  } else if (payload.file.uri) {
    formData.append('file', {
      uri: payload.file.uri,
      name: payload.file.name,
      type: payload.file.type,
    } as unknown as Blob);
  } else {
    throw new Error('Evidence file is missing.');
  }

  appendOptionalFormValue(formData, 'description', payload.description);
  appendOptionalFormValue(formData, 'evidence_location', payload.evidence_location);
  appendOptionalFormValue(formData, 'evidence_imei', payload.evidence_imei);
  appendOptionalFormValue(formData, 'evidence_device', payload.evidence_device);
  appendOptionalFormValue(formData, 'evidence_activation', payload.evidence_activation);

  return apiRequest<EvidenceResponse>(
    '/evidence/',
    {
      method: 'POST',
      body: formData,
    },
    { jsonContentType: false }
  );
}

export function downloadEvidence(evidenceId: number) {
  return apiRequest<EvidenceDownloadResponse>(`/evidence/${evidenceId}/download`);
}
