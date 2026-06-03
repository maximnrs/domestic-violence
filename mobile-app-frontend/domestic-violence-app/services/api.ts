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

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
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
