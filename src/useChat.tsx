import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, refreshToken, WS_URL } from "./api";
import { parseServerMessage, type ChatMessage, type ConnectionStatus } from "./types";

const MAX_MESSAGES = 500;

// Хук держит WebSocket-соединение с чатом.
// Порядок по протоколу: открыли соединение, отправили AUTH с токеном, получили AUTH_SUCCESS.
export function useChat(initialToken: string, onSessionExpired: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const nextId = useRef(1);

  const connect = useCallback((token: string) => {
    setStatus("connecting");
    setError("");

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;
    let authorized = false;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "AUTH", payload: { token } }));
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      const message = parseServerMessage(String(event.data));
      if (!message) {
        return;
      }
      if (message.type === "AUTH_SUCCESS") {
        authorized = true;
        setStatus("connected");
      } else {
        const id = nextId.current++;
        setMessages((current) => [...current.slice(-(MAX_MESSAGES - 1)), { id, ...message.payload }]);
      }
    };

    socket.onclose = () => {
      // Закрылось уже заменённое соединение: игнорируем.
      if (socketRef.current !== socket) {
        return;
      }
      setStatus("closed");
      setError(
        authorized ? "Соединение потеряно." : "Сервер закрыл соединение: токен не принят или сервер недоступен.",
      );
    };
  }, []);

  useEffect(() => {
    connect(initialToken);
    return () => {
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [connect, initialToken]);

  // Access-токен живёт недолго, поэтому перед повторным подключением берём новый.
  const reconnect = useCallback(async () => {
    setStatus("connecting");
    setError("");
    try {
      connect(await refreshToken());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        onSessionExpired();
        return;
      }
      setStatus("closed");
      setError(e instanceof ApiError ? e.message : "Не удалось переподключиться.");
    }
  }, [connect, onSessionExpired]);

  const send = useCallback((text: string): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify({ type: "CHAT_MESSAGE", payload: { text } }));
    return true;
  }, []);

  return { messages, status, error, send, reconnect };
}
