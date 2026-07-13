import { apiJson } from './client';
import { clearTokens, saveTokens } from './tokens';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: number | string;
    name?: string;
    email?: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await apiJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

export interface Me {
  id: number | string;
  name?: string;
  email?: string;
  permissions?: string[];
  isAdmin?: boolean;
}

export async function me(): Promise<Me | null> {
  try {
    return await apiJson<Me>('/auth/me');
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await clearTokens();
}
