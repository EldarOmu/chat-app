// Ответы REST API (Band Members API, JWT) и сообщения WebSocket-чата.

export interface UserProfile {
  id: number;
  username: string;
}

export interface Credentials {
  username: string;
  password: string;
}

// Ответ /api/login/ и /api/register/. Refresh-токен сервер кладёт в HttpOnly cookie.
export interface AuthResponse {
  access: string;
  user?: UserProfile;
}

export interface Session {
  username: string;
  token: string; // access-токен
}

export type AuthMode = "login" | "register";

export interface ChatMessage {
  id: number; // локальный номер, нужен только для key в списке
  sender: string;
  text: string;
  timestamp: number; // миллисекунды
}

// Что присылает сервер по WebSocket.
export type ServerMessage =
  | { type: "AUTH_SUCCESS"; payload: { username: string } }
  | { type: "NEW_MESSAGE"; payload: { sender: string; text: string; timestamp: number } };

export type ConnectionStatus = "connecting" | "connected" | "closed";

// Проверяем форму сообщения вручную: данные из сети нельзя считать типизированными.
export function parseServerMessage(raw: string): ServerMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const { type, payload } = data as { type?: unknown; payload?: unknown };
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const body = payload as Record<string, unknown>;

  if (type === "AUTH_SUCCESS" && typeof body.username === "string") {
    return { type, payload: { username: body.username } };
  }
  if (
    type === "NEW_MESSAGE" &&
    typeof body.sender === "string" &&
    typeof body.text === "string" &&
    typeof body.timestamp === "number"
  ) {
    return { type, payload: { sender: body.sender, text: body.text, timestamp: body.timestamp } };
  }
  return null;
}
