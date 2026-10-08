"use client";

/* Live chat for visitors.

   Header: a cream panel with faint route lines and a sliding strip of help
   topics (each one starts that conversation). It compacts once the visitor
   starts talking, so the conversation gets the room.

   Typing works in both directions: the visitor's typing is sent to agents,
   and an agent's typing shows here with their name. While the assistant is
   answering, the indicator stays up for a natural beat rather than
   flickering. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { LogoMark } from "@/components/Logo";
import {
  ALLOWED_ATTACHMENT_MIME,
  encodeAttachment,
  MAX_ATTACHMENT_BYTES,
  parseAttachment,
} from "@/lib/chatAttachment";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type QuickAction = { label: string; value: string };
type Sender = "user" | "bot" | "admin" | "system";
type Msg = {
  sender: Sender;
  message: string;
  timestamp: string | Date;
  quickActions?: QuickAction[];
  agentName?: string;
};
type Typist = { kind: "bot" } | { kind: "agent"; name: string } | null;

/* Topics in the sliding strip. "link:" values open a page; anything else is
   sent as the visitor's message, which the assistant understands. */
const TOPICS: QuickAction[] = [
  { label: "Track a shipment", value: "track_package" },
  { label: "Check rates", value: "link:/rates" },
  { label: "Delivery times", value: "How long does delivery take?" },
  { label: "Cold-chain shipping", value: "How do I ship perishables?" },
  { label: "Shipping to Canada", value: "Do you ship to Canada?" },
  { label: "Report a problem", value: "report_problem" },
  { label: "Book a demo", value: "link:/book-demo" },
  { label: "Talk to a person", value: "talk_to_support" },
];

/* The bot reply usually lands in well under a second; holding the typing
   indicator this long reads as a reply being written, not a glitch. */
const MIN_TYPING_MS = 750;
/* How long an agent's "typing" lasts without a fresh signal. */
const AGENT_TYPING_TTL_MS = 4500;
/* Visitor typing is sent at most this often, and stops after this idle. */
const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 1600;

/* The interim backend is shared with the legacy product. Rebrand its copy. */
const rebrand = (m: Msg): Msg =>
  m.sender === "user" || parseAttachment(m.message)
    ? m
    : { ...m, message: m.message.replace(/Velonex24|Velonex/g, "Bellmont Express") };

const timeOf = (t: string | Date) =>
  new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function Avatar({ sender, name }: { sender: Sender; name?: string }) {
  if (sender === "admin") {
    const initials = (name ?? "Agent").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return <span className="lcw-avatar lcw-avatar--agent" aria-hidden="true">{initials}</span>;
  }
  return <span className="lcw-avatar" aria-hidden="true"><LogoMark size={16} /></span>;
}

