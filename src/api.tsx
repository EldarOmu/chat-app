import type { AuthResponse, Credentials, UserProfile } from "./types";

// Адреса можно переопределить в файле .env: VITE_API_URL и VITE_WS_URL.
export const API_URL: string = (import.meta.env.VITE_API_URL ?? "https://inai-col3.fishrungames.com").replace(
  /\/$/,
  "",
);
export const WS_URL: string = import.meta.env.VITE_WS_URL ?? "wss://inai-col3.fishrungames.com/chat/";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const FIELD_NAMES: Record<string, string> = {
  username: "Имя пользователя",
  password: "Пароль",
};

// Сервер возвращает ошибки как {"поле": ["текст"]} или {"detail": "текст"}.
function extractMessage(data: unknown): string | null {
  if (typeof data === "string") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(extractMessage).filter(Boolean).join(" ") || null;
  }
  if (data && typeof data === "object") {
    const parts = Object.entries(data).map(([key, value]) => {
      const message = extractMessage(value);
      if (!message) {
        return null;
      }
      return key === "detail" || key === "non_field_errors" ? message : `${FIELD_NAMES[key] ?? key}: ${message}`;
    });
    return parts.filter(Boolean).join(" ") || null;
  }
  return null;
}

async function request<T>(path: string, method: string = "GET", body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      // include: браузер сохраняет и отправляет HttpOnly cookie с refresh-токеном
      credentials: "include",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Не удалось связаться с сервером. Проверьте интернет.", 0);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(extractMessage(data) ?? `Ошибка сервера (${response.status})`, response.status);
  }

  return data as T;
}

export function register(credentials: Credentials): Promise<AuthResponse> {
  return request<AuthResponse>("/api/register/", "POST", credentials);
}

export function login(credentials: Credentials): Promise<AuthResponse> {
  return request<AuthResponse>("/api/login/", "POST", credentials);
}

// Сервер удаляет cookie с refresh-токеном. Access-токен не нужен.
export function logout(): Promise<unknown> {
  return request<unknown>("/api/logout/", "POST");
}

export function getProfile(token: string): Promise<UserProfile> {
  return request<UserProfile>("/api/profile/", "GET", undefined, token);
}

// Refresh-токен сервер берёт из cookie сам, в теле запроса ничего нет.
export async function refreshToken(): Promise<string> {
  const data = await request<{ access: string }>("/api/token/refresh/", "POST");
  return data.access;
}
