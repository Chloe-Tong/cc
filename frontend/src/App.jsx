import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "./api.js";
import "./App.css";

// ──────────────────────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts.slice(11, 16);
  }
}

function useConfig() {
  const [cfg, setCfg] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ccc_config") || "{}"); } catch { return {}; }
  });
  const save = (next) => { setCfg(next); localStorage.setItem("ccc_config", JSON.stringify(next)); };
  return [cfg, save];
}

// ──────────────────────────────────────────────────────────────────────────────
// 设置弹窗
// ──────────────────────────────────────────────────────────────────────────────
function ConfigModal({ cfg, onSave, onClose }) {
  const [url, setUrl] = useState(cfg.serverUrl || "");
  const [secret, setSecret] = useState(cfg.secret || "");
  const [session, setSession] = useState(cfg.session || "opia");

  const handleSave = () => {
    onSave({ serverUrl: url.trim(), secret: secret.trim(), session: session.trim() || "opia" });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 连接设置</h2>
        <div>
          <label>Server URL（如 http://100.x.x.x:8795）</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:8795" />
        </div>
        <div>
          <label>Shared Secret</label>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="config.toml 里的 shared_secret" />
        </div>
        <div>
          <label>tmux Session 名</label>
          <input value={session} onChange={(e) => setSession(e.target.value)} placeholder="opia" />
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button className="btn-save" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 聊天视图
// ──────────────────────────────────────────────────────────────────────────────
const SLASH_CMDS = [
  { label: "/new", desc: "新 session" },
  { label: "/list", desc: "列出 sessions" },
  { label: "/stop", desc: "停止" },
  { label: "/compact", desc: "压缩上下文" },
  { label: "/clear", desc: "清空" },
  { label: "/help", desc: "帮助" },
];

function ChatView({ cfg, favIds, onStar }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const lastTs = useRef(null);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const pollTimer = useRef(null);

  const scrollToBottom = () => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  };

  const fetchMsgs = useCallback(async () => {
    if (!cfg.serverUrl) return;
    try {
      const data = await api.chatHistory(lastTs.current);
      if (data.ok && Array.isArray(data.records) && data.records.length > 0) {
        setMsgs((prev) => {
          const existing = new Set(prev.map((m) => m._key));
          const news = data.records.filter((r) => !existing.has(r.ts + r.role));
          if (!news.length) return prev;
          return [...prev, ...news.map((r) => ({ ...r, _key: r.ts + r.role }))];
        });
        const last = data.records[data.records.length - 1];
        if (last?.ts) lastTs.current = last.ts;
        setThinking(false);
        setTimeout(scrollToBottom, 50);
      }
    } catch { /* ignore */ }
  }, [cfg.serverUrl]);

  useEffect(() => {
    setMsgs([]);
    lastTs.current = null;
    if (!cfg.serverUrl) return;
    fetchMsgs();
    pollTimer.current = setInterval(fetchMsgs, 2500);
    return () => clearInterval(pollTimer.current);
  }, [cfg.serverUrl, fetchMsgs]);

  const sendMsg = async (text) => {
    if (!text.trim() || sending || !cfg.serverUrl) return;
    setSending(true);
    setThinking(true);
    setInput("");
    setShowSlash(false);
    const optimistic = { role: "user", text: text.trim(), ts: new Date().toISOString(), _key: "opt" + Date.now() };
    setMsgs((p) => [...p, optimistic]);
    setTimeout(scrollToBottom, 30);
    try {
      await api.chatSend(text.trim(), cfg.secret);
    } catch { setThinking(false); }
    setSending(false);
  };

  const handleKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); sendMsg(input); }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    setShowSlash(e.target.value === "/");
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const applySlash = (cmd) => {
    setInput(cmd + " ");
    setShowSlash(false);
    inputRef.current?.focus();
  };

  return (
    <>
      <div className="chat-body" ref={bodyRef}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-sub)", marginTop: 60, fontSize: 14 }}>
            {cfg.serverUrl ? "暂无消息，说点什么吧 👋" : "先在左下角配置 Server 地址"}
          </div>
        )}
        {msgs.map((m) => {
          const isMe = m.role === "user";
          const starred = favIds.has(m.ts);
          return (
            <div key={m._key} className={`msg-row ${isMe ? "me" : ""}`}>
              <div className={`avatar ${isMe ? "me" : ""}`}>{isMe ? "你" : "C"}</div>
              <div className="msg-inner">
                <div className="bubble-wrap" style={{ display: "flex", alignItems: "flex-end", gap: 4, flexDirection: isMe ? "row-reverse" : "row" }}>
                  <div className={`bubble ${isMe ? "me" : "ai"}`}>{m.text}</div>
                  {!isMe && (
                    <button
                      className={`star-btn ${starred ? "starred" : ""}`}
                      title="收藏"
                      onClick={() => onStar(m)}
                    >★</button>
                  )}
                </div>
                <div className="msg-ts">{fmtTime(m.ts)}</div>
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="thinking">
            <div className="dot-pulse"><span /><span /><span /></div>
            Cc 思考中…
          </div>
        )}
      </div>
      <div className="chat-footer">
        {showSlash && (
          <div className="slash-strip">
            {SLASH_CMDS.map((c) => (
              <button key={c.label} className="slash-chip" title={c.desc} onClick={() => applySlash(c.label)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
        <div className="input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            rows={1}
            placeholder="输入消息… (/ 唤出命令面板，⌘+Enter 发送)"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
          />
          <button className="send-btn" disabled={!input.trim() || sending || !cfg.serverUrl} onClick={() => sendMsg(input)}>
            ↑
          </button>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 终端视图
// ──────────────────────────────────────────────────────────────────────────────
const SPECIAL_KEYS = [
  { label: "⏎ Enter", key: "Enter" },
  { label: "⎋ Esc", key: "Escape" },
  { label: "↑", key: "Up" },
  { label: "↓", key: "Down" },
  { label: "⇥ Tab", key: "Tab" },
  { label: "C-c", key: "C-c" },
  { label: "C-l", key: "C-l" },
];

function TerminalView({ cfg }) {
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(cfg.session || "opia");
  const outputRef = useRef(null);
  const pollRef = useRef(null);

  const capture = useCallback(async (s) => {
    if (!cfg.serverUrl) return;
    try {
      const data = await api.tmuxCapture(s || session);
      if (data.ok) {
        setOutput(data.content || "");
        setTimeout(() => {
          if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }, 30);
      }
    } catch { /* ignore */ }
  }, [cfg.serverUrl, session]);

  useEffect(() => {
    if (!cfg.serverUrl) return;
    api.tmuxSessions().then((d) => {
      if (d.ok && Array.isArray(d.sessions)) setSessions(d.sessions.map((s) => s.name || s));
    }).catch(() => {});
    capture();
    pollRef.current = setInterval(() => capture(), 2000);
    return () => clearInterval(pollRef.current);
  }, [cfg.serverUrl, capture]);

  useEffect(() => { setSession(cfg.session || "opia"); }, [cfg.session]);

  const sendText = async () => {
    if (!input.trim() || !cfg.serverUrl) return;
    const text = input;
    setInput("");
    await api.tmuxSend(text, session, cfg.secret, true);
  };

  const sendKey = async (key) => {
    if (!cfg.serverUrl) return;
    await api.tmuxKey(key, session, cfg.secret);
  };

  return (
    <div className="terminal-wrap">
      <div className="terminal-topbar">
        <span style={{ fontSize: 13 }}>tmux session:</span>
        {sessions.length > 0 ? (
          <select value={session} onChange={(e) => setSession(e.target.value)}>
            {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 13, color: "#8b949e" }}>{session}</span>
        )}
        <button className="refresh-btn" onClick={() => capture()}>↻ 刷新</button>
      </div>
      <pre className="terminal-output" ref={outputRef}>{output || (cfg.serverUrl ? "等待输出…" : "请先配置 Server 地址")}</pre>
      <div className="key-strip">
        {SPECIAL_KEYS.map((k) => (
          <button key={k.key} className="key-btn" onClick={() => sendKey(k.key)}>{k.label}</button>
        ))}
      </div>
      <div className="terminal-input-row">
        <input
          className="terminal-input"
          placeholder="输入命令，Enter 发送"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendText(); } }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 收藏夹视图
// ──────────────────────────────────────────────────────────────────────────────
function FavoritesView({ cfg, favs, onDelete }) {
  if (!cfg.serverUrl) return (
    <div className="fav-body"><div className="fav-empty">请先配置 Server 地址</div></div>
  );
  return (
    <div className="fav-body">
      {favs.length === 0 ? (
        <div className="fav-empty">还没有收藏，在聊天里点 ★ 收藏消息</div>
      ) : (
        favs.map((f) => (
          <div key={f.id || f.ts} className="fav-card">
            <div className="fav-card-tag">★ 收藏</div>
            <div className="fav-card-text">{f.text || f.body || ""}</div>
            <div className="fav-card-ts">{fmtTime(f.ts || f.created_at)}</div>
            <button className="fav-del" title="删除" onClick={() => onDelete(f.id)}>✕</button>
          </div>
        ))
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 主 App
// ──────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "chat", icon: "💬", label: "聊天" },
  { id: "terminal", icon: "⌨️", label: "终端" },
  { id: "favorites", icon: "★", label: "收藏" },
];

export default function App() {
  const [cfg, saveCfg] = useConfig();
  const [tab, setTab] = useState("chat");
  const [online, setOnline] = useState(false);
  const [showConfig, setShowConfig] = useState(!cfg.serverUrl);
  const [favs, setFavs] = useState([]);
  const favIds = new Set(favs.map((f) => f.source_ts || f.ts));

  // 健康检查
  useEffect(() => {
    if (!cfg.serverUrl) { setOnline(false); return; }
    const check = async () => {
      try { const d = await api.health(); setOnline(!!d.ok); } catch { setOnline(false); }
    };
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, [cfg.serverUrl]);

  // 加载收藏
  const loadFavs = useCallback(async () => {
    if (!cfg.serverUrl) return;
    try {
      const d = await api.favoritesList();
      if (d.ok && Array.isArray(d.records)) setFavs(d.records);
    } catch { /* ignore */ }
  }, [cfg.serverUrl]);

  useEffect(() => { loadFavs(); }, [loadFavs]);
  useEffect(() => { if (tab === "favorites") loadFavs(); }, [tab, loadFavs]);

  const handleStar = async (msg) => {
    if (!cfg.serverUrl) return;
    try {
      await api.favoritesAdd({ text: msg.text, source_ts: msg.ts }, cfg.secret);
      loadFavs();
    } catch { /* ignore */ }
  };

  const handleDeleteFav = async (id) => {
    if (!cfg.serverUrl) return;
    try {
      await api.favoritesDelete(id, cfg.secret);
      setFavs((p) => p.filter((f) => f.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="app">
      {/* 侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className={`dot ${online ? "online" : ""}`} />
          Cc Web
        </div>
        <nav className="sidebar-nav">
          {TABS.map((t) => (
            <div
              key={t.id}
              className={`nav-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="icon">{t.icon}</span>
              {t.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="config-btn" onClick={() => setShowConfig(true)}>
            ⚙️ {cfg.serverUrl ? cfg.serverUrl.replace(/^https?:\/\//, "").slice(0, 22) : "配置服务器…"}
          </button>
          <div style={{ fontSize: 11, color: "var(--text-sub)", padding: "0 8px" }}>
            {online ? "✅ 已连接" : "⚪ 未连接"}
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">
            {TABS.find((t) => t.id === tab)?.icon} {TABS.find((t) => t.id === tab)?.label}
          </span>
          <span className="topbar-sub">
            {cfg.serverUrl ? `${cfg.serverUrl}` : "未配置"}
          </span>
        </div>

        {tab === "chat" && (
          <ChatView cfg={cfg} favIds={favIds} onStar={handleStar} />
        )}
        {tab === "terminal" && <TerminalView cfg={cfg} />}
        {tab === "favorites" && (
          <FavoritesView cfg={cfg} favs={favs} onDelete={handleDeleteFav} />
        )}
      </div>

      {/* 设置弹窗 */}
      {showConfig && (
        <ConfigModal cfg={cfg} onSave={saveCfg} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
