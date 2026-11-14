import { useEffect, useRef, useState, type FormEvent } from "react";
import MessageItem from "./MessageItem";
import { useChat } from "./useChat";
import type { ConnectionStatus } from "./types";

interface ChatProps {
  username: string;
  token: string;
  onSessionExpired: () => void;
}

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connecting: "Подключаемся…",
  connected: "В сети",
  closed: "Нет соединения",
};

function Chat({ username, token, onSessionExpired }: ChatProps) {
  const { messages, status, error, send, reconnect } = useChat(token, onSessionExpired);
  const [text, setText] = useState("");
  const listEnd = useRef<HTMLLIElement>(null);

  // Прокручиваем список к последнему сообщению.
  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed !== "" && send(trimmed)) {
      setText("");
    }
  }

  return (
    <section className="card chat">
      <div className="chat-head">
        <h2>Общий чат</h2>
        <span className={`status status--${status}`}>{STATUS_TEXT[status]}</span>
      </div>

      {status === "closed" && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={reconnect}>
            Переподключиться
          </button>
        </div>
      )}

      <ul className="messages" role="log" aria-live="polite" aria-label="Сообщения чата">
        {messages.length === 0 && <li className="empty">Сообщений пока нет. Напишите первым.</li>}
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} isOwn={message.sender === username} />
        ))}
        <li ref={listEnd} aria-hidden="true" />
      </ul>

      <form className="send" onSubmit={handleSubmit}>
        <input
          type="text"
          aria-label="Сообщение"
          placeholder="Введите сообщение"
          value={text}
          maxLength={1000}
          disabled={status !== "connected"}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" disabled={status !== "connected" || text.trim() === ""}>
          Отправить
        </button>
      </form>
    </section>
  );
}

export default Chat;
