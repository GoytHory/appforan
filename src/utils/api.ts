const SERVER_URL = "https://serverapp-f0wj.onrender.com";

export interface AuthUser {
  id: string;
  username: string;
  avatar?: string;
  status?: "online" | "offline";
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface DirectChatPreview {
  chatId: string;
  otherUser: AuthUser;
  lastMessage?: {
    text?: string;
    previewText?: string;
    mediaType?: "image" | "audio";
    sender?: string;
    timestamp?: string;
  } | null;
  updatedAt?: string;
}

export interface MessageMedia {
  type: "image" | "audio";
  url: string;
  mimeType?: string;
  durationSec?: number;
}

export interface ChatMessage {
  _id?: string;
  id?: string;
  chatId?: string;
  text?: string;
  media?: MessageMedia;
  timestamp?: string;
  sender?:
    | {
        _id?: string;
        id?: string;
        username?: string;
        avatar?: string;
      }
    | string;
}

const requestJson = async <T>(
  path: string,
  options: RequestInit,
): Promise<T> => {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data?.error === "string" ? data.error : "Ошибка запроса";
    throw new Error(message);
  }

  return data as T;
};

export const registerUser = (
  username: string,
  password: string,
): Promise<AuthResponse> => {
  return requestJson<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
};

export const loginUser = (
  username: string,
  password: string,
): Promise<AuthResponse> => {
  return requestJson<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
};

export const getMe = (token: string): Promise<{ user: AuthUser }> => {
  return requestJson<{ user: AuthUser }>("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const updateMyAvatar = (
  token: string,
  avatar: string,
): Promise<{ user: AuthUser }> => {
  return requestJson<{ user: AuthUser }>("/api/users/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ avatar }),
  });
};

export const searchUsers = (
  token: string,
  query: string,
): Promise<{ users: AuthUser[] }> => {
  return requestJson<{ users: AuthUser[] }>(
    `/api/users/search?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};

export const getDirectChats = (
  token: string,
): Promise<{ chats: DirectChatPreview[] }> => {
  return requestJson<{ chats: DirectChatPreview[] }>("/api/chats/direct", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const createDirectChat = (
  token: string,
  targetUserId: string,
): Promise<{ chatId: string; otherUser: AuthUser }> => {
  if (!targetUserId?.trim()) {
    return Promise.reject(new Error("Не удалось определить ID пользователя"));
  }

  return requestJson<{ chatId: string; otherUser: AuthUser }>(
    "/api/chats/direct",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUserId }),
    },
  );
};

export const getChatMessages = (
  token: string,
  chatId: string,
  options?: { before?: string; limit?: number },
): Promise<{ messages: ChatMessage[] }> => {
  const search = new URLSearchParams();
  if (options?.before) {
    search.set("before", options.before);
  }
  if (options?.limit) {
    search.set("limit", String(options.limit));
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";

  return requestJson<{ messages: ChatMessage[] }>(
    `/api/chats/${encodeURIComponent(chatId)}/messages${suffix}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};

export const uploadImageToServer = (
  token: string,
  payload: { base64: string; mimeType?: string; context?: "avatar" | "chat" },
): Promise<{ url: string; displayUrl?: string }> => {
  return requestJson<{ url: string; displayUrl?: string }>("/api/media/image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
};
