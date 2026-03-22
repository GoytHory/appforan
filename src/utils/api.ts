const SERVER_URL = 'https://serverapp-f0wj.onrender.com';

export interface AuthUser {
  id: string;
  username: string;
  avatar?: string;
  status?: 'online' | 'offline';
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

const requestJson = async <T>(path: string, options: RequestInit): Promise<T> => {
  const response = await fetch(`${SERVER_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Ошибка запроса';
    throw new Error(message);
  }

  return data as T;
};

export const registerUser = (username: string, password: string): Promise<AuthResponse> => {
  return requestJson<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
};

export const loginUser = (username: string, password: string): Promise<AuthResponse> => {
  return requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
};

export const getMe = (token: string): Promise<{ user: AuthUser }> => {
  return requestJson<{ user: AuthUser }>('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};