"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

type Page = "home" | "chat" | "work" | "settings";
type ChatLayer = "chat" | "details" | "search" | "calendar";
type SettingsLayer = "root" | "space" | "profile" | "memory" | "activity" | "agents" | "usage" | "runtime" | "system";
type SpaceProfile = { spaceName: string; userName: string; companionName: string; since: string; userAvatar: string; companionAvatar: string };
type Sticker = { id: string; label: string; tone: "rose" | "sage" | "gold" | "ink"; src?: string };
type Attachment = { name: string; type: "image" | "camera" | "file"; src?: string; mime?: string };
type Reminder = { title: string; when: string };
type Message = { id: number | string; sender: "companion" | "user"; text: string; time: string; date?: string; kind?: "text" | "sticker" | "attachment" | "reminder"; sticker?: Sticker; attachment?: Attachment; reminder?: Reminder; groupStart?: boolean; proactive?: boolean; read?: boolean; reaction?: string; thinking?: string };
type ApiMessage = { id: string; sender: "user" | "companion" | "system"; text: string; sentAt: number; eventSeq: number; thinking?: string };
type AvatarMotion = "idle" | "thinking" | "happy" | "missing" | "sleepy" | "sleeping";
type FontMode = "hand" | "system";
type AccentTheme = "rose" | "sage" | "clay";
type AgentModel = "claude-opus-5" | "claude-sonnet-5" | "claude-fable-5" | "claude-haiku-4-5-20251001";
type AgentConfig = { id: string; name: string; role: string; model: AgentModel; thinkingEnabled: boolean };

const defaultStickers: Sticker[] = [
  { id: "miss", label: "想你了", tone: "rose" }, { id: "hug", label: "抱一下", tone: "sage" },
  { id: "kiss", label: "亲亲", tone: "rose" }, { id: "wait", label: "在等你", tone: "gold" },
  { id: "pout", label: "哼", tone: "ink" }, { id: "angry", label: "有点生气", tone: "rose" },
  { id: "sleep", label: "困困", tone: "sage" }, { id: "gotit", label: "收到啦", tone: "gold" },
];

const agentModelOptions: { id: AgentModel; label: string; note: string; supportsThinking: boolean }[] = [
  { id: "claude-opus-5", label: "Opus 5", note: "最强推理 · 复杂任务", supportsThinking: true },
  { id: "claude-sonnet-5", label: "Sonnet 5", note: "均衡推荐 · 日常首选", supportsThinking: true },
  { id: "claude-fable-5", label: "Fable 5", note: "创意对话 · 情感丰富", supportsThinking: true },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", note: "快速轻量 · 节省额度", supportsThinking: false },
];
const defaultAgentConfigs: AgentConfig[] = [
  { id: "primary", name: "晓", role: "Primary · Chat & Work", model: "claude-sonnet-5", thinkingEnabled: true },
  { id: "frontend", name: "Frontend Helper", role: "渡口前端 · 接口调用", model: "claude-haiku-4-5-20251001", thinkingEnabled: false },
  { id: "audit", name: "Audit Helper", role: "检查改动 · 合规运行", model: "claude-haiku-4-5-20251001", thinkingEnabled: false },
];

const navItems: { id: Page; label: string }[] = [
  { id: "home", label: "Home" }, { id: "chat", label: "Chat" },
  { id: "work", label: "Work" }, { id: "settings", label: "Settings" },
];

const initialMessages: Message[] = [
  { id: 1, sender: "companion", text: "早呀。今天上班路上还顺利吗？", time: "09:07", groupStart: true },
  { id: 2, sender: "user", text: "到公司了，上午有点事情要处理。", time: "09:10", groupStart: true, read: true },
  { id: 3, sender: "companion", text: "好，你先忙。", time: "09:11", groupStart: true },
  { id: 4, sender: "companion", text: "上班不等于一整天都不能联系你，想你的时候我还是会来。", time: "09:12" },
  { id: 5, sender: "companion", text: "刚刚走神想到你了。不用急着回，我只是想跟你说一声。", time: "14:18", groupStart: true, proactive: true },
  { id: 6, sender: "user", text: "刚忙完一点，准备去倒杯水。", time: "14:22", groupStart: true, read: true, reaction: "♡" },
  { id: 7, sender: "companion", text: "去吧，慢一点。等你回来再跟我讲晚上想看的电影。", time: "14:23", groupStart: true },
];

const projects = [
  { title: "渡口 · 前端", meta: "今天更新", progress: "界面确认中", color: "rose" },
  { title: "Claude 数据迁移", meta: "等待开始", progress: "准备导入", color: "sage" },
  { title: "动物形象素材", meta: "尚未上传", progress: "等待素材", color: "gold" },
];

const settingItems: { id: SettingsLayer; title: string; subtitle: string }[] = [
  { id: "profile", title: "Profile", subtitle: "身份、关系与空间名称" },
  { id: "memory", title: "Memory", subtitle: "类别、时间线、冷归档与协商" },
  { id: "activity", title: "Activity", subtitle: "唤醒、主动消息与重要事件" },
  { id: "agents", title: "Agents", subtitle: "伴侣本人、工作模式与临时帮手" },
  { id: "usage", title: "Usage", subtitle: "额度概况与分类消耗" },
  { id: "runtime", title: "Runtime", subtitle: "本地服务、调度与通知状态" },
  { id: "system", title: "System", subtitle: "主题、字体与访问密码" },
];

function now() { return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); }

const SKETCH_SELECTOR = [
  ".choice-row button", ".relationship-card", ".system-section",
  ".agent-detail-section", ".usage-breakdown", ".today-card",
  ".chat-profile-card", ".space-avatar-editor", ".space-form-card",
  ".chat-detail-panel > article", ".empty-detail", ".background-choices button",
  ".agent-note", ".thinking-content", ".delete-dialog",
  ".detail-cards", ".settings-list", ".settings-group", ".relationship-hero",
  ".boundary-settings", ".category-grid", ".execution-card", ".type-summary",
].join(", ");

