const BASE = import.meta.env.VITE_SERVER_URL || "";

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  return res.json();
}

export const api = {
  health: () => req("GET", "/health"),
  chatHistory: (since, limit = 200) =>
    req("GET", `/chat/history?${since ? `since=${encodeURIComponent(since)}` : `limit=${limit}`}`),
  chatSend: (text, secret) =>
    req("POST", "/chat/send", { text, secret }),
  tmuxCapture: (session, lines = 120) =>
    req("GET", `/tmux/capture?session=${encodeURIComponent(session)}&lines=${lines}`),
  tmuxSend: (keys, session, secret, enter = true) =>
    req("POST", "/tmux/send", { keys, session, enter, secret }),
  tmuxKey: (key, session, secret) =>
    req("POST", "/tmux/send", { key, session, secret }),
  tmuxSessions: () => req("GET", "/tmux/sessions"),
  favoritesList: (limit = 100) =>
    req("GET", `/favorites/list?limit=${limit}`),
  favoritesAdd: (body, secret) =>
    req("POST", "/favorites/add", { ...body, secret }),
  favoritesDelete: (id, secret) =>
    req("POST", "/favorites/delete", { id, secret }),
};
