const DEFAULT_API_BASE_URL = "http://localhost:8000";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE_URL;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
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
  const data = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : "Something went wrong. Please try again.";

    throw new Error(message);
  }

  return data as TResponse;
}
