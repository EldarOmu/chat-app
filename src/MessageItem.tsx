import type { ChatMessage } from "./types";

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
}

function MessageItem({ message, isOwn }: MessageItemProps) {
  const time = new Date(message.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <li className={isOwn ? "message message--own" : "message"}>
      <div className="message-head">
        <span className="message-sender">{isOwn ? "Вы" : message.sender}</span>
        <time>{time}</time>
      </div>
      <p>{message.text}</p>
    </li>
  );
}

export default MessageItem;
