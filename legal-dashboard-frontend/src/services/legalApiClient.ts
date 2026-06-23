const DEFAULT_API_BASE_URL = "http://localhost:8000";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE_URL;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

function parseJsonBody(bodyText: string) {
  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText;
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
  config: { jsonContentType?: boolean } = { jsonContentType: true }
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(config.jsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  const bodyText = await response.text();
  const data = parseJsonBody(bodyText);

  if (!response.ok) {
    const detail = typeof data === "object" && data !== null && "detail" in data ? data.detail : null;
    const message =
      typeof detail === "string"
        ? detail
        : typeof data === "string" && data.trim()
          ? data
          : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as TResponse;
}