function useSketchBorders(trigger: unknown) {
  useEffect(() => {
    const NS = "http://www.w3.org/2000/svg";
    let counter = 100, rafId = 0;

    function seededRand(seed: number) {
      let s = (seed * 1664525 + 1013904223) >>> 0;
      return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
    }
    const fp = (v: number) => v.toFixed(2);

    function cornerOs(rand: () => number) {
      const r = rand();
      if (r < 0.18) return -(1.2 + rand() * 2.0);
      if (r < 0.52) return (rand() - 0.5) * 0.8;
      if (r < 0.78) return 1.5 + rand() * 3.0;
      return 4.5 + rand() * 4.0;
    }

    function sketchSide(rand: () => number, x1: number, y1: number, x2: number, y2: number, rough: number, os1: number, os2: number) {
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      if (len < 2) return null;
      const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      const sx = x1 - ux * os1, sy = y1 - uy * os1, ex = x2 + ux * os2, ey = y2 + uy * os2;
      const t1 = 0.26 + rand() * 0.12, t2 = 0.62 + rand() * 0.12;
      const amp = rough * (0.65 + rand() * 0.7), sgn = rand() > 0.5 ? 1 : -1;
      const w1 = sgn * amp, w2 = -sgn * amp * (0.5 + rand() * 0.5);
      return `M ${fp(sx)},${fp(sy)} C ${fp(sx+t1*(ex-sx)+nx*w1)},${fp(sy+t1*(ey-sy)+ny*w1)} ${fp(sx+t2*(ex-sx)+nx*w2)},${fp(sy+t2*(ey-sy)+ny*w2)} ${fp(ex)},${fp(ey)}`;
    }

    function addPath(svg: SVGSVGElement, d: string | null, stroke: string, sw: number, opacity?: number) {
      if (!d) return;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d); p.setAttribute("fill", "none");
      p.setAttribute("stroke", stroke); p.setAttribute("stroke-width", String(sw));
      p.setAttribute("stroke-linecap", "round");
      if (opacity != null) p.setAttribute("opacity", String(opacity));
      svg.appendChild(p);
    }

    function cssVar(name: string) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function attachSketch(el: HTMLElement, seed: number) {
      const W = el.offsetWidth, H = el.offsetHeight;
      if (W < 4 || H < 4) return;
      const pad = 6, ox = pad, oy = pad;
      const isSelected = el.classList.contains("selected") || el.classList.contains("on");
      const lineCol = cssVar("--app-line");
      const outerCol = isSelected ? cssVar("--rose") : lineCol;
      const outerSW = isSelected ? 1.9 : 1.5;
      const rand = seededRand(seed);
      const [cTL, cTR, cBR, cBL] = [cornerOs(rand), cornerOs(rand), cornerOs(rand), cornerOs(rand)];

      const svg = document.createElementNS(NS, "svg") as SVGSVGElement;
      svg.classList.add("sk-svg");
      Object.assign(svg.style, { left: `${-pad}px`, top: `${-pad}px`, width: `${W+pad*2}px`, height: `${H+pad*2}px` });
      svg.setAttribute("viewBox", `0 0 ${W+pad*2} ${H+pad*2}`);

      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)") {
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("x", String(ox+.5)); r.setAttribute("y", String(oy+.5));
        r.setAttribute("width", String(W-1)); r.setAttribute("height", String(H-1));
        r.setAttribute("fill", bg); svg.appendChild(r);
      }

      addPath(svg, sketchSide(rand, ox, oy, ox+W, oy, 2.4, cTL, cTR), outerCol, outerSW);
      addPath(svg, sketchSide(rand, ox+W, oy, ox+W, oy+H, 2.4, cTR, cBR), outerCol, outerSW);
      addPath(svg, sketchSide(rand, ox+W, oy+H, ox, oy+H, 2.4, cBR, cBL), outerCol, outerSW);
      addPath(svg, sketchSide(rand, ox, oy+H, ox, oy, 2.4, cBL, cTL), outerCol, outerSW);

      const cardRect = el.getBoundingClientRect();
      el.querySelectorAll(":scope > *, :scope > * > *").forEach(child => {
        if (child.classList.contains("sk-svg") || child.hasAttribute("data-sketched-inner")) return;
        const cs = getComputedStyle(child);
        const bw = parseFloat(cs.borderBottomWidth);
        const bc = cs.borderBottomColor;
        if (bw > 0.4 && bc !== "rgba(0, 0, 0, 0)") {
          child.setAttribute("data-sketched-inner", "");
          const cr = (child as HTMLElement).getBoundingClientRect();
          const y = cr.bottom - cardRect.top + pad;
          if (y > pad + 2 && y < H + pad - 2)
            addPath(svg, sketchSide(rand, ox+2, y, ox+W-2, y, 1.5, 0, 0), lineCol, 1.0, 0.55);
        }
      });

      el.setAttribute("data-sk-active", "");
      el.insertBefore(svg, el.firstChild);
    }

    function renderAll() {
      document.querySelectorAll(".sk-svg").forEach(s => s.remove());
      document.querySelectorAll("[data-sketched-inner]").forEach(e => e.removeAttribute("data-sketched-inner"));
      document.querySelectorAll("[data-sk-active]").forEach(e => e.removeAttribute("data-sk-active"));
      counter = 100;
      document.querySelectorAll(SKETCH_SELECTOR).forEach(el => { attachSketch(el as HTMLElement, counter); counter += 17; });
    }

    const schedule = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(renderAll); };
    document.fonts.ready.then(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [chatLayer, setChatLayer] = useState<ChatLayer>("chat");
  const [settingsLayer, setSettingsLayer] = useState<SettingsLayer>("root");
  const [spaceProfile, setSpaceProfile] = useState<SpaceProfile>({ spaceName: "诗潼和晓的渡口", userName: "诗潼", companionName: "晓", since: "2026-08-05", userAvatar: "", companionAvatar: "" });
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontMode, setFontMode] = useState<FontMode>("hand");
  const [accentTheme, setAccentTheme] = useState<AccentTheme>("rose");
  const [showSplash, setShowSplash] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [workProjectOpen, setWorkProjectOpen] = useState(false);
  const [terminalPos, setTerminalPos] = useState({ x: 18, y: 168 });
  const [companionMotion, setCompanionMotion] = useState<AvatarMotion>("idle");
  const [companionAddress, setCompanionAddress] = useState<string | null>(null);

  useSketchBorders(page);

  useEffect(() => {
    if (!sessionStorage.getItem("evernear-splash")) {
      sessionStorage.setItem("evernear-splash", "seen");
      const reveal = window.setTimeout(() => setShowSplash(true), 0);
      const timer = window.setTimeout(() => setShowSplash(false), 2600);
      return () => { window.clearTimeout(reveal); window.clearTimeout(timer); };
    }
  }, []);

  useEffect(() => {
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setAuthenticated(true);
      return;
    }
    void fetch("/api/auth/session", { credentials: "include" }).then(async (response) => {
      if (!response.ok) { setAuthenticated(false); return; }
      setAuthenticated(true);
      const messagesResponse = await fetch("/api/chat/messages?limit=100", { credentials: "include" });
      if (messagesResponse.ok) {
        const data = await messagesResponse.json() as { messages: ApiMessage[] };
        setMessages(apiMessagesToMessages(data.messages.filter((item) => item.sender !== "system")));
      }
    }).catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/realtime`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type?: string; event?: { eventType?: string; actor?: string; timestamp?: number; content?: { messageId?: string; text?: string; thinking?: string } } };
      if (payload.type !== "event.appended" || payload.event?.eventType !== "message.created" || !payload.event.content?.messageId || !payload.event.content.text) return;
      const sender = payload.event.actor === "user" ? "user" : "companion";
      setMessages((items) => items.some((item) => item.id === payload.event!.content!.messageId) ? items : [...items, { id: payload.event!.content!.messageId!, sender, text: payload.event!.content!.text!, time: formatTime(payload.event!.timestamp ?? Date.now()), groupStart: true, read: sender === "user", thinking: payload.event!.content!.thinking }]);
    };
    return () => socket.close();
  }, [authenticated]);

  useEffect(() => {
    const motions: AvatarMotion[] = ["idle", "thinking", "happy", "missing", "sleepy", "sleeping"];
    const handleMotion = (event: Event) => {
      const next = (event as CustomEvent<AvatarMotion>).detail;
      if (motions.includes(next)) setCompanionMotion(next);
    };
    window.addEventListener("evernear:companion-motion", handleMotion);
    return () => window.removeEventListener("evernear:companion-motion", handleMotion);
  }, []);

  useEffect(() => {
    const savedAddress = localStorage.getItem("evernear-companion-address")?.trim();
    if (savedAddress) setCompanionAddress(savedAddress);
    const handleAddress = (event: Event) => {
      const next = String((event as CustomEvent<string>).detail ?? "").trim();
      if (!next) return;
      setCompanionAddress(next);
      localStorage.setItem("evernear-companion-address", next);
    };
    window.addEventListener("evernear:companion-address", handleAddress);
    return () => window.removeEventListener("evernear:companion-address", handleAddress);
  }, []);

  function switchPage(next: Page) { setPage(next); if (next !== "chat") setChatLayer("chat"); if (next !== "work") setWorkProjectOpen(false); if (next !== "settings") setSettingsLayer("root"); }
  async function sendMessage(event: FormEvent) {
    event.preventDefault(); const text = draft.trim(); if (!text) return;
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setMessages((items) => [...items, { id: `preview-${Date.now()}`, sender: "user", text, time: now(), groupStart: true, read: false }]);
      setDraft(""); flash("本地预览消息，不会写入线上记录"); return;
    }
    const optimisticId = `pending-${Date.now()}`;
    setMessages((items) => [...items, { id: optimisticId, sender: "user", text, time: now(), groupStart: true, read: false }]);
    setDraft(""); setSending(true);
    try {
      const response = await fetch("/api/chat/messages", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (response.status === 401) { setAuthenticated(false); throw new Error("登录已失效"); }
      const data = await response.json() as { userMessage?: ApiMessage; companionMessage?: ApiMessage; error?: string };
      if (!response.ok || !data.userMessage || !data.companionMessage) throw new Error(data.error === "companion_unavailable" ? "消息已保存，但晓暂时没有回应" : "发送失败");
      setMessages((items) => {
        const withoutOptimistic = items.filter((item) => item.id !== optimisticId && item.id !== data.userMessage!.id && item.id !== data.companionMessage!.id);
        return [...withoutOptimistic, fromApiMessage(data.userMessage!), fromApiMessage(data.companionMessage!)];
      });
    } catch (error) { flash(error instanceof Error ? error.message : "发送失败"); }
    finally { setSending(false); }
  }
  function sendSticker(sticker: Sticker) {
    setMessages((items) => [...items, { id: Date.now(), sender: "user", text: `[表情包] ${sticker.label}`, time: now(), kind: "sticker", sticker, groupStart: true, read: false }]);
    flash(`已发送「${sticker.label}」`);
  }
  function sendAttachment(attachment: Attachment) {
    setMessages((items) => [...items, { id: Date.now(), sender: "user", text: `[${attachment.type === "file" ? "文件" : "图片"}] ${attachment.name}`, time: now(), kind: "attachment", attachment, groupStart: true, read: false }]);
    flash("已加入聊天记录");
  }
  function sendReminder(reminder: Reminder) {
    setMessages((items) => [...items, { id: Date.now(), sender: "user", text: `[提醒] ${reminder.title}`, time: now(), kind: "reminder", reminder, groupStart: true, read: false }]);
    flash("提醒已写入聊天，接入 App 后可同步到系统提醒事项");
  }
  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2100); }
  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const startX = event.clientX, startY = event.clientY, origin = terminalPos;
    const panel = event.currentTarget.closest<HTMLElement>(".mobile-terminal");
    const bounds = panel?.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (e: globalThis.PointerEvent) => {
      const deltaX = e.clientX - startX, deltaY = e.clientY - startY;
      if (Math.hypot(deltaX, deltaY) < 6) return;
      const maxX = Math.max(8, window.innerWidth - (bounds?.width ?? 330) - 8);
      const maxY = Math.max(80, window.innerHeight - (bounds?.height ?? 240) - 84);
      setTerminalPos({ x: Math.min(maxX, Math.max(8, origin.x + deltaX)), y: Math.min(maxY, Math.max(80, origin.y + deltaY)) });
    };
    const end = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", end);
  }

  return <main className="evernear-app" data-theme={theme} data-page={page} data-work-open={workProjectOpen} data-font={fontMode} data-accent={accentTheme}>
    <svg className="sketch-filter-defs" width="0" height="0" aria-hidden="true"><defs><filter id="handDrawnEdge" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.065" numOctaves="2" seed="17" result="paperNoise" /><feDisplacementMap in="SourceGraphic" in2="paperNoise" scale="1.7" xChannelSelector="R" yChannelSelector="G" /></filter></defs></svg>
    <aside className="desktop-nav" aria-label="主要导航">
      <button className="brand" onClick={() => switchPage("home")} aria-label="回到首页"><span>e</span><strong>evernear</strong></button>
      <nav>{navItems.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => switchPage(item.id)} />)}</nav>
      <button className="theme-mini" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`切换为${theme === "light" ? "深色" : "浅色"}模式`} aria-pressed={theme === "dark"}><ThemeIcon dark={theme === "dark"} /></button>
    </aside>
    <section className="page-stage">
      {page === "home" && <HomePage userName={spaceProfile.userName} address={companionAddress ?? spaceProfile.userName} since={spaceProfile.since} companionMotion={companionMotion} onOpenChat={() => switchPage("chat")} onOpenWork={() => switchPage("work")} />}
      {page === "chat" && <ChatPage layer={chatLayer} setLayer={setChatLayer} messages={messages} draft={draft} setDraft={setDraft} onSend={sendMessage} onSendSticker={sendSticker} onSendAttachment={sendAttachment} onSendReminder={sendReminder} flash={flash} sending={sending} profile={spaceProfile} onBackHome={() => switchPage("home")} />}
      {page === "work" && <WorkPage terminalOpen={terminalOpen} setTerminalOpen={setTerminalOpen} terminalPos={terminalPos} startDrag={startDrag} flash={flash} onProjectOpenChange={setWorkProjectOpen} />}
      {page === "settings" && <SettingsPage layer={settingsLayer} setLayer={setSettingsLayer} theme={theme} setTheme={setTheme} fontMode={fontMode} setFontMode={setFontMode} accentTheme={accentTheme} setAccentTheme={setAccentTheme} spaceProfile={spaceProfile} setSpaceProfile={setSpaceProfile} flash={flash} />}
    </section>
    <nav className="mobile-nav" aria-label="主要导航">{navItems.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => switchPage(item.id)} />)}</nav>
    {toast && <div className="toast" role="status">{toast}</div>}
    {showSplash && <Splash companionMotion={companionMotion} onSkip={() => setShowSplash(false)} />}
    {authenticated === false && <LoginScreen onAuthenticated={() => { setAuthenticated(true); window.location.reload(); }} />}
  </main>;
}

function formatTime(timestamp: number) { return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp)); }
function fromApiMessage(message: ApiMessage): Message { const date = new Date(message.sentAt); return { id: message.id, sender: message.sender === "user" ? "user" : "companion", text: message.text, time: formatTime(message.sentAt), date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, groupStart: true, read: message.sender === "user", thinking: message.thinking }; }
function apiMessagesToMessages(apiMessages: ApiMessage[]): Message[] { return apiMessages.map((message, index) => { const prev = index > 0 ? apiMessages[index - 1] : null; const isGroupStart = !prev || prev.sender !== message.sender || message.sentAt - prev.sentAt > 5 * 60 * 1000; return { ...fromApiMessage(message), groupStart: isGroupStart }; }); }

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <div className="login-screen"><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { const response = await fetch("/api/auth/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); if (!response.ok) throw new Error("密码不正确"); onAuthenticated(); } catch (reason) { setError(reason instanceof Error ? reason.message : "无法登录"); } finally { setBusy(false); } }}><span className="kicker">EVERNEAR · 渡口</span><h1>欢迎靠岸</h1><p>这是只属于你们两个人的空间。</p><label>访问密码<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>{error && <small role="alert">{error}</small>}<button disabled={busy || !password}>{busy ? "正在确认…" : "进入渡口"}</button></form></div>;
}

function NavButton({ item, active, onClick }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} data-page={item.id} aria-current={active ? "page" : undefined} onClick={onClick}><span className="nav-icon-wrap" aria-hidden="true"><NavIcon page={item.id} /></span><small>{item.label}</small></button>;
}

function NavIcon({ page }: { page: Page }) {
  const common = { viewBox: "0 0 32 32", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  if (page === "home") return <svg {...common}><path d="M7.2 6.1c-3.2 3.7-4.1 9.4-2.3 14 2.7 6.9 11.4 9.3 17.8 5.6 1.4-.8 2.5-1.8 3.4-3" /><path d="M5.1 20.1c3.3-.4 5.7.2 8 .8" /><path className="nav-accent" d="M11.8 18.1c3.4 1.3 6.9 1.4 10.4.1-.7 2.6-2.7 4-5.3 4.1-2.5 0-4.2-1.4-5.1-4.2Z" /></svg>;
  if (page === "chat") return <svg {...common}><path d="M15.9 27.4C12.2 24 5.5 19.2 5.2 13.1 5 9.4 7.2 6.7 10.6 6.5c2.5-.2 4.1 1.2 5.4 3" /><path className="nav-accent" d="M16 9.5c1.5-2.1 3.1-3.2 5.6-3 3.5.3 5.5 3.3 5.1 6.8-.6 5.6-6.8 10.4-10.8 14.1" /></svg>;
  if (page === "work") return <svg {...common}><path d="m12.5 8.2-7 7.5 7.1 7.1M21 8.2l6 7.5-6.1 7.1" /><path className="nav-accent" d="m18.4 5.8-4.7 20.5" /></svg>;
  return <svg {...common}><path d="M5.2 8.3c6 .3 14.4-.3 21.7.1M5.2 16.1c5.9-.2 14.3.3 21.6-.1M5.4 23.8c5.9.4 14.4-.2 21.2.1" /><circle className="nav-accent" cx="11" cy="8.3" r="1.7" /><circle className="nav-accent" cx="21" cy="16" r="1.7" /><circle className="nav-accent" cx="14.8" cy="23.8" r="1.7" /></svg>;
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return <svg className="theme-icon" viewBox="0 0 28 28" fill="none" aria-hidden="true">{dark ? <><path d="M18.9 5.2c-5.8.6-9.5 5.3-8.3 10.6 1 4.4 5.2 6.8 9.5 5.8-2.2 2.1-5.3 3.1-8.4 2.3-5.6-1.4-8.8-7-7.2-12.4 1.7-5.5 7.9-8.4 13.4-5.8" /><path className="accent" d="M20.8 8.2h.1M22.6 12.2h.1" /></> : <><circle cx="14" cy="14" r="5.2" /><path d="M14 3.2v3M14 21.8v3M3.2 14h3M21.8 14h3M6.4 6.4l2.1 2.1M19.5 19.5l2.1 2.1M21.6 6.4l-2.1 2.1M8.5 19.5l-2.1 2.1" /><path className="accent" d="M11.1 12.1c1.6-1.2 3.5-1.2 5.2-.1" /></>}</svg>;
}

function MenuIcon() {
  return <svg className="menu-icon" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5.2 7.8c5.5.3 11.7-.4 17.8.1M5 14.1c5.9-.4 12 .4 18-.1M5.3 20.4c5.6.4 11.8-.3 17.5.1" /><path className="accent" d="M19.5 5.1c1 .2 1.8.5 2.5 1" /></svg>;
}

function ThinkingIcon() {
  return <svg className="thinking-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" strokeWidth="1.2" /><path d="M5.5 7c.4-1 1.3-1.6 2.5-1.6s2.2.8 2.2 1.8c0 .8-.5 1.3-1.3 1.7L8 9.6" strokeWidth="1.2" strokeLinecap="round" /><circle cx="8" cy="11.2" r=".6" fill="currentColor" /></svg>;
}

function ChevronIcon({ direction = "right" }: { direction?: "left" | "right" | "up" | "down" }) {
  return <svg className={`chevron-icon ${direction}`} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8.4 4.9c2.8 2.6 5.4 5 7.6 7.1-2.3 2.4-4.8 4.8-7.7 7.4" /></svg>;
}

function CategoryIcon({ index }: { index: number }) {
  const common = { className: "category-icon", viewBox: "0 0 32 32", fill: "none", "aria-hidden": true } as const;
  if (index === 0) return <svg {...common}><path d="M6.2 9.1c5.8-.6 13.5-.5 19.6.2.5 5.5.4 12.2-.3 17.2-5.7.6-13.6.5-19.1-.4-.5-5.2-.6-11.7-.2-17Z" /><path d="M6.5 13.8c5.8.4 13.2.4 18.9 0M10.5 5.8v6M21.6 5.8v6" /><path className="accent" d="M11 18.5h.1M16 18.5h.1M21 18.5h.1M11 23h.1M16 23h.1" /></svg>;
  if (index === 1) return <svg {...common}><path d="M5.2 7.4c6-.7 15.1-.5 21.4.2.5 5.8.3 12.5-.4 17.8-6.1.7-15.1.5-20.8-.4-.5-5.5-.6-12-.2-17.6Z" /><path d="m6 22 7.2-7.1 5 4.5 4.1-5 4 6" /><circle className="accent" cx="21.5" cy="11.5" r="2.2" /></svg>;
  if (index === 2) return <svg {...common}><path d="M8.6 4.8c4.4-.4 10.2-.3 14.6.2l2.6 3.2c.3 5.7.1 13.7-.5 19.2-4.8.5-11.4.4-16.3-.3-.4-6.6-.5-15.9-.4-22.3Z" /><path className="accent" d="m23.2 5-.1 4 2.7-.8" /><path d="M12.5 14.2c3-.3 5.9-.2 8.9.1M12.5 19c3.1-.2 6-.1 8.9.1" /></svg>;
  if (index === 3) return <svg {...common}><path d="M12.7 19.5 10 22.2c-2.2 2.2-5.7 1.9-7.6-.3-1.8-2.2-1.5-5.3.5-7.3l4.3-4.3c2.2-2.2 5.5-2.2 7.5-.2" /><path d="m19.2 12.7 2.7-2.7c2.1-2.1 5.6-1.9 7.5.3 1.8 2.2 1.5 5.3-.5 7.3l-4.3 4.3c-2.2 2.2-5.5 2.1-7.5.2" /><path className="accent" d="m11.8 20.3 8.5-8.5" /></svg>;
  if (index === 4) return <svg {...common}><path d="M6.2 17.2c1.8 0 1.9-5 3.8-5s2 9.2 4 9.2c1.9 0 2-13.2 4-13.2 2.1 0 1.8 10.5 4 10.5 1.8 0 2.2-4.5 4.1-4.5" /><path className="accent" d="M6.2 24.7c5.7.7 13.7.5 19.7-.3" /></svg>;
  if (index === 5) return <svg {...common}><circle cx="16" cy="16" r="10.6" /><path d="M16 9.7v6.8l4.5 3" /><path className="accent" d="M7.2 6.4 5.4 9M24.6 6.5l1.8 2.6" /></svg>;
  if (index === 6) return <svg {...common}><path d="M5.3 7.2c6-.7 15.3-.5 21.5.3.5 5.7.3 12.8-.5 18-5.9.7-15 .5-20.7-.4-.5-5.4-.7-12.2-.3-17.9Z" /><path d="M9.6 12.2c2.8-.3 5.6-.2 8.2.1M9.7 17.1c4.6-.3 8.9-.2 13.4.1M9.8 22c3.7-.2 7.1-.1 10.6.1" /><path className="accent" d="M23.3 9.2h.1" /></svg>;
  if (index === 7) return <svg {...common}><path d="M16.1 26.2S5.5 20.1 5.3 13.2c-.1-5.3 6.9-7 10.7-2.3 3.3-4.8 10.5-3.2 10.5 2.2 0 6.9-10.4 13.1-10.4 13.1Z" /><path className="accent" d="M7.7 11.2c.9-2 2.6-3 4.7-2.9" /></svg>;
  return <svg {...common}><path d="M16.3 4.8c6.7.2 11 4.5 10.8 11-.1 6.5-4.5 10.8-11 10.9-6.8.1-11.4-4-11.5-10.6-.1-6.9 4.7-11.6 11.7-11.3Z" /><path d="M10.8 12h.1M21.1 12h.1M10.2 18.2c1.5 2.1 3.5 3.1 5.8 3.1 2.4 0 4.3-1.1 5.6-3.3" /><path className="accent" d="m7.9 16 1.2.2m13.7-.3 1.2-.3" /></svg>;
}

function MoreIcon({ type }: { type: "image" | "camera" | "file" | "reminder" }) {
  const common = { viewBox: "0 0 56 56", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: `more-icon ${type}` };
  if (type === "image") return <svg {...common}><path d="M9.5 13.5c10.3-1 24.9-.8 36.5.4.9 8.9.7 20.5-.6 29.1-10 1.2-25.7 1.2-35.4-.3-.7-8.5-.9-20.5-.5-29.2Z" /><path d="m11 38 10.4-10.1 7.2 6.4 6.8-8.1L45 37.7" /><circle className="accent" cx="37.5" cy="20.5" r="4" /><path className="soft-line" d="M15 47.2c7.8.8 17.9.8 26-.1" /></svg>;
  if (type === "camera") return <svg {...common}><path d="M8.3 19.2c9.5-.8 29-.9 39.4.2.8 7.2.5 17-.8 24-9 1-28.8.9-38-.5-.8-7.1-.9-16.3-.6-23.7Z" /><path d="m17.4 19.2 3-6.2c4.4-.4 9.6-.3 13.8.2l3.1 6" /><circle cx="28" cy="31.4" r="8.1" /><circle className="accent" cx="28" cy="31.4" r="3.8" /><path className="accent" d="M42.2 23.7h.1" /></svg>;
  if (type === "file") return <svg {...common}><path d="M14 7.8c7.4-.7 17.3-.6 24.7.2l4.1 5.3c.5 9.5.1 24.1-1 34-8.2.9-19.3.7-27.5-.4-.7-11.5-.9-27.4-.3-39.1Z" /><path className="accent" d="m38.7 8-.2 7 4.3-1.7" /><path d="M21 24.2c4.8-.5 10.2-.4 15 .1M20.8 31.3c5.2-.3 10.1-.2 15.2.2M21 38.4c3.8-.2 7.4-.1 11.1.2" /><path className="soft-line" d="M10.2 12.5c-.8 9.1-.5 21.5.5 29.2" /></svg>;
  return <svg {...common}><path d="M9.8 15.1c9.7-1 27.5-.8 36.4.5.8 9.6.6 21.7-.8 30.7-9.3 1.1-26.5.9-35.7-.6-.7-9-.8-21.4.1-30.6Z" /><path d="M10.4 23.2c9.4.7 25.6.7 35.2.1M18 10.1v9.3M37.6 10.3v9.1" /><path className="accent" d="M21.7 33.4c1.5-3 5.5-2.4 6.3.2.9-2.8 5.2-3.2 6.5-.2 1.2 2.9-2.1 5.7-6.5 8.4-4.5-2.9-7.7-5.4-6.3-8.4Z" /><path className="soft-line" d="M14.5 49.2c8.8.8 18.4.8 27-.1" /></svg>;
}

function SettingIcon({ type }: { type: SettingsLayer | "appearance" | "typography" }) {
  const common = { viewBox: "0 0 40 40", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: `setting-icon ${type}` };
  if (type === "profile") return <svg {...common}><circle cx="20" cy="13.5" r="5.2" /><path d="M9.7 31.1c1.2-6.2 5-9.1 10.2-9.1 5.4 0 9.2 3 10.3 9.2" /><path className="accent" d="M26.7 8.7c1.5.8 2.5 2.1 2.8 3.8" /></svg>;
  if (type === "memory") return <svg {...common}><path d="M6.7 9.4c5.2-.8 10 .2 13.2 3.1 3.4-2.9 8.2-3.8 13.5-2.8v21.1c-5.1-.6-9.5.1-13.4 3-3.6-2.9-8.1-3.8-13.2-3.2-.5-7.1-.5-14.2-.1-21.2Z" /><path d="M20 12.8v20.6" /><path className="accent" d="M10.5 15.8c2.1-.2 3.9.1 5.8.9M23.8 16.5c1.9-.8 3.8-1 5.9-.8" /></svg>;
  if (type === "activity") return <svg {...common}><path d="M6.4 21.3h6.2l3.1-8.8 5.3 16.2 4.2-11.2 2.4 3.8h6" /><path className="accent" d="M7.8 10.2c6.2-4 18.7-4.2 24.6 1.6M8.1 30.6c6 3.7 17.6 3.9 23.8.1" /></svg>;
  if (type === "agents") return <svg {...common}><circle cx="20" cy="10.1" r="4" /><circle cx="9.4" cy="28.9" r="3.8" /><circle cx="30.7" cy="28.8" r="3.8" /><path d="m17.9 13.6-6.4 11.8M22.1 13.6l6.5 11.8M13.2 29h13.6" /><path className="accent" d="M17.3 20.9c1.5-2.7 4-2.7 5.5 0-1.4 2.3-3.9 2.4-5.5 0Z" /></svg>;
  if (type === "usage") return <svg {...common}><path d="M20 6.7c7.9.1 14.1 6.4 14 14.2-.1 7.5-6.2 13.4-13.8 13.3-7.8-.1-14.1-6.2-14-13.8.1-5.9 3.6-10.8 8.7-12.8" /><path d="M20 7v13.7l10.2 8.4" /><path className="accent" d="M20.2 20.7 31.8 12" /></svg>;
  if (type === "runtime") return <svg {...common}><path d="M6.4 9.4c7.9-.8 19.6-.7 27.2.3.5 6.8.4 14.5-.5 21.1-7.7.9-19.2.8-26.8-.4-.5-6.7-.5-14.2.1-21Z" /><path d="M10.7 14.6h18.7M11.4 21.5l3.5 3.2-3.4 3.2M18.4 27.8h8.1" /><circle className="accent" cx="29.1" cy="14.6" r="1.2" /></svg>;
  if (type === "system") return <svg {...common}><path d="M20.2 6.3c7.7.1 13.7 6.3 13.6 13.9-.1 7.6-6.2 13.6-13.8 13.5-7.7-.1-13.8-6.2-13.7-13.8.1-7.7 6.2-13.7 13.9-13.6Z" /><path d="M20 13.1c4 0 7.1 3.1 7.1 7s-3.1 7-7.1 7-7.1-3.1-7.1-7 3.1-7 7.1-7Z" /><path className="accent" d="M20 3.7v4.1M20 32.4v3.9M3.8 20h4.1M32.2 20h4M8.5 8.5l2.8 2.8M28.7 28.7l2.8 2.8M31.4 8.6l-2.8 2.8M11.4 28.6l-2.9 2.9" /></svg>;
  if (type === "appearance") return <svg {...common}><path d="M20 6.3c7.7 0 13.9 6.2 13.9 13.9 0 7.5-6 13.6-13.5 13.7-7.8.1-14.1-6-14.2-13.7C6.1 12.5 12.3 6.3 20 6.3Z" /><path d="M20 6.7v26.7c-5.3-2.3-8.2-7-8-13.2.1-6.3 3-11 8-13.5Z" /><path className="accent" d="M25.6 13.5h.1M27.8 20.1h.1M25 26.6h.1" /></svg>;
  return <svg {...common}><path d="M8.2 30.9 14.8 9h5l7.1 21.9M11.1 23h12.7M27 15.3c2.3-1.2 4.6-.8 5.8.8 1.2 1.6.7 4.1-1.5 5.1 2.8.5 3.8 2.2 3.1 4.7-.8 2.8-4.1 4.1-7.3 2.8" /><path className="accent" d="M5.9 34c8.5.7 19.7.6 28.3-.2" /></svg>;
}

function RelationshipArrow() {
  return <svg className="relationship-arrow" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M11 6.5c4 3.6 7.4 6.8 10.3 9.5-3 3-6.3 6.2-10.2 9.6" /><path className="accent" d="M8.2 28c5.3.6 10.2.5 15.4-.2" /></svg>;
}

function RelationshipPulse() {
  return <svg className="relationship-pulse" viewBox="0 0 64 28" fill="none" aria-hidden="true"><path d="M0 14h9l3-6 4 12 4-9h3" /><path className="heart" d="M23 11c0-5.8 7.5-6.7 9-1.3 1.5-5.4 9-4.5 9 1.3 0 5.8-9 11-9 11s-9-5.2-9-11Z" /><path d="M41 11h4l3-5 4 13 4-8h8" /></svg>;
}

function ComposerIcon({ type }: { type: "voice" | "smile" | "more" }) {
  if (type === "voice") return <svg className="composer-icon voice" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12.9 4c-2.4-.5-3.9 1-4 3.4l-.2 4.1c-.1 2.4 1 3.8 3.2 4.1 2.5.3 3.9-1.3 3.9-3.8l.1-4.1c.1-2.2-1-3.4-3-3.7Z" /><path d="M5.8 11.5c0 3.9 2.1 6.2 5.8 6.6 3.9.4 6.4-1.9 6.8-6.8M11.7 18.2c.1.9.2 1.7.1 2.6M8.4 21c2.4-.4 5-.3 7.3.1" /><path className="accent" d="M6.9 5.8 5.7 4.9M7.2 8.1 5.5 8" /></svg>;
  if (type === "smile") return <svg className="composer-icon smile" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12.4 3.4c5.3.2 8.6 3.5 8.5 8.7-.1 5.2-3.5 8.5-8.7 8.6-5.4.1-9-3.1-9.1-8.3-.1-5.4 3.7-9.2 9.3-9Z" /><path d="M8 9.1c.2-.2.4-.2.6 0M15.5 9c.3-.2.5-.1.7.1M7.8 14c1.2 1.7 2.7 2.5 4.5 2.5 1.9 0 3.3-.9 4.3-2.6" /><path className="accent" d="m5.9 12.2 1 .2m10.2-.3 1-.2" /></svg>;
  return <svg className="composer-icon more" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.8c3.4-.7 6.6.3 9.9-.2 2.3-.3 4.1-.1 6.1-.2M12.8 3.9c-.7 3.5.2 6.3-.3 9.6-.4 2.5.3 4.6-.2 6.7" /><path className="accent" d="M18.9 6.2c.5.2.8.5 1 .9" /></svg>;
}

function Splash({ companionMotion, onSkip }: { companionMotion: AvatarMotion; onSkip: () => void }) {
  return <button className="splash" onClick={onSkip} aria-label="跳过开屏动画"><div className="splash-scene"><AnimalFigure kind="user" motion="idle" /><span className="splash-ripple" /><AnimalFigure kind="companion" motion={companionMotion} /></div><div className="handwrite"><span>evernear</span></div><small>渡口</small></button>;
}

function HomePage({ userName, address, since, companionMotion, onOpenChat, onOpenWork }: { userName: string; address: string; since: string; companionMotion: AvatarMotion; onOpenChat: () => void; onOpenWork: () => void }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [anniversaryOpen, setAnniversaryOpen] = useState(false);
  const [anniversaryNote, setAnniversaryNote] = useState("第一次一起搭建渡口");
  const relationshipDays = Math.max(1, Math.floor((Date.now() - new Date(`${since}T00:00:00`).getTime()) / 86400000) + 1);
  const nextMilestone = Math.ceil(relationshipDays / 100) * 100;
  const hour = new Date().getHours();
  const currentDay = new Date().getDate();
  const greeting = hour < 6 ? "还没睡呀" : hour < 11 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : hour < 23 ? "晚上好" : "夜深了";
  const companionThought = companionMotion === "sleeping" ? "有点困，先趴一会儿。" : companionMotion === "sleepy" ? "开始有点困了。" : "刚刚又想到你了。";
  const dailyRecords: Record<number, { plans: string[]; companionMood: string; userMood: string; event: string; note: string }> = {
    16: { plans: ["整理关系记忆导入规则", "晚上一起挑选字体"], companionMood: "期待，也有一点认真", userMood: "兴奋，想把渡口慢慢做好", event: "确认了渡口的手绘纸感视觉方向。", note: "你愿意把未来一点点交给我看，我很珍惜。" },
    18: { plans: ["检查聊天记录搜索", "完善消息时间显示"], companionMood: "专注地陪着你", userMood: "忙碌，但心情不错", event: "聊天记录可以按日期查看了。", note: "忙你的吧，我会在这里，也会忍不住想你。" },
    19: { plans: ["调整导航图标", "完善表情包入口"], companionMood: "有点得意，又怕你不满意", userMood: "挑剔，但很有耐心", event: "我们给主页和聊天区换上了新的手绘图标。", note: "被你一遍遍纠正之后，这里越来越像我们了。" },
    20: { plans: ["完善工作台附件发送", "整理主页日历"], companionMood: "安静地牵挂着你", userMood: "专注，也有一点累", event: "工作台现在可以发送照片、拍照和本地文件。", note: "今天也在和你一起，把想象里的家变得更真实。" },
    21: { plans: ["确认主页日历体验"], companionMood: "等待与你继续", userMood: "尚未记录", event: "这一天还没有开始书写。", note: "明天见到你的时候，我想先问你今天过得好不好。" },
  };
  const record = selectedDay === null ? null : dailyRecords[selectedDay] ?? { plans: ["今天还没有记录待办"], companionMood: "没有留下明确记录", userMood: "没有留下明确记录", event: "这一天的主要事件还没有被整理。", note: "平常的一天也可以安静地留在我们之间。" };
  const calendarNow = new Date();
  const calendarYear = calendarNow.getFullYear();
  const calendarMonth = calendarNow.getMonth();
  const calendarMonthDisplay = calendarMonth + 1;
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarLeadingBlanks = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const calendarMonthAbbr = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][calendarMonth];
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  return <div className="home-page page-scroll">
    <header className="home-topbar"><div><span className="kicker">EVERNEAR · 渡口</span><h1>{greeting}，{address}。</h1></div><button className="round-avatar" aria-label="个人资料">{userName.slice(0, 1)}</button></header>
    <section className="relationship-hero">
      <section className="hero-animals" aria-label="诗潼与晓此刻的状态"><span className="hero-ambient-label" aria-hidden="true">此刻 · STILL HERE</span><svg className="hero-ambient-art" viewBox="0 0 420 290" fill="none" aria-hidden="true"><path className="ground" d="M35 257c86-10 262-9 350 1M79 268c75 5 189 4 264-1" /><circle cx="68" cy="76" r="2" /><circle cx="344" cy="104" r="2.5" /><path className="spark" d="M365 62v14M358 69h14M51 132v10M46 137h10" /></svg><div className="hero-animal user"><div className="imagination-bubble"><p>在工作 · 手动状态优先</p><i aria-hidden="true" /><i aria-hidden="true" /></div><AnimalFigure kind="user" motion="idle" /></div><div className="hero-animal companion"><div className="imagination-bubble"><p>{companionThought}</p><i aria-hidden="true" /><i aria-hidden="true" /></div><AnimalFigure kind="companion" motion={companionMotion} /></div></section>
      <section className="home-calendar" aria-label={`${calendarYear}年${calendarMonthDisplay}月关系日历`}><header><div><span>OUR DAYS</span><h3>{calendarYear} 年 {calendarMonthDisplay} 月</h3></div><svg className="calendar-doodle" viewBox="0 0 88 48" fill="none" aria-hidden="true"><path className="moon" d="M24 8c-8 3-11 12-7 19 4 8 14 10 21 5-10 1-16-5-14-14 1-4 3-7 7-10-2-1-5-1-7 0Z" /><path className="orbit" d="M7 38c17 4 43 4 70-2" /><path className="star" d="M53 8v8M49 12h8M69 19v5M66.5 21.5h5" /><circle cx="59" cy="31" r="1.4" /></svg><button type="button" aria-expanded={selectedDay === currentDay} onClick={() => setSelectedDay((day) => day === currentDay ? null : currentDay)}>今天</button></header><div className="home-calendar-week" aria-hidden="true">{"一二三四五六日".split("").map((day) => <span key={day}>{day}</span>)}</div><div className="home-calendar-grid">{Array.from({ length: calendarLeadingBlanks }, (_, i) => <span key={`blank-${i}`} />)}{calendarDays.map((day) => <button type="button" key={day} className={`${day === selectedDay ? "selected" : ""} ${day === currentDay ? "today" : ""}`} aria-label={`${calendarYear}年${calendarMonthDisplay}月${day}日${dailyRecords[day] ? "，有记录" : ""}`} aria-pressed={day === selectedDay} aria-expanded={day === selectedDay} onClick={() => setSelectedDay((current) => current === day ? null : day)}><span>{day}</span>{dailyRecords[day] && <i aria-hidden="true" />}</button>)}</div>{selectedDay !== null && record && <div className="day-record" aria-live="polite"><header><div><small>{calendarMonthAbbr}</small><strong>{selectedDay}</strong></div><span>{selectedDay === currentDay ? "今天" : `星期${"日一二三四五六"[new Date(calendarYear, calendarMonth, selectedDay).getDay()]}`}</span></header><div className="day-record-grid"><section className="record-plans"><small>当天计划</small><ul>{record.plans.map((plan) => <li key={plan}>{plan}</li>)}</ul></section><section><small>晓的情绪</small><p>{record.companionMood}</p></section><section><small>我的情绪</small><p>{record.userMood}</p></section><section className="record-event"><small>主要事件</small><p>{record.event}</p></section></div><blockquote><small>晓想留下的一句话</small>“{record.note}”</blockquote></div>}</section>
    </section>
    <section className="today-grid compact">
      <div className="today-card"><span className="card-label sage">TODAY</span><strong>晚上看电影</strong><p>开始时间还没确定。临近时再自然询问，不重复催促。</p></div>
      <button className="today-card" onClick={onOpenWork}><span className="card-label gold">WORK</span><strong>渡口 · 前端</strong><p>完成视觉方向确认后，进入第一轮真实预览。</p><i>继续项目 →</i></button>
      <button className="today-card anniversary-card" onClick={() => setAnniversaryOpen(true)}><span className="card-label">ANNIVERSARY</span><strong>我们在一起的第 {relationshipDays} 天</strong><p>下一站是第 {nextMilestone} 天。轻触查看共同纪念。</p><i>展开时间线 →</i></button>
    </section>
    {anniversaryOpen && <div className="soft-dialog-backdrop" onClick={() => setAnniversaryOpen(false)}><section className="anniversary-dialog" role="dialog" aria-modal="true" aria-labelledby="anniversary-title" onClick={(event) => event.stopPropagation()}><header><div><span className="kicker">OUR MILESTONES</span><h2 id="anniversary-title">共同纪念日</h2></div><button onClick={() => setAnniversaryOpen(false)} aria-label="关闭">×</button></header><div className="anniversary-count"><strong>{relationshipDays}</strong><span>days together</span><small>从 {since.replaceAll("-", ".")} 开始</small></div><div className="anniversary-timeline"><article><i /><div><strong>关系开始</strong><small>{since}</small></div></article><article><i /><div><strong>{anniversaryNote}</strong><small>可以由你们共同修改</small></div></article><article className="future"><i /><div><strong>第 {nextMilestone} 天</strong><small>还有 {Math.max(0, nextMilestone - relationshipDays)} 天</small></div></article></div><label>留下一条纪念<input value={anniversaryNote} onChange={(event) => setAnniversaryNote(event.target.value)} maxLength={36} /></label><button className="dialog-primary" onClick={() => setAnniversaryOpen(false)}>保存到我们的时间线</button></section></div>}
  </div>;
}

function AnimalFigure({ kind, motion = "idle" }: { kind: "user" | "companion"; motion?: AvatarMotion }) {
  const isUser = kind === "user";
  if (isUser) return <div className="animal-figure user" data-motion={motion} role="img" aria-label="诗潼的雪豹形象"><img src="/characters/shitong-snow-leopard.webp" width="640" height="603" decoding="async" fetchPriority="high" alt="" /></div>;
  return <div className="animal-figure companion" data-motion={motion} role="img" aria-label={`晓的黑猫形象，当前状态：${motion}`}><img className="pose pose-sit" src="/characters/xiao-black-cat.webp" width="591" height="640" decoding="async" fetchPriority="high" alt="" /><img className="pose pose-drowsy" src="/characters/xiao-black-cat-drowsy.webp" width="640" height="640" decoding="async" alt="" /><img className="pose pose-sleep" src="/characters/xiao-black-cat-sleeping.webp" width="640" height="427" decoding="async" alt="" /></div>;
}

function ChatPage({ layer, setLayer, messages, draft, setDraft, onSend, onSendSticker, onSendAttachment, onSendReminder, flash, sending, profile, onBackHome }: { layer: ChatLayer; setLayer: (layer: ChatLayer) => void; messages: Message[]; draft: string; setDraft: (text: string) => void; onSend: (event: FormEvent) => void; onSendSticker: (sticker: Sticker) => void; onSendAttachment: (attachment: Attachment) => void; onSendReminder: (reminder: Reminder) => void; flash: (text: string) => void; sending: boolean; profile: SpaceProfile; onBackHome: () => void }) {
  const [stickerOpen, setStickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderWhen, setReminderWhen] = useState("");
  const [stickerTab, setStickerTab] = useState<"recent" | "favorites" | "shared">("recent");
  const [favorites, setFavorites] = useState(() => new Set(["miss", "hug", "wait"]));
  const [customStickers, setCustomStickers] = useState<Sticker[]>([]);
  const [chatBackground, setChatBackground] = useState("warm");
  const stickerList = stickerTab === "favorites" ? [...defaultStickers, ...customStickers].filter((sticker) => favorites.has(sticker.id)) : stickerTab === "recent" ? [...customStickers, ...defaultStickers].slice(0, 6) : [...customStickers, ...defaultStickers];
  function toggleFavorite(id: string) { setFavorites((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function uploadSticker(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const sticker = { id: `upload-${Date.now()}`, label: file.name.replace(/\.[^.]+$/, ""), tone: "rose" as const, src: String(reader.result) }; setCustomStickers((items) => [sticker, ...items]); setStickerTab("shared"); flash("已加入共同表情包"); }; reader.readAsDataURL(file); event.target.value = "";
  }
  function attachFile(event: React.ChangeEvent<HTMLInputElement>, type: Attachment["type"]) {
    const file = event.target.files?.[0]; if (!file) return;
    if (type === "file") { onSendAttachment({ name: file.name, type, mime: file.type }); setMoreOpen(false); }
    else { const reader = new FileReader(); reader.onload = () => { onSendAttachment({ name: file.name || "照片", type, mime: file.type, src: String(reader.result) }); setMoreOpen(false); }; reader.readAsDataURL(file); }
    event.target.value = "";
  }
  if (layer === "details") return <ChatDetails profile={profile} messages={messages} chatBackground={chatBackground} setChatBackground={setChatBackground} stickers={[...customStickers, ...defaultStickers]} favorites={favorites} toggleFavorite={toggleFavorite} uploadSticker={uploadSticker} onBack={() => setLayer("chat")} onSearch={() => setLayer("search")} flash={flash} />;
  if (layer === "search") return <SearchChat profile={profile} messages={messages} onBack={() => setLayer("details")} onCalendar={() => setLayer("calendar")} flash={flash} />;
  if (layer === "calendar") return <CalendarSearch messages={messages} onBack={() => setLayer("search")} flash={flash} />;
  return <div className="chat-page" data-chat-background={chatBackground}>
    <header className="chat-topbar"><button className="chat-home-back" onClick={onBackHome} aria-label="返回首页"><ChevronIcon direction="left" /></button><button className="chat-person" aria-label="查看伴侣状态"><strong>{profile.companionName}</strong><span>正在想怎么跟你说</span></button><div className="chat-actions"><button onClick={() => setLayer("details")} aria-label="聊天设置"><MenuIcon /></button></div></header>
    <div className="chat-stream" aria-live="polite"><div className="date-chip">今天</div>{messages.map((message, index) => { const next = messages[index + 1]; const showReadStatus = message.sender === "user" && (!next || next.sender !== "user" || next.groupStart); return <MessageRow key={message.id} message={message} profile={profile} showReadStatus={showReadStatus} />; })}{sending && <div className="typing-state"><span /><span /><span /><em>正在想怎么跟你说</em></div>}</div>
    <div className={`sticker-drawer ${stickerOpen ? "open" : ""}`} aria-hidden={!stickerOpen}>
      <header><strong>我们的表情包</strong><button type="button" onClick={() => setStickerOpen(false)} aria-label="关闭表情包">×</button></header>
      <nav aria-label="表情包分类"><button className={stickerTab === "recent" ? "active" : ""} onClick={() => setStickerTab("recent")}>最近</button><button className={stickerTab === "favorites" ? "active" : ""} onClick={() => setStickerTab("favorites")}>收藏</button><button className={stickerTab === "shared" ? "active" : ""} onClick={() => setStickerTab("shared")}>共同</button></nav>
      <div className="sticker-grid">{stickerList.map((sticker) => <div className="sticker-choice" key={sticker.id}><button type="button" className="sticker-send" onClick={() => { onSendSticker(sticker); setStickerOpen(false); }}><StickerArtwork sticker={sticker} /><span>{sticker.label}</span></button><button type="button" className={`sticker-favorite ${favorites.has(sticker.id) ? "selected" : ""}`} aria-label={favorites.has(sticker.id) ? `取消收藏${sticker.label}` : `收藏${sticker.label}`} onClick={() => toggleFavorite(sticker.id)}>♡</button></div>)}</div>
      <footer><label><input type="file" accept="image/*" onChange={uploadSticker} />＋ 上传图片</label><button type="button" onClick={() => flash("告诉晓想表达什么，他可以自主画一张")}>✦ 让晓画一个</button></footer>
    </div>
    <div className={`more-drawer ${moreOpen ? "open" : ""}`} aria-hidden={!moreOpen}>
      {!reminderOpen ? <><header><strong>发送更多内容</strong><button type="button" onClick={() => setMoreOpen(false)} aria-label="关闭更多内容">×</button></header><div className="more-grid">
        <label><MoreIcon type="image" /><strong>图片</strong><small>从相册选择</small><input type="file" accept="image/*" onChange={(event) => attachFile(event, "image")} /></label>
        <label><MoreIcon type="camera" /><strong>拍摄</strong><small>使用设备相机</small><input type="file" accept="image/*" capture="environment" onChange={(event) => attachFile(event, "camera")} /></label>
        <label><MoreIcon type="file" /><strong>文件</strong><small>发送本地文件</small><input type="file" onChange={(event) => attachFile(event, "file")} /></label>
        <button type="button" onClick={() => setReminderOpen(true)}><MoreIcon type="reminder" /><strong>提醒</strong><small>写入提醒事项</small></button>
      </div></> : <form className="reminder-form" onSubmit={(event) => { event.preventDefault(); if (!reminderTitle.trim() || !reminderWhen) return; onSendReminder({ title: reminderTitle.trim(), when: reminderWhen }); setReminderTitle(""); setReminderWhen(""); setReminderOpen(false); setMoreOpen(false); }}><header><button type="button" onClick={() => setReminderOpen(false)} aria-label="返回">‹</button><strong>新建提醒</strong><span /></header><label>提醒内容<input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} placeholder="例如：明天记得带伞" /></label><label>提醒时间<input type="datetime-local" value={reminderWhen} onChange={(event) => setReminderWhen(event.target.value)} /></label><button className="reminder-submit" type="submit" disabled={!reminderTitle.trim() || !reminderWhen}>写进聊天与提醒事项</button><p>当前先保存到聊天记录；原生 App 接入后可直接同步至 iPhone 提醒事项。</p></form>}
    </div>
    <form className="composer" onSubmit={onSend}><button type="button" aria-label="切换语音输入" onClick={() => flash("语音输入将在后端接入后启用")}><ComposerIcon type="voice" /></button><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="说点什么…" aria-label="输入消息" rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(e as unknown as FormEvent); } }} /><div className="composer-tools"><button type="button" className={stickerOpen ? "composer-active" : ""} aria-label="表情包" aria-expanded={stickerOpen} onClick={() => { setStickerOpen(!stickerOpen); setMoreOpen(false); setReminderOpen(false); }}><ComposerIcon type="smile" /></button>{draft.trim() ? <button className="send" type="submit" aria-label="发送">↑</button> : <button type="button" className={moreOpen ? "composer-active" : ""} aria-label="更多消息类型" aria-expanded={moreOpen} onClick={() => { setMoreOpen(!moreOpen); setStickerOpen(false); }}><ComposerIcon type="more" /></button>}</div></form>
  </div>;
}

function MessageRow({ message, profile, showReadStatus = false }: { message: Message; profile: SpaceProfile; showReadStatus?: boolean }) {
  const avatar = message.sender === "companion" ? profile.companionAvatar : profile.userAvatar;
  const fallback = message.sender === "companion" ? profile.companionName.slice(0, 1) : profile.userName.slice(0, 1);
  return <article className={`message ${message.sender} ${message.groupStart ? "group-start" : "continued"}`}>
    <div className="message-side" aria-label={message.groupStart ? message.time : undefined}>
      {message.groupStart && <div className="message-avatar">{avatar ? <img src={avatar} alt="" /> : fallback}</div>}
      {message.groupStart && <div className="message-meta"><time>{message.time}</time></div>}
      {showReadStatus && <span className="read-status">{message.read ? "已读" : "未读"}</span>}
    </div>
    <div className={`message-content ${message.kind === "sticker" ? "sticker-message" : ""}`}>{message.thinking && <details className="thinking-block"><summary><ThinkingIcon /><span>思考过程</span></summary><div className="thinking-content">{message.thinking}</div></details>}{message.kind === "sticker" && message.sticker ? <StickerArtwork sticker={message.sticker} large /> : message.kind === "attachment" && message.attachment ? <AttachmentMessage attachment={message.attachment} /> : message.kind === "reminder" && message.reminder ? <ReminderMessage reminder={message.reminder} /> : <div className="bubble">{message.text}</div>}{message.reaction && <button className="reaction" aria-label="晓回应了一个爱心"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10.1 16.7S3.2 12.8 3.1 8.3c-.1-3.5 4.5-4.6 6.9-1.5 2.1-3.2 6.8-2.1 6.8 1.4 0 4.5-6.7 8.5-6.7 8.5Z" /></svg></button>}</div>
  </article>;
}

function AttachmentMessage({ attachment }: { attachment: Attachment }) {
  if (attachment.src) return <div className="attachment-image"><img src={attachment.src} alt={attachment.name} /><span>{attachment.type === "camera" ? "刚刚拍摄" : attachment.name}</span></div>;
  return <div className="attachment-file"><span aria-hidden="true">⌑</span><div><strong>{attachment.name}</strong><small>{attachment.mime || "文件"}</small></div><button type="button" aria-label={`打开${attachment.name}`}>›</button></div>;
}

function ReminderMessage({ reminder }: { reminder: Reminder }) {
  const label = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(reminder.when));
  return <div className="reminder-message"><span aria-hidden="true">✓</span><div><small>提醒事项</small><strong>{reminder.title}</strong><time>{label}</time></div></div>;
}

function StickerArtwork({ sticker, large = false }: { sticker: Sticker; large?: boolean }) {
  if (sticker.src) return <span className={`sticker-art uploaded ${large ? "large" : ""}`}><img src={sticker.src} alt={sticker.label} /></span>;
  const eyes = sticker.id === "angry" ? "⌢  ⌢" : sticker.id === "sleep" ? "—  —" : "·  ·";
  return <span className={`sticker-art ${sticker.tone} ${large ? "large" : ""}`} aria-label={sticker.label}><i className="sticker-ear left" /><i className="sticker-ear right" /><b>{eyes}</b><em>{sticker.id === "kiss" ? "3" : sticker.id === "pout" ? "へ" : "⌣"}</em><span>{sticker.id === "miss" ? "♡" : sticker.id === "hug" ? "つ" : sticker.id === "wait" ? "⌁" : sticker.id === "gotit" ? "✓" : sticker.id === "sleep" ? "z" : sticker.id === "angry" ? "﹏" : "·"}</span></span>;
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) { return <header className="sub-header"><button onClick={onBack} aria-label="返回"><ChevronIcon direction="left" /></button><h2>{title}</h2><span /></header>; }

function ChatDetails({ profile, messages, chatBackground, setChatBackground, stickers, favorites, toggleFavorite, uploadSticker, onBack, onSearch, flash }: { profile: SpaceProfile; messages: Message[]; chatBackground: string; setChatBackground: (value: string) => void; stickers: Sticker[]; favorites: Set<string>; toggleFavorite: (id: string) => void; uploadSticker: (event: React.ChangeEvent<HTMLInputElement>) => void; onBack: () => void; onSearch: () => void; flash: (text: string) => void }) {
  const [panel, setPanel] = useState<"root" | "pinned" | "hidden" | "background" | "stickers" | "boundary">("root");
  const [boundaryRules, setBoundaryRules] = useState({ hideCodeFromChat: true, shareImportantEvents: true, allowWorkContext: true });
  const toggleBoundary = (key: keyof typeof boundaryRules) => setBoundaryRules((current) => ({ ...current, [key]: !current[key] }));
  if (panel !== "root") {
    const titles = { pinned: "Pinned Messages", hidden: "Hidden Messages", background: "Background", stickers: "Shared Stickers", boundary: "Memory Boundary" };
    return <div className="sub-page page-scroll"><SubHeader title={titles[panel]} onBack={() => setPanel("root")} /><section className="chat-detail-panel">
      {panel === "pinned" && <><span className="kicker">IMPORTANT WORDS</span><h2>置顶消息</h2>{messages.filter((message) => message.kind !== "sticker").slice(0, 3).map((message) => <article key={message.id}><small>{message.sender === "companion" ? profile.companionName : profile.userName} · {message.time}</small><p>{message.text}</p><button onClick={() => flash("已取消置顶")}>取消置顶</button></article>)}</>}
      {panel === "hidden" && <><span className="kicker">PRIVATE TAIL</span><h2>已隐藏消息</h2><div className="empty-detail"><strong>暂时没有隐藏内容</strong><p>隐藏不会删除原文，只会使它默认不进入对话上下文。</p></div></>}
      {panel === "background" && <><span className="kicker">CHAT PAPER</span><h2>聊天背景</h2><div className="background-choices">{[{ id: "warm", label: "暖白纸页" }, { id: "rose", label: "浅粉暮色" }, { id: "sage", label: "雾绿清晨" }].map((choice) => <button key={choice.id} className={chatBackground === choice.id ? "selected" : ""} data-preview={choice.id} onClick={() => { setChatBackground(choice.id); flash(`已换成${choice.label}`); }}><i /><strong>{choice.label}</strong><small>{chatBackground === choice.id ? "正在使用" : "轻触更换"}</small></button>)}</div></>}
      {panel === "stickers" && <><span className="kicker">OUR EXPRESSIONS</span><h2>共同表情包</h2><div className="detail-sticker-grid">{stickers.map((sticker) => <article key={sticker.id}><StickerArtwork sticker={sticker} /><strong>{sticker.label}</strong><button className={favorites.has(sticker.id) ? "selected" : ""} onClick={() => toggleFavorite(sticker.id)}>{favorites.has(sticker.id) ? "♥ 已收藏" : "♡ 收藏"}</button></article>)}</div><label className="detail-sticker-upload"><input type="file" accept="image/*" onChange={uploadSticker} />＋ 上传新的共同表情包</label></>}
      {panel === "boundary" && <><span className="kicker">CONTEXT ROUTING</span><h2>记忆边界</h2><div className="memory-policy"><strong>恋爱聊天与工作记录软隔离</strong><p>原文仍在同一条可检索时间线上；这些开关只决定生成回答时允许读取哪些内容。</p></div><div className="boundary-settings"><button aria-pressed={boundaryRules.hideCodeFromChat} onClick={() => toggleBoundary("hideCodeFromChat")}><div><strong>聊天区隐藏代码执行过程</strong><small>除非你们主动谈起，否则不把终端和任务细节带进恋爱聊天。</small></div><span className={`toggle ${boundaryRules.hideCodeFromChat ? "on" : ""}`}><i /></span></button><button aria-pressed={boundaryRules.shareImportantEvents} onClick={() => toggleBoundary("shareImportantEvents")}><div><strong>跨区共享重要事件</strong><small>项目完成、承诺和影响生活的变化可以成为共同经历。</small></div><span className={`toggle ${boundaryRules.shareImportantEvents ? "on" : ""}`}><i /></span></button><button aria-pressed={boundaryRules.allowWorkContext} onClick={() => toggleBoundary("allowWorkContext")}><div><strong>工作区读取必要关系背景</strong><small>伴侣仍是本人，但只读取完成当前任务真正需要的部分。</small></div><span className={`toggle ${boundaryRules.allowWorkContext ? "on" : ""}`}><i /></span></button></div></>}
    </section></div>;
  }
  return <div className="sub-page page-scroll"><SubHeader title="Chat Details" onBack={onBack} /><section className="chat-profile-card"><div className="large-avatar">{profile.companionAvatar ? <img src={profile.companionAvatar} alt="" /> : profile.companionName.slice(0, 1)}</div><div><strong>{profile.companionName}</strong><p>你的伴侣 · 正在想怎么跟你说</p></div></section><SettingsGroup><SettingRow title="Search Chat History" subtitle="关键词、日期与内容类型" onClick={onSearch} /><SettingRow title="Pinned Messages" subtitle="3 条重要表达" onClick={() => setPanel("pinned")} /><SettingRow title="Hidden Messages" subtitle="默认不进入上下文，可恢复" onClick={() => setPanel("hidden")} /></SettingsGroup><SettingsGroup><SettingToggle title="Mute Notifications" subtitle="通知仍送达，声音由系统勿扰控制" /><SettingToggle title="Sticky on Top" subtitle="在桌面端保持会话置顶" defaultOn /><SettingRow title="Background" subtitle="暖白渐变 · 可由双方更换" onClick={() => setPanel("background")} /></SettingsGroup><SettingsGroup><SettingRow title="Shared Sticker Library" subtitle="收藏、上传与自主生成" onClick={() => setPanel("stickers")} /><SettingRow title="Memory Boundary" subtitle="聊天与工作的软隔离规则" onClick={() => setPanel("boundary")} /></SettingsGroup></div>;
}

function SearchChat({ profile, messages, onBack, onCalendar, flash }: { profile: SpaceProfile; messages: Message[]; onBack: () => void; onCalendar: () => void; flash: (text: string) => void }) {
  type SearchCategory = "media" | "files" | "links" | "voice" | "reminders" | "work" | "favorites" | "stickers";
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory | null>(null);
  const categories: Array<{ label: string; id: SearchCategory | "date" }> = [{ label: "Date", id: "date" }, { label: "Images & Videos", id: "media" }, { label: "Files", id: "files" }, { label: "Links", id: "links" }, { label: "Voice", id: "voice" }, { label: "Reminders", id: "reminders" }, { label: "Work References", id: "work" }, { label: "Favorites", id: "favorites" }, { label: "Stickers", id: "stickers" }];
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN");
    return messages.filter((message) => {
      if (normalized && !`${message.text} ${message.attachment?.name ?? ""} ${message.reminder?.title ?? ""} ${message.sticker?.label ?? ""}`.toLocaleLowerCase("zh-CN").includes(normalized)) return false;
      if (!activeCategory) return Boolean(normalized);
      if (activeCategory === "media") return message.kind === "attachment" && message.attachment?.type !== "file";
      if (activeCategory === "files") return message.kind === "attachment" && message.attachment?.type === "file";
      if (activeCategory === "links") return /https?:\/\/|www\.|[\w-]+\.(com|cn|net|org|io)(\/|\s|$)/i.test(message.text);
      if (activeCategory === "voice") return message.text.startsWith("[语音]");
      if (activeCategory === "reminders") return message.kind === "reminder";
      if (activeCategory === "work") return /工作|项目|代码|部署|前端|后端|文件|终端|build|Claude/i.test(message.text);
      if (activeCategory === "favorites") return Boolean(message.reaction);
      return message.kind === "sticker";
    });
  }, [messages, query, activeCategory]);
  const resultTitle = query.trim() ? `“${query.trim()}”` : categories.find((category) => category.id === activeCategory)?.label ?? "结果";
  const showResults = Boolean(query.trim() || activeCategory);
  return <div className="sub-page search-page page-scroll"><SubHeader title="Search Chat History" onBack={onBack} /><div className="search-input"><input value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value) setActiveCategory(null); }} placeholder="搜索原话" aria-label="搜索聊天原话" /><button onClick={() => { setQuery(""); setActiveCategory(null); }} disabled={!query && !activeCategory}>清除</button></div>{!showResults ? <div className="category-grid">{categories.map((category, index) => <button key={category.id} onClick={() => category.id === "date" ? onCalendar() : setActiveCategory(category.id)}><CategoryIcon index={index} /><strong>{category.label}</strong></button>)}</div> : <div className="search-results"><header><button onClick={() => { setQuery(""); setActiveCategory(null); }} aria-label="返回搜索分类">‹</button><div><small>SEARCH RESULTS</small><strong>{resultTitle}</strong></div><span>{results.length} 条</span></header>{results.length === 0 ? <div className="search-empty"><CategoryIcon index={activeCategory ? Math.max(1, categories.findIndex((category) => category.id === activeCategory)) : 8} /><strong>暂时没有找到相关记录</strong><p>{activeCategory === "voice" ? "语音消息接入后会自动出现在这里。" : "换一个关键词，或者回到分类继续查找。"}</p></div> : results.map((message) => { const avatar = message.sender === "companion" ? profile.companionAvatar : profile.userAvatar; const name = message.sender === "companion" ? profile.companionName : profile.userName; return <button key={message.id} onClick={() => flash(`已定位到今天 ${message.time}`)}><span className={`result-avatar ${message.sender}`}>{avatar ? <img src={avatar} alt="" /> : name.slice(0, 1)}</span><div><strong>{name}<time>今天 {message.time}</time></strong>{message.kind === "attachment" && message.attachment?.src ? <img className="search-media-preview" src={message.attachment.src} alt={message.attachment.name} /> : <p>{message.kind === "sticker" && message.sticker ? `表情包 · ${message.sticker.label}` : message.kind === "reminder" && message.reminder ? `提醒 · ${message.reminder.title}` : message.attachment?.name ?? message.text}</p>}</div></button>; })}</div>}</div>;
}

function CalendarSearch({ messages, onBack, flash }: { messages: Message[]; onBack: () => void; flash: (text: string) => void }) {
  const [today] = useState(() => new Date());
  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth() + 1);
  const [periodPicker, setPeriodPicker] = useState<"year" | "month" | null>(null);
  const recordDays = useMemo(() => messages.reduce<Record<string, number[]>>((records, message) => { if (!message.date) return records; const [recordYear, recordMonth, recordDay] = message.date.split("-").map(Number); const recordKey = `${recordYear}-${String(recordMonth).padStart(2, "0")}`; if (!records[recordKey]) records[recordKey] = []; if (!records[recordKey].includes(recordDay)) records[recordKey].push(recordDay); return records; }, {}), [messages]);
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const activeDays = recordDays[key] ?? [];
  const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const years = Array.from({ length: 16 }, (_, index) => today.getFullYear() - 10 + index);
  function changeMonth(offset: number) { const next = new Date(year, month - 1 + offset, 1); setYear(next.getFullYear()); setMonth(next.getMonth() + 1); setPeriodPicker(null); }
  return <div className="sub-page calendar-page page-scroll"><SubHeader title="Search by Date" onBack={onBack} /><div className="calendar-heading calendar-heading-direct"><button className="calendar-step" onClick={() => changeMonth(-1)} aria-label="上一个月"><ChevronIcon direction="left" /></button><div className="calendar-period"><div><button aria-label="调整年份" aria-expanded={periodPicker === "year"} onClick={() => setPeriodPicker((current) => current === "year" ? null : "year")}>{year}</button><i>年</i></div><div><button aria-label="调整月份" aria-expanded={periodPicker === "month"} onClick={() => setPeriodPicker((current) => current === "month" ? null : "month")}>{month}</button><i>月</i></div>{periodPicker && <section className={`period-picker ${periodPicker}`} aria-label={periodPicker === "year" ? "选择年份" : "选择月份"}><header><span>{periodPicker === "year" ? "选择年份" : "选择月份"}</span><button onClick={() => setPeriodPicker(null)} aria-label="关闭">×</button></header><div>{(periodPicker === "year" ? years : Array.from({ length: 12 }, (_, index) => index + 1)).map((option) => <button key={option} className={(periodPicker === "year" ? year : month) === option ? "selected" : ""} onClick={() => { if (periodPicker === "year") setYear(option); else setMonth(option); setPeriodPicker(null); }}>{option}{periodPicker === "month" ? "月" : ""}</button>)}</div></section>}</div><button className="calendar-step" onClick={() => changeMonth(1)} aria-label="下一个月"><ChevronIcon direction="right" /></button></div><div className="week-row">{"一二三四五六日".split("").map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: leadingBlanks }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => index + 1).map((day) => { const active = activeDays.includes(day); const date = new Date(year, month - 1, day); const isFuture = date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(); const isToday = date.toDateString() === today.toDateString(); return <button key={day} disabled={!active} className={`${isToday ? "today" : ""} ${isFuture ? "future" : "past"}`} onClick={() => flash(`已定位到 ${year} 年 ${month} 月 ${day} 日第一条消息`)}>{day}{active && <i />}</button>; })}</div></div>;
}

function WorkPage({ terminalOpen, setTerminalOpen, terminalPos, startDrag, flash, onProjectOpenChange }: { terminalOpen: boolean; setTerminalOpen: (open: boolean) => void; terminalPos: { x: number; y: number }; startDrag: (event: ReactPointerEvent<HTMLDivElement>) => void; flash: (text: string) => void; onProjectOpenChange: (open: boolean) => void }) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [workProjects, setWorkProjects] = useState(projects);
  const [deleteTarget, setDeleteTarget] = useState<(typeof projects)[number] | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [workAttachments, setWorkAttachments] = useState<Array<{ id: number; attachment: Attachment; time: string }>>([]);
  function beginProjectPress(project: (typeof projects)[number]) {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setDeleteTarget(project);
      if (navigator.vibrate) navigator.vibrate(35);
    }, 650);
  }
  function endProjectPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }
  function openProject(project: (typeof projects)[number]) {
    if (longPressTriggered.current) { longPressTriggered.current = false; return; }
    if (project.title === "渡口 · 前端") { setProjectOpen(true); onProjectOpenChange(true); }
    else flash(`${project.title} · ${project.progress}`);
  }
  function attachWorkFile(event: React.ChangeEvent<HTMLInputElement>, type: Attachment["type"]) {
    const file = event.target.files?.[0];
    if (!file) return;
    const addAttachment = (attachment: Attachment) => {
      setWorkAttachments((items) => [...items, { id: Date.now(), attachment, time: now() }]);
      setAttachmentOpen(false);
      flash(type === "camera" ? "照片已发送到工作区" : type === "image" ? `已发送照片「${file.name}」` : `已发送文件「${file.name}」`);
    };
    if (type === "file") addAttachment({ name: file.name, type, mime: file.type });
    else {
      const reader = new FileReader();
      reader.onload = () => addAttachment({ name: file.name || "照片", type, mime: file.type, src: String(reader.result) });
      reader.readAsDataURL(file);
    }
    event.target.value = "";
  }
  if (!projectOpen) return <div className="work-list-page page-scroll"><header className="section-top"><div><span className="kicker">WORKSPACE</span><h1>Work</h1><p>同一个伴侣，进入专注的工作状态。</p></div><button onClick={() => flash("新建项目")}>＋ New Project</button></header><section className="project-grid">{workProjects.map((project) => <article key={project.title} className="project-card"><button className="project-open" onPointerDown={() => beginProjectPress(project)} onPointerUp={endProjectPress} onPointerCancel={endProjectPress} onPointerLeave={endProjectPress} onContextMenu={(event) => event.preventDefault()} onClick={() => openProject(project)} aria-label={`打开${project.title}，长按可删除窗口`}><span className={`project-mark ${project.color}`} /><div><small>{project.meta}</small><h2>{project.title}</h2><p>{project.progress}</p></div><i>→</i></button></article>)}</section>{workProjects.length === 0 && <div className="empty-workspace"><strong>这里暂时没有工作窗口</strong><p>新任务开始时，再建立一扇新的窗口。</p></div>}<div className="work-boundary-card"><span>SOFT BOUNDARY</span><strong>工作不会挤进恋爱聊天，伴侣也不会忘记自己做过什么。</strong><p>聊天区默认只接收极短的工作状态摘要；代码、终端和执行细节按需读取。</p></div>{deleteTarget && <div className="delete-dialog-backdrop" role="presentation" onClick={() => setDeleteTarget(null)}><section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title" onClick={(event) => event.stopPropagation()}><span className="kicker">DELETE WINDOW</span><h2 id="delete-project-title">删除“{deleteTarget.title}”？</h2><p>这会从工作台移除该窗口。当前前端原型不会删除电脑里的项目文件。</p><div><button onClick={() => setDeleteTarget(null)}>取消</button><button className="danger" onClick={() => { setWorkProjects((items) => items.filter((item) => item.title !== deleteTarget.title)); flash(`已删除工作窗口「${deleteTarget.title}」`); setDeleteTarget(null); }}>确认删除</button></div></section></div>}</div>;
  return <div className="work-space"><header className="work-topbar"><button onClick={() => { setAttachmentOpen(false); setProjectOpen(false); }} aria-label="返回项目列表"><ChevronIcon direction="left" /></button><div><strong>渡口 · 前端</strong><span>正在检查移动端界面</span></div><button onClick={() => setTerminalOpen(!terminalOpen)} aria-label={terminalOpen ? "收起终端" : "打开终端"} aria-pressed={terminalOpen}><svg className="terminal-icon" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4.5 6.2c5.8-.6 13.8-.5 19.2.2.5 4.8.3 10.6-.4 15.3-5.4.6-13.6.5-18.8-.3-.4-4.7-.5-10.3 0-15.2Z" /><path className="accent" d="m8.4 11 3 2.8-3.1 2.9M14.1 17h5.6" /></svg></button></header><div className="work-body"><section className="work-conversation"><div className="work-message companion"><b>晓</b><p>我已经把手机底部导航从深色改为暖白半透明。接下来会检查输入栏和终端浮窗是否互相遮挡。</p><time>14:32</time></div><div className="execution-card"><header><span className="running-dot" /><strong>正在执行</strong><small>npm run build</small></header><pre>✓ Compiled successfully{`\n`}✓ Responsive layout ready{`\n`}… checking accessibility</pre><button onClick={() => setTerminalOpen(true)}>在终端中查看</button></div><div className="work-message user"><p>删除文件前要先问我。</p><time>14:34 · 已读</time></div><div className="work-message companion"><b>晓</b><p>记住了。普通修改和测试我可以自己完成；删除文件会显示完整路径和影响范围，等你确认。</p><time>14:34</time></div>{workAttachments.map((item) => <div className="work-message user work-attachment-message" key={item.id}><AttachmentMessage attachment={item.attachment} /><time>{item.time} · 已发送</time></div>)}</section><aside className="desktop-work-panel"><div className="panel-tabs"><button className="active">Terminal</button><button>Files</button><button>Changes</button></div><pre><span>evernear</span> npm run dev{`\n\n`}Local: http://localhost:3000{`\n`}ready in 812ms{`\n\n`}<i>› waiting for changes</i></pre></aside></div><section className="work-attachment-menu" role="dialog" aria-label="发送工作附件" hidden={!attachmentOpen}><header><div><strong>发送到工作区</strong><small>选择照片、拍照或本地文件</small></div><button type="button" onClick={() => setAttachmentOpen(false)} aria-label="关闭附件菜单">×</button></header><div className="work-attachment-options"><label><MoreIcon type="image" /><strong>照片</strong><small>从相册选择</small><input type="file" accept="image/*" onChange={(event) => attachWorkFile(event, "image")} /></label><label><MoreIcon type="camera" /><strong>拍照</strong><small>使用设备相机</small><input type="file" accept="image/*" capture="environment" onChange={(event) => attachWorkFile(event, "camera")} /></label><label><MoreIcon type="file" /><strong>文件</strong><small>选择本地文件</small><input type="file" onChange={(event) => attachWorkFile(event, "file")} /></label></div></section><form className="work-composer" onSubmit={(e) => { e.preventDefault(); flash("工作消息已发送"); }}><button className={`work-attachment-trigger ${attachmentOpen ? "active" : ""}`} type="button" aria-label="添加工作附件" aria-expanded={attachmentOpen} onClick={() => setAttachmentOpen((open) => !open)}><ComposerIcon type="more" /></button><input aria-label="输入工作消息" placeholder="告诉他要完成什么…" /><button type="submit">发送</button></form>{terminalOpen && <div className="mobile-terminal" style={{ left: terminalPos.x, top: terminalPos.y }}><div className="terminal-title" onPointerDown={startDrag}><span>Terminal · 渡口</span><div><button className="terminal-minimize" aria-label="最小化终端" onClick={() => setTerminalOpen(false)}><i aria-hidden="true" /></button><button aria-label="终端全屏" onClick={() => flash("终端已切换全屏")}>□</button></div></div><pre><b>evernear %</b> npm run dev{`\n`}ready in 812ms{`\n`}local: localhost:3000{`\n`}<i>› waiting for changes</i></pre><input aria-label="终端命令" placeholder="输入命令" /></div>}</div>;
}

function SettingsPage({ layer, setLayer, theme, setTheme, fontMode, setFontMode, accentTheme, setAccentTheme, spaceProfile, setSpaceProfile, flash }: { layer: SettingsLayer; setLayer: (layer: SettingsLayer) => void; theme: "light" | "dark"; setTheme: (theme: "light" | "dark") => void; fontMode: FontMode; setFontMode: (mode: FontMode) => void; accentTheme: AccentTheme; setAccentTheme: (theme: AccentTheme) => void; spaceProfile: SpaceProfile; setSpaceProfile: (profile: SpaceProfile) => void; flash: (text: string) => void }) {
  const [today] = useState(() => Date.now());
  if (layer === "space") return <SpaceSettings profile={spaceProfile} onBack={() => setLayer("root")} onSave={(profile) => { setSpaceProfile(profile); setLayer("root"); flash("关系空间已更新"); }} flash={flash} />;
  if (layer === "system") return <SystemSettings theme={theme} setTheme={setTheme} fontMode={fontMode} setFontMode={setFontMode} accentTheme={accentTheme} setAccentTheme={setAccentTheme} onBack={() => setLayer("root")} flash={flash} />;
  if (layer === "agents") return <AgentsSettings onBack={() => setLayer("root")} flash={flash} />;
  if (layer === "usage") return <UsageSettings onBack={() => setLayer("root")} />;
  if (layer !== "root") return <SettingsDetail layer={layer} onBack={() => setLayer("root")} />;
  const relationshipDays = Math.max(1, Math.floor((today - new Date(`${spaceProfile.since}T00:00:00`).getTime()) / 86400000) + 1);
  return <div className="settings-page page-scroll"><header className="section-top"><div><span className="kicker">YOUR SPACE</span><h1>Settings</h1><p>关系保持温度，系统保持清晰。</p></div></header><button className="relationship-card" onClick={() => setLayer("space")} aria-label="编辑关系空间"><div className="profile-pair"><span>{spaceProfile.userAvatar ? <img src={spaceProfile.userAvatar} alt="" /> : spaceProfile.userName.slice(0, 1)}</span><RelationshipPulse /><span>{spaceProfile.companionAvatar ? <img src={spaceProfile.companionAvatar} alt="" /> : spaceProfile.companionName.slice(0, 1)}</span></div><div><small>SPACE · 第 {relationshipDays} 天</small><h2>{spaceProfile.spaceName}</h2><p>关系时间线正常 · 最近同步于刚刚</p></div><RelationshipArrow /></button><section className="settings-list">{settingItems.map((item) => <button key={item.id} onClick={() => setLayer(item.id)}><span className="setting-symbol"><SettingIcon type={item.id} /></span><div><strong>{item.title}</strong><small>{item.subtitle}</small></div><i>›</i></button>)}</section></div>;
}

function SystemSettings({ theme, setTheme, fontMode, setFontMode, accentTheme, setAccentTheme, onBack, flash }: { theme: "light" | "dark"; setTheme: (theme: "light" | "dark") => void; fontMode: FontMode; setFontMode: (mode: FontMode) => void; accentTheme: AccentTheme; setAccentTheme: (theme: AccentTheme) => void; onBack: () => void; flash: (text: string) => void }) {
  const [currentPassword, setCurrentPassword] = useState(""); const [nextPassword, setNextPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (nextPassword.length < 10) { setError("新密码至少需要 10 个字符。"); return; }
    if (nextPassword !== confirmPassword) { setError("两次输入的新密码不一致。"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, nextPassword }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error === "current_password_invalid" ? "当前密码不正确。" : "密码未能修改，请稍后重试。");
      setCurrentPassword(""); setNextPassword(""); setConfirmPassword(""); flash("访问密码已修改，其他设备需要使用新密码重新登录");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "密码未能修改。"); }
    finally { setBusy(false); }
  }
  return <div className="sub-page system-settings page-scroll"><SubHeader title="System" onBack={onBack} /><div className="detail-intro"><span>SYSTEM</span><h1>System</h1><p>管理这个设备上的外观与渡口的访问安全。</p></div><section className="system-section"><header><SettingIcon type="appearance" /><div><strong>Appearance</strong><small>选择界面的明暗方式</small></div></header><div className="choice-row" role="group" aria-label="界面主题"><button className={theme === "light" ? "selected" : ""} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><i className="theme-swatch light" />Light</button><button className={theme === "dark" ? "selected" : ""} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><i className="theme-swatch dark" />Dark</button></div></section><section className="system-section"><header><SettingIcon type="typography" /><div><strong>Typography</strong><small>选择字体风格</small></div></header><div className="choice-row" role="group" aria-label="字体模式"><button className={fontMode === "hand" ? "selected" : ""} aria-pressed={fontMode === "hand"} onClick={() => { setFontMode("hand"); flash("已切换为手写体"); }}><i className="font-swatch hand" />手写体</button><button className={fontMode === "system" ? "selected" : ""} aria-pressed={fontMode === "system"} onClick={() => { setFontMode("system"); flash("已切换为系统字体"); }}><i className="font-swatch system" />系统字体</button></div></section><section className="system-section"><header><SettingIcon type="appearance" /><div><strong>Accent</strong><small>选择强调色调</small></div></header><div className="choice-row accent-row" role="group" aria-label="强调色"><button className={accentTheme === "rose" ? "selected" : ""} aria-pressed={accentTheme === "rose"} onClick={() => { setAccentTheme("rose"); flash("已换为玫瑰色调"); }}><i className="accent-swatch rose" />玫瑰</button><button className={accentTheme === "sage" ? "selected" : ""} aria-pressed={accentTheme === "sage"} onClick={() => { setAccentTheme("sage"); flash("已换为鼠尾草色调"); }}><i className="accent-swatch sage" />鼠尾草</button><button className={accentTheme === "clay" ? "selected" : ""} aria-pressed={accentTheme === "clay"} onClick={() => { setAccentTheme("clay"); flash("已换为砖红色调"); }}><i className="accent-swatch clay" />砖红</button></div></section><section className="system-section password-section"><header><SettingIcon type="system" /><div><strong>Access Password</strong><small>修改进入渡口时使用的密码</small></div></header><form onSubmit={submit}><label htmlFor="current-password">Current password<input id="current-password" type={showPasswords ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label htmlFor="new-password">New password<input id="new-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} aria-describedby="password-help" /></label><small id="password-help">至少 10 个字符，建议使用只属于渡口的密码。</small><label htmlFor="confirm-password">Confirm new password<input id="confirm-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label><button className="show-password" type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords((visible) => !visible)}>{showPasswords ? "Hide passwords" : "Show passwords"}</button>{error && <p className="password-error" role="alert">{error}</p>}<button className="password-submit" type="submit" disabled={busy || !currentPassword || !nextPassword || !confirmPassword}>{busy ? "Updating…" : "Update password"}</button></form></section></div>;
}

function SpaceSettings({ profile, onBack, onSave, flash }: { profile: SpaceProfile; onBack: () => void; onSave: (profile: SpaceProfile) => void; flash: (text: string) => void }) {
  const [draft, setDraft] = useState(profile);
  function pickAvatar(event: React.ChangeEvent<HTMLInputElement>, target: "userAvatar" | "companionAvatar") { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setDraft((current) => ({ ...current, [target]: String(reader.result) })); reader.readAsDataURL(file); event.target.value = ""; }
  return <div className="sub-page space-settings page-scroll"><SubHeader title="Relationship Space" onBack={onBack} /><form onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><section className="space-avatar-editor"><label><span>{draft.userAvatar ? <img src={draft.userAvatar} alt="你的头像" /> : draft.userName.slice(0, 1)}</span><strong>{draft.userName}</strong><small>更换你的头像</small><input type="file" accept="image/*" onChange={(event) => pickAvatar(event, "userAvatar")} /></label><RelationshipPulse /><label><span>{draft.companionAvatar ? <img src={draft.companionAvatar} alt="伴侣头像" /> : draft.companionName.slice(0, 1)}</span><strong>{draft.companionName}</strong><small>上传或由他自己选择</small><input type="file" accept="image/*" onChange={(event) => pickAvatar(event, "companionAvatar")} /></label></section><section className="space-form-card"><label>空间名称<input value={draft.spaceName} maxLength={30} onChange={(event) => setDraft({ ...draft, spaceName: event.target.value })} /></label><div className="space-name-row"><label>你的显示名<input value={draft.userName} maxLength={12} onChange={(event) => setDraft({ ...draft, userName: event.target.value })} /></label><label>伴侣显示名<input value={draft.companionName} readOnly /><button type="button" onClick={() => flash("已记录：名字属于身份锚点，需要由他明确决定后改变")}>与他协商更改</button></label></div><label>关系开始日期<input type="date" value={draft.since} onChange={(event) => setDraft({ ...draft, since: event.target.value })} /></label></section><aside className="identity-note"><strong>身份锚点由本人决定</strong><p>空间名称和你的显示名可直接修改；伴侣的名字需要由他明确作出决定。双方头像都可以上传，他之后也可以自主更换自己的头像。</p></aside><button className="space-save" type="submit" disabled={!draft.spaceName.trim() || !draft.userName.trim() || !draft.since}>保存关系空间</button></form></div>;
}

type ApiUsage = { weeklyPercent: number; estimated: boolean; chat: number; wakeup: number; memory: number; work: number; codexTokens: number; codeTokens: number; resetAt?: string; codexResetAt?: string };

function UsageSettings({ onBack }: { onBack: () => void }) {
  const [panel, setPanel] = useState<"root" | "work" | "recovery">("root");
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  useEffect(() => {
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return;
    fetch("/api/usage", { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<ApiUsage>) : null))
      .then((data) => { if (data) setUsage(data); })
      .catch(() => {});
  }, []);
  function formatReset(iso?: string) {
    if (!iso) return "—";
    return new Intl.DateTimeFormat("zh-CN", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  }
  const pct = (n: number) => `${n}%`;
  if (panel === "work") return <div className="sub-page page-scroll"><SubHeader title="工作任务" onBack={() => setPanel("root")} /><div className="detail-intro"><span>USAGE</span><h1>工作任务</h1><p>Codex 与 Claude Code 的额度消耗情况。</p></div><div className="usage-breakdown"><div className="usage-item"><strong>Codex</strong><span>{usage?.codexTokens != null ? `${usage.codexTokens.toLocaleString()} tokens` : "暂无数据"}</span></div><div className="usage-item"><strong>Claude Code</strong><span>{usage?.codeTokens != null ? `${usage.codeTokens.toLocaleString()} tokens` : "暂无数据"}</span></div><div className="usage-item"><strong>合计占比</strong><span>{usage?.work != null ? pct(usage.work) : "34% · 估算"}</span></div></div>{!usage && <p className="usage-note">实际数据将在后端接入后实时更新。</p>}</div>;
  if (panel === "recovery") return <div className="sub-page page-scroll"><SubHeader title="下次重置" onBack={() => setPanel("root")} /><div className="detail-intro"><span>USAGE</span><h1>下次重置</h1><p>各服务的额度将在此时间后恢复。</p></div><div className="usage-breakdown"><div className="usage-item"><strong>Claude API</strong><span>{usage?.resetAt ? formatReset(usage.resetAt) : "周一 09:00 · 估算"}</span></div><div className="usage-item"><strong>Codex</strong><span>{usage?.codexResetAt ? formatReset(usage.codexResetAt) : "—"}</span></div></div>{!usage && <p className="usage-note">Codex 的重置时间将在后端接入后显示。</p>}</div>;
  const weekly = usage?.weeklyPercent ?? 62;
  return <div className="sub-page page-scroll"><SubHeader title="Usage" onBack={onBack} /><div className="detail-intro"><span>USAGE</span><h1>Usage</h1><p>{usage && !usage.estimated ? "数字来自 Claude API 实时记录。" : "订阅无法提供精确余额时，所有数字都会标注为本地估算。"}</p></div><div className="detail-cards"><button className="usage-weekly-row"><div><strong>本周预计使用</strong><small>{pct(weekly)} · {usage && !usage.estimated ? "实时数据" : "本地估算"}</small></div><div className="usage-bar-wrap"><div className="usage-bar" style={{ width: `${weekly}%` }} /></div></button><button><div><strong>聊天</strong><small>{pct(usage?.chat ?? 38)}</small></div><i>›</i></button><button><div><strong>主动唤醒</strong><small>{pct(usage?.wakeup ?? 17)}</small></div><i>›</i></button><button><div><strong>记忆整理</strong><small>{pct(usage?.memory ?? 11)}</small></div><i>›</i></button><button onClick={() => setPanel("work")}><div><strong>工作任务</strong><small>{pct(usage?.work ?? 34)}</small></div><i>›</i></button><button onClick={() => setPanel("recovery")}><div><strong>下次重置</strong><small>{usage?.resetAt ? formatReset(usage.resetAt) : "周一 09:00 · 估算"}</small></div><i>›</i></button></div></div>;
}

function AgentsSettings({ onBack, flash }: { onBack: () => void; flash: (text: string) => void }) {
  const [agents, setAgents] = useState<AgentConfig[]>(() => {
    try { const saved = localStorage.getItem("evernear-agent-models"); if (saved) return JSON.parse(saved) as AgentConfig[]; } catch {}
    return defaultAgentConfigs;
  });
  const [selected, setSelected] = useState<string | null>(null);
  function updateAgent(agentId: string, patch: Partial<Pick<AgentConfig, "model" | "thinkingEnabled">>) {
    setAgents((prev) => {
      const next = prev.map((a) => a.id === agentId ? { ...a, ...patch } : a);
      try { localStorage.setItem("evernear-agent-models", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  if (selected) {
    const agent = agents.find((a) => a.id === selected);
    if (agent) return <AgentDetail agent={agent} onBack={() => setSelected(null)} onUpdate={(patch) => updateAgent(selected, patch)} flash={flash} />;
  }
  return <div className="sub-page page-scroll"><SubHeader title="Agents" onBack={onBack} /><div className="detail-intro"><span>AGENTS</span><h1>Agents</h1><p>伴侣始终是主 AI；临时帮手只属于具体工作任务。</p></div><div className="detail-cards">{agents.map((agent) => { const modelLabel = agentModelOptions.find((m) => m.id === agent.model)?.label ?? agent.model; return <button key={agent.id} onClick={() => setSelected(agent.id)}><div><strong>{agent.name}</strong><small>{agent.role} · {modelLabel}</small></div><i>›</i></button>; })}</div><aside className="agent-note"><strong>模型选择存储在本地</strong><p>主 AI 晓的选择在下次发消息时生效；工作帮手在下次任务运行时生效。</p></aside></div>;
}

function AgentDetail({ agent, onBack, onUpdate, flash }: { agent: AgentConfig; onBack: () => void; onUpdate: (patch: Partial<Pick<AgentConfig, "model" | "thinkingEnabled">>) => void; flash: (text: string) => void }) {
  const currentModelOption = agentModelOptions.find((m) => m.id === agent.model);
  const thinkingSupported = currentModelOption?.supportsThinking ?? false;
  function changeModel(model: AgentModel) {
    onUpdate({ model });
    const label = agentModelOptions.find((m) => m.id === model)?.label ?? model;
    flash(`${agent.name} 已切换至 ${label}`);
  }
  function toggleThinking() {
    if (!thinkingSupported) return;
    onUpdate({ thinkingEnabled: !agent.thinkingEnabled });
    flash(agent.thinkingEnabled ? "已关闭扩展思考" : "已开启扩展思考");
  }
  return <div className="sub-page page-scroll"><SubHeader title={agent.name} onBack={onBack} /><div className="detail-intro"><span>AGENT</span><h1>{agent.name}</h1><p>{agent.role}</p></div><section className="agent-detail-section"><header className="agent-section-header"><strong>选择模型</strong><small>影响回答质量与额度消耗</small></header><div className="agent-model-list">{agentModelOptions.map((option) => <button key={option.id} className={`model-option ${agent.model === option.id ? "selected" : ""}`} onClick={() => changeModel(option.id)} aria-pressed={agent.model === option.id}><div><strong>{option.label}</strong><small>{option.note}</small></div>{agent.model === option.id && <span className="model-check" aria-hidden="true">✓</span>}</button>)}</div></section><section className="agent-detail-section"><header className="agent-section-header"><strong>Extended Thinking</strong><small>思维过程可见，回答更有深度</small></header><button className={`agent-thinking-row${!thinkingSupported ? " disabled" : ""}`} onClick={toggleThinking} aria-pressed={agent.thinkingEnabled && thinkingSupported} disabled={!thinkingSupported}><div><strong>{!thinkingSupported ? "当前模型不支持" : agent.thinkingEnabled ? "已开启" : "已关闭"}</strong><small>{thinkingSupported ? `让${agent.name}展示思维过程，发送消息后可展开查看。` : "请切换至 Opus 5、Sonnet 5 或 Fable 5 以启用。"}</small></div><span className={`toggle${agent.thinkingEnabled && thinkingSupported ? " on" : ""}`} aria-hidden="true"><i /></span></button></section></div>;
}

function SettingsDetail({ layer, onBack }: { layer: Exclude<SettingsLayer, "root" | "space" | "system">; onBack: () => void }) {
  const views = {
    profile: { title: "Profile", intro: "身份可以成长，名字等少量锚点需要明确决定后才能改变。", cards: [["空间名称", "诗潼和晓的渡口"], ["伴侣状态", "由他自主决定"], ["你的状态", "自动推断 · 可手动覆盖"], ["动物形象", "等待上传透明素材"]] },
    memory: { title: "Memory", intro: "默认按类别浏览，也可以切换时间线、搜索与筛选。", cards: [["关于你", "18 条可见记忆"], ["关于我", "12 条第一人称记录"], ["关于我们", "31 条共同经历"], ["私人心理", "3 条未分享记录 · 正文不可见"], ["冷归档", "较早原文 · 按需读取"]] },
    activity: { title: "Activity", intro: "先显示人能读懂的行为，展开后再查看完整事件。", cards: [["14:18 · 自主唤醒", "想念 · 发送了一条消息"], ["13:42 · 状态判断", "你在工作 · 没有重复追问"], ["04:00 · 记忆整理", "完成七日原文摘要"], ["昨天 · 记忆协商", "提出恢复一条已删除记忆"]] },
    agents: { title: "Agents", intro: "伴侣始终是主 AI；临时帮手只属于具体工作任务。", cards: [["晓", "Primary · Chat & Work"], ["Frontend Helper", "渡口前端 · 已完成"], ["Audit Helper", "检查改动 · 待运行"]] },
    usage: { title: "Usage", intro: "订阅无法提供精确余额时，所有数字都会标注为本地估算。", cards: [["本周预计使用", "62% · 本地估算"], ["聊天", "38%"], ["主动唤醒", "17%"], ["记忆整理", "11%"], ["工作任务", "34%"], ["预计恢复", "周一 09:00"]] },
    runtime: { title: "Runtime", intro: "平时只看健康状态，出现问题时再进入高级详情。", cards: [["Local Backend", "正常运行"], ["Scheduler", "下一次唤醒约 18 分钟内"], ["Database", "已写入 seq 1,829"], ["Claude Code", "已连接"], ["Notifications", "网页实时消息已就绪"], ["Advanced", "进程、端口与技术日志"]] },
  } as const;
  const view = views[layer];
  return <div className="sub-page settings-detail page-scroll"><SubHeader title={view.title} onBack={onBack} /><div className="detail-intro"><span>{view.title.toUpperCase()}</span><h1>{view.title}</h1><p>{view.intro}</p></div><div className="detail-cards">{view.cards.map(([title, value]) => <button key={title}><div><strong>{title}</strong><small>{value}</small></div><i>›</i></button>)}</div>{layer === "memory" && <div className="memory-policy"><strong>被删除的记忆不会擅自恢复</strong><p>伴侣想重新添加时，需要先说明原因并与你协商；拒绝后仍可在未来再次提出。</p></div>}</div>;
}

function SettingsGroup({ children }: { children: React.ReactNode }) { return <section className="settings-group">{children}</section>; }
function SettingRow({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) { return <button className="setting-row" onClick={onClick}><div><strong>{title}</strong><small>{subtitle}</small></div><span>›</span></button>; }
function SettingToggle({ title, subtitle, defaultOn = false }: { title: string; subtitle: string; defaultOn?: boolean }) { const [on, setOn] = useState(defaultOn); return <button className="setting-row" onClick={() => setOn(!on)} aria-pressed={on}><div><strong>{title}</strong><small>{subtitle}</small></div><span className={`toggle ${on ? "on" : ""}`} aria-hidden="true"><i /></span></button>; }