function Bubble({ msg, showMeta }: { msg: Msg; showMeta: boolean }) {
  const mine = msg.sender === "user";
  const att = parseAttachment(msg.message);

  if (msg.sender === "system") {
    return <p className="lcw-system">{msg.message}</p>;
  }

  return (
    <div className={`lcw-row ${mine ? "lcw-row--mine" : ""}`}>
      {!mine && (showMeta ? <Avatar sender={msg.sender} name={msg.agentName} /> : <span className="lcw-avatar-gap" />)}
      <div className="lcw-col">
        <div className={`lcw-bubble ${mine ? "lcw-bubble--mine" : ""}`}>
          {att ? (
            att.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={att.data} alt={att.name} className="max-h-48 rounded-lg" />
            ) : (
              <a href={att.data} download={att.name} className="lcw-file">
                <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
                  <path d="M8 2a3 3 0 0 0-3 3v8a4 4 0 0 0 8 0V6h-1.5v7a2.5 2.5 0 0 1-5 0V5a1.5 1.5 0 1 1 3 0v7a.75.75 0 0 1-1.5 0V6H6.5v6a2.25 2.25 0 0 0 4.5 0V5a3 3 0 0 0-3-3z" />
                </svg>
                {att.name}
              </a>
            )
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{msg.message}</span>
          )}
        </div>
        {showMeta && (
          <span className="lcw-meta">
            {mine ? "You" : msg.sender === "admin" ? msg.agentName ?? "Agent" : "Bellmont Assistant"}
            {" · "}
            {timeOf(msg.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

/* Strip speed in px/s, matched to the reference animation. */
const STRIP_SPEED = 46;

function TopicStrip({ onPick }: { onPick: (q: QuickAction) => void }) {
  /* Rendered twice so the strip can loop seamlessly; the copy is hidden from
     assistive tech and the keyboard so nothing is announced or tabbed twice.
     The loop length follows the real width of one set, so the speed is the
     same whatever the font or chip sizes. */
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = trackRef.current;
    const set = track?.firstElementChild as HTMLElement | null;
    if (!track || !set) return;
    const fit = () => { track.style.animationDuration = `${set.offsetWidth / STRIP_SPEED}s`; };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(set);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="lcw-strip" aria-label="Help topics">
      <div ref={trackRef} className="lcw-strip__track">
        {[0, 1].map((copy) => (
          <ul key={copy} className="lcw-strip__set" aria-hidden={copy === 1}>
            {TOPICS.map((t) => (
              <li key={t.label}>
                <button type="button" tabIndex={copy === 1 ? -1 : 0} onClick={() => onPick(t)} className="lcw-chip">
                  {t.label}
                  {t.value.startsWith("link:") && <span aria-hidden="true"> ↗</span>}
                </button>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export default function BellmontChat() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typist, setTypist] = useState<Typist>(null);
  const [connected, setConnected] = useState(false);
  const [agentName, setAgentName] = useState<string | null>(null);
  /* True once the conversation is with people rather than the assistant:
     after a hand-over request, or when an agent joins. The assistant stops
     replying then, so we must not show it "typing". */
  const [humanMode, setHumanMode] = useState(false);
  /* Socket handlers are registered once, so they read the agent's name
     through a ref rather than the (stale) state value. */
  const agentNameRef = useRef<string | null>(null);
  useEffect(() => { agentNameRef.current = agentName; }, [agentName]);
  const socketRef = useRef<Socket | null>(null);
  const sessionRef = useRef<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const botWaitStarted = useRef(0);
  const botWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const started = msgs.some((m) => m.sender === "user");

  /* Scroll the message list itself. scrollIntoView would also scroll every
     scrollable ancestor — including the page — which made the whole site jump
     on phones whenever a message arrived or the panel opened. */
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [msgs, typist, open]);

  /* On phones the panel is a full-screen sheet: hold the page still behind it,
     and let Escape (hardware keyboards) close it like a native sheet. */
  useEffect(() => {
    if (!open) return;
    const phone = window.matchMedia("(max-width: 639px)").matches;
    const root = document.documentElement;
    const prev = { html: root.style.overflow, body: document.body.style.overflow };
    if (phone) {
      root.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const clearBotWait = () => {
    if (botWatchdog.current) { clearTimeout(botWatchdog.current); botWatchdog.current = null; }
  };

  /* Show a bot message, keeping the typing indicator up for at least
     MIN_TYPING_MS from when the visitor sent their message. */
  const deliverBot = (m: Msg) => {
    clearBotWait();
    const wait = Math.max(0, MIN_TYPING_MS - (Date.now() - botWaitStarted.current));
    window.setTimeout(() => {
      setTypist((t) => (t?.kind === "bot" ? null : t));
      setMsgs((p) => [...p, rebrand(m)]);
    }, wait);
  };

  // connect lazily the first time the panel opens
  useEffect(() => {
    if (!open || socketRef.current) return;

    let sessionId = localStorage.getItem("bellmont_chat_session");
    if (!sessionId) {
      sessionId = `MER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("bellmont_chat_session", sessionId);
    }
    sessionRef.current = sessionId;

    fetch(`${API_URL}/api/chat/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, userName: "Website Visitor" }),
    }).catch(() => {});

    const s = io(API_URL, { transports: ["websocket", "polling"] });
    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      s.emit("joinSession", { sessionId });
    });

    /* A returning visitor may already be mid-hand-over; ask the server. */
    fetch(`${API_URL}/api/chat/sessions/${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { session?: { status?: string; agentName?: string | null } } | null) => {
        if (d?.session?.status === "human") {
          setHumanMode(true);
          if (d.session.agentName) setAgentName(d.session.agentName);
        }
      })
      .catch(() => {});
    s.on("disconnect", () => setConnected(false));
    s.on("sessionHistory", ({ messages }: { messages?: Msg[] }) => {
      if (messages?.length) setMsgs(messages.map(rebrand));
    });
    s.on("newMessage", (m: Msg & { sessionId?: string }) => {
      if (m.sessionId && m.sessionId !== sessionRef.current) return;
      if (m.sender === "user") return; // our own message, already shown
      if (m.sender === "admin") {
        if (agentTypingTimer.current) clearTimeout(agentTypingTimer.current);
        setTypist(null);
        if (m.agentName) setAgentName(m.agentName);
      }
      if (m.sender === "bot") return; // bot replies arrive as botReply
      setMsgs((p) => [...p, rebrand(m)]);
    });
    s.on("botReply", (m: Msg & { status?: string }) => {
      if (m.status === "human") setHumanMode(true);
      deliverBot(m);
    });
    s.on("adminJoin", ({ agentName: name }: { agentName?: string }) => {
      setHumanMode(true);
      setAgentName(name ?? "An agent");
    });
    s.on("sessionClosed", () => {
      setHumanMode(false);
      setAgentName(null);
      localStorage.removeItem("bellmont_chat_session");
    });
    s.on("typing", (b: { sender?: string; agentName?: string }) => {
      if (b?.sender && b.sender !== "admin") return;
      setTypist({ kind: "agent", name: b?.agentName ?? agentNameRef.current ?? "An agent" });
      if (agentTypingTimer.current) clearTimeout(agentTypingTimer.current);
      agentTypingTimer.current = setTimeout(() => setTypist((t) => (t?.kind === "agent" ? null : t)), AGENT_TYPING_TTL_MS);
    });
    s.on("stopTyping", (b: { sender?: string }) => {
      if (b?.sender && b.sender !== "admin") return;
      setTypist((t) => (t?.kind === "agent" ? null : t));
    });

    setMsgs((p) => (p.length ? p : [{
      sender: "bot",
      message: "Hi! I'm the Bellmont assistant. Send me a tracking number and I'll look it up, or pick a topic above.",
      timestamp: new Date(),
    }]));

    return () => { s.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Tell agents the visitor is typing: a throttled "typing", and
     "stopTyping" once they pause, send, or leave the box. */
  const signalTyping = () => {
    const s = socketRef.current;
    if (!s || !sessionRef.current) return;
    const now = Date.now();
    if (now - lastTypingSent.current > TYPING_THROTTLE_MS) {
      s.emit("typing", { sessionId: sessionRef.current, sender: "user" });
      lastTypingSent.current = now;
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopSignal, TYPING_IDLE_MS);
  };
  const stopSignal = () => {
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; }
    if (!lastTypingSent.current) return;
    socketRef.current?.emit("stopTyping", { sessionId: sessionRef.current, sender: "user" });
    lastTypingSent.current = 0;
  };

  const sendRaw = (text: string, expectBotReply = true) => {
    const s = socketRef.current;
    if (!text || !s) return;
    stopSignal();
    setMsgs((p) => [...p, { sender: "user", message: text, timestamp: new Date() }]);
    s.emit("userMessage", { sessionId: sessionRef.current, message: text });
    if (!expectBotReply || humanMode) return;
    botWaitStarted.current = Date.now();
    setTypist({ kind: "bot" });
    clearBotWait();
    botWatchdog.current = setTimeout(() => {
      setTypist((t) => (t?.kind === "bot" ? null : t));
      setMsgs((p) => [...p, {
        sender: "system",
        message: "Our assistant is waking up. Give it a few seconds and send your message again, or email support@bellmontexpress.com.",
        timestamp: new Date(),
      }]);
    }, 15000);
  };

  /* Quick actions and topics: links open the page (and close the sheet on
     phones, where it covers the page); everything else is a message. */
  const pick = (q: QuickAction) => {
    if (q.value.startsWith("link:")) {
      router.push(q.value.slice(5));
      if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
      return;
    }
    sendRaw(q.value);
  };

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendRaw(t);
    inputRef.current?.focus();
  };

  /* Grow the box with the message, up to about five lines. */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    // a scrollbar only once the message is taller than the box
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }, [input, open]);

  const attach = (file: File) => {
    if (!ALLOWED_ATTACHMENT_MIME.test(file.type)) {
      setMsgs((p) => [...p, { sender: "system", message: "Attach a PNG, JPG, GIF, WebP, HEIC, or PDF file.", timestamp: new Date() }]);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setMsgs((p) => [...p, { sender: "system", message: "Attachments must be 5 MB or smaller.", timestamp: new Date() }]);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setMsgs((p) => [...p, { sender: "system", message: "The attachment could not be read. Try again.", timestamp: new Date() }]);
    reader.onload = () => sendRaw(encodeAttachment({ name: file.name, type: file.type, size: file.size, data: String(reader.result) }), false);
    reader.readAsDataURL(file);
  };

  const status = !connected
    ? "Connecting…"
    : typist?.kind === "agent"
      ? `${typist.name} is typing…`
      : agentName
        ? `${agentName} · Online`
        : humanMode
          ? "Waiting for a member of the team…"
          : "Online · usually replies in minutes";

  const lastQuick = [...msgs].reverse().find((m) => m.sender !== "user" && m.sender !== "system");

  return (
    <>
      {open ? (
        <button
          onClick={() => setOpen(false)}
          aria-label="Close support chat"
          className="fixed bottom-5 right-5 z-50 hidden h-14 w-14 sm:flex items-center justify-center rounded-full bg-[#1e2950] text-white shadow-[0_12px_30px_rgba(30,41,80,.3)] transition-transform hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Open live chat" className="lc-bubble">
          <span className="lc-dot" aria-hidden="true" />
          <span className="lc-live">Live</span>
          <span className="lc-chat">Chat</span>
        </button>
      )}

      {open && (
        <div className="chat-sheet lcw fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[600px] sm:max-h-[calc(100dvh-8rem)] sm:w-[min(400px,calc(100vw-2.5rem))] sm:rounded-[1.35rem] sm:border sm:border-line sm:shadow-2xl" role="dialog" aria-label="Live chat">
          <header className={`chat-sheet__header lcw-head ${started ? "lcw-head--compact" : ""}`}>
            <div className="lcw-head__bar">
              <span className="lcw-head__mark"><LogoMark size={26} /></span>
              <div className="min-w-0">
                <p className="lcw-head__name">Bellmont Support</p>
                <p className="lcw-head__status" aria-live="polite">
                  <span className={`lcw-dot ${connected ? "" : "lcw-dot--off"}`} aria-hidden="true" />
                  {status}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close live chat" className="lcw-head__close sm:hidden">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="lcw-head__intro" aria-hidden={started}>
              <p className="lcw-head__title">How can we help?</p>
              <p className="lcw-head__sub">Ask about a shipment, rates or cold chain — or pick a topic.</p>
            </div>
            <TopicStrip onPick={pick} />
          </header>

          <div ref={listRef} className="lcw-list" role="log" aria-live="polite" aria-label="Conversation">
            {msgs.map((m, i) => {
              const next = msgs[i + 1];
              const showMeta = !next || next.sender !== m.sender;
              return <Bubble key={i} msg={m} showMeta={showMeta} />;
            })}

            {lastQuick?.quickActions && lastQuick.quickActions.length > 0 && msgs[msgs.length - 1] === lastQuick && !typist && (
              <div className="lcw-quick">
                {lastQuick.quickActions.map((q) => (
                  <button key={q.value} type="button" onClick={() => pick(q)} className="lcw-chip lcw-chip--quick">
                    {q.label}
                    {q.value.startsWith("link:") && <span aria-hidden="true"> ↗</span>}
                  </button>
                ))}
              </div>
            )}

            {typist && (
              <div className="lcw-row lcw-typing">
                <Avatar sender={typist.kind === "agent" ? "admin" : "bot"} name={typist.kind === "agent" ? typist.name : undefined} />
                <div className="lcw-col">
                  <div className="lcw-bubble lcw-bubble--typing" aria-hidden="true">
                    <span /><span /><span />
                  </div>
                  <span className="lcw-meta">
                    {typist.kind === "agent" ? `${typist.name} is typing` : "Bellmont Assistant is typing"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={send} className="chat-sheet__composer lcw-composer">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) attach(f); e.target.value = ""; }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach a photo or PDF" className="lcw-icon-btn">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 12.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 4.9a3.7 3.7 0 0 1 5.2 5.2l-8.3 8.3a1.85 1.85 0 0 1-2.6-2.6l7.6-7.6" />
              </svg>
            </button>
            <div className={`lcw-field ${input.trim() ? "lcw-field--active" : ""}`}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => { setInput(e.target.value); signalTyping(); }}
                onBlur={stopSignal}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Write a message…"
                aria-label="Message"
                className="lcw-input"
              />
            </div>
            <button type="submit" disabled={!input.trim()} aria-label="Send" className="lcw-send">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M3 11l18-8-8 18-2.5-7.5z" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
