import { useCallback, useEffect, useState } from "react";
import { ApiError, getProfile, logout, refreshToken } from "./api";
import AuthForm from "./AuthForm";
import Chat from "./Chat";
import type { AuthMode, AuthResponse, Session } from "./types";

// Имя берём из ответа входа, а если его там нет, спрашиваем профиль.
async function createSession(access: string, knownUsername?: string): Promise<Session> {
  const username = knownUsername ?? (await getProfile(access)).username;
  return { username, token: access };
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<AuthMode>("login");
  const [message, setMessage] = useState("");

  // При открытии страницы пробуем получить access-токен по refresh-cookie.
  useEffect(() => {
    let cancelled = false;
    refreshToken()
      .then((access) => createSession(access))
      .then((restored) => {
        if (!cancelled) {
          setSession(restored);
        }
      })
      .catch(() => {
        // нет действующей сессии: показываем форму входа
      })
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAuth(response: AuthResponse): Promise<void> {
    setSession(await createSession(response.access, response.user?.username));
    setMessage("");
  }

  const handleSessionExpired = useCallback(() => {
    setSession(null);
    setMode("login");
    setMessage("Сессия закончилась. Войдите снова.");
  }, []);

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } catch (e) {
      // 401/403: сессии на сервере уже нет, поэтому просто выходим
      const alreadyGone = e instanceof ApiError && (e.status === 401 || e.status === 403);
      if (!alreadyGone) {
        setMessage(e instanceof ApiError ? e.message : "Не удалось выйти.");
        return;
      }
    }
    setSession(null);
    setMode("login");
    setMessage("");
  }

  if (checking) {
    return (
      <main>
        <p>Загрузка…</p>
      </main>
    );
  }

  return (
    <main>
      <header className="bar">
        <h1>Групповой чат</h1>
        {session && (
          <div className="bar-user">
            <span>{session.username}</span>
            <button type="button" className="secondary" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        )}
      </header>

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      {session ? (
        <Chat key={session.token} username={session.username} token={session.token} onSessionExpired={handleSessionExpired} />
      ) : (
        <AuthForm
          key={mode}
          mode={mode}
          onAuth={handleAuth}
          onSwitch={() => {
            setMessage("");
            setMode(mode === "login" ? "register" : "login");
          }}
        />
      )}
    </main>
  );
}

export default App;
