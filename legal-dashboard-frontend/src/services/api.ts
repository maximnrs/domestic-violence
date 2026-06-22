import {
  apiRequest as clientRequest,
  getAuthToken,
  setAuthToken,
} from "./legalApiClient";

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
  created_at: string;
  description: string | null;
};

export type EvidenceTypeResponse = {
  evidence_type_id: number;
  type_name: string;
  description: string | null;
};

export type EvidenceDownloadResponse = {
  status: "success";
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

export { getAuthToken, setAuthToken };

let dashboardLoginPromise: Promise<TokenResponse> | null = null;

function shouldUseDashboardAutoLogin() {
  return import.meta.env.VITE_DASHBOARD_AUTO_LOGIN === "true";
}

async function ensureDashboardAuth() {
  if (getAuthToken() || !shouldUseDashboardAutoLogin()) {
    return;
  }

  const email = import.meta.env.VITE_DASHBOARD_EMAIL;
  const password = import.meta.env.VITE_DASHBOARD_PASSWORD;

  if (!email || !password) {
    return;
  }

  dashboardLoginPromise ??= login({ email, password }).finally(() => {
    dashboardLoginPromise = null;
  });

  await dashboardLoginPromise;
}

async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
  config: { jsonContentType?: boolean; skipAuth?: boolean } = { jsonContentType: true }
): Promise<TResponse> {
  if (!config.skipAuth) {
    await ensureDashboardAuth();
  }

  return clientRequest<TResponse>(path, options, {
    jsonContentType: config.jsonContentType ?? true,
  });
}

export async function login(payload: LoginRequest) {
  const tokenResponse = await apiRequest<TokenResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { skipAuth: true }
  );

  setAuthToken(tokenResponse.access_token);
  return tokenResponse;
}

export function register(payload: RegisterRequest) {
  return apiRequest<UserResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return apiRequest<UserResponse>("/auth/me");
}

export function getCases() {
  return apiRequest<CaseResponse[]>("/cases/admin/");
}

export function getCase(caseId: number) {
  return apiRequest<CaseResponse>(`/cases/${caseId}`);
}

export function listIncidents(caseId: number) {
  return apiRequest<IncidentResponse[]>(`/incidents/admin/?case_id=${caseId}`);
}

export function getIncident(incidentId: number) {
  return apiRequest<IncidentResponse>(`/incidents/${incidentId}`);
}

export function createIncident(payload: IncidentCreateRequest) {
  return apiRequest<IncidentResponse>("/incidents/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getEvidenceTypes() {
  return apiRequest<EvidenceTypeResponse[]>("/evidence-types/");
}

export function listIncidentEvidence(incidentId: number) {
  return apiRequest<EvidenceResponse[]>(`/evidence/admin/?incident_id=${incidentId}`);
}

export async function listCaseEvidence(caseId: number) {
  const incidents = await listIncidents(caseId);
  const evidenceGroups = await Promise.all(
    incidents.map((incident) => listIncidentEvidence(incident.incident_id))
  );

  return evidenceGroups.flat();
}

function appendOptionalFormValue(formData: FormData, key: string, value?: string | null) {
  if (value) {
    formData.append(key, value);
  }
}

export function uploadEvidence(payload: UploadEvidenceRequest) {
  const formData = new FormData();

  formData.append("incident_id", String(payload.incident_id));
  formData.append("evidence_type_id", String(payload.evidence_type_id));

  if (payload.file.blob) {
    formData.append("file", payload.file.blob, payload.file.name);
  } else if (payload.file.uri) {
    formData.append("file", {
      uri: payload.file.uri,
      name: payload.file.name,
      type: payload.file.type,
    } as unknown as Blob);
  } else {
    throw new Error("Evidence file is missing.");
  }

  appendOptionalFormValue(formData, "description", payload.description);
  appendOptionalFormValue(formData, "evidence_location", payload.evidence_location);
  appendOptionalFormValue(formData, "evidence_imei", payload.evidence_imei);
  appendOptionalFormValue(formData, "evidence_device", payload.evidence_device);
  appendOptionalFormValue(formData, "evidence_activation", payload.evidence_activation);

  return apiRequest<EvidenceResponse>(
    "/evidence/",
    {
      method: "POST",
      body: formData,
    },
    { jsonContentType: false }
  );
}

export function downloadEvidence(evidenceId: number) {
  return apiRequest<EvidenceDownloadResponse>(`/evidence/${evidenceId}/download`);
}

export type TranscriptionResponse = {
  text: string;
  language: string;
  language_probability: number;
};

// Sends a stored evidence file (by ID) to the backend, which downloads,
// decrypts, and transcribes it using the Whisper service.
export function transcribeEvidence(evidenceId: number) {
  return apiRequest<TranscriptionResponse & { evidence_id: number }>(
    "/transcriptions/",
    {
      method: "POST",
      body: JSON.stringify({ evidence_id: evidenceId }),
    }
  );
}

// Sends a directly uploaded audio file to the backend demo transcription endpoint.
// Does not require a stored evidence record in the database.
export function transcribeDemo(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<TranscriptionResponse>(
    "/transcriptions/demo",
    { method: "POST", body: formData },
    { jsonContentType: false }
  );
}
