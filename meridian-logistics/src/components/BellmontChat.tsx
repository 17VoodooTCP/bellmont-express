"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  ALLOWED_ATTACHMENT_MIME,
  encodeAttachment,
  MAX_ATTACHMENT_BYTES,
  parseAttachment,
} from "@/lib/chatAttachment";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type QuickAction = { label: string; value: string };
type Msg = {
  sender: "user" | "bot" | "admin" | "system";
  message: string;
  timestamp: string | Date;
  quickActions?: QuickAction[];
};
/* The interim backend is shared with the legacy product. Rebrand its copy. */
const rebrand = (m: Msg): Msg =>
  m.sender === "user" || parseAttachment(m.message)
    ? m
    : { ...m, message: m.message.replace(/Velonex24|Velonex/g, "Bellmont Express").replace(/VLX-/g, "VLX-") };

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.sender === "user";
  const att = parseAttachment(msg.message);

  if (msg.sender === "system") {
    return <p className="my-2 text-center text-[11px] text-ink-mute">{msg.message}</p>;
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] px-3.5 py-2 text-[14px] leading-snug ${
          mine
            ? "rounded-2xl rounded-br-[6px] bg-brand text-white"
            : "rounded-2xl rounded-bl-[6px] bg-brand-tint text-ink"
        }`}
      >
        {!mine && msg.sender === "admin" && (
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">Agent</p>
        )}
        {att ? (
          att.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={att.data} alt={att.name} className="max-h-48 rounded-lg" />
          ) : (
            <a
              href={att.data}
              download={att.name}
              className={`flex items-center gap-2 font-medium underline ${mine ? "text-white" : "text-brand-deep"}`}
            >
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
    </div>
  );
}

export default function BellmontChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [liveAgent, setLiveAgent] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const sessionRef = useRef<string>("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Scroll the message list itself. scrollIntoView would also scroll every
     scrollable ancestor — including the page — which made the whole site jump
     on phones whenever a message arrived or the panel opened. */
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, open]);

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
    s.on("disconnect", () => setConnected(false));
    s.on("sessionHistory", ({ messages }: { messages?: Msg[] }) => {
      if (messages?.length) setMsgs(messages.map(rebrand));
    });
    s.on("newMessage", (m: Msg & { sessionId?: string }) => {
      if (m.sessionId && m.sessionId !== sessionRef.current) return;
      if (m.sender === "admin" && typingWatchdog.current) {
        clearTimeout(typingWatchdog.current);
        typingWatchdog.current = null;
        setTyping(false);
      }
      setMsgs((p) => [...p, rebrand(m)]);
    });
    s.on("botReply", (m: Msg & { status?: string }) => { if (typingWatchdog.current) clearTimeout(typingWatchdog.current); setTyping(false); if (m.status === "human") setLiveAgent(true); setMsgs((p) => [...p, rebrand(m)]); });
    s.on("adminJoin", () => { setLiveAgent(true); setMsgs((p) => [...p, { sender: "system", message: "A support agent joined the conversation.", timestamp: new Date() }]); });
    s.on("sessionClosed", () => {
      setMsgs((p) => [...p, { sender: "system", message: "Conversation closed. Send a message to start a new one.", timestamp: new Date() }]);
      localStorage.removeItem("bellmont_chat_session");
    });
    s.on("typing", () => setTyping(true));
    s.on("stopTyping", () => setTyping(false));

    setMsgs([{ sender: "bot", message: "Hello, and welcome to Bellmont Express. How can we help with your shipment today?", timestamp: new Date() }]);

    return () => { s.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const typingWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendRaw = (text: string, expectBotReply = true) => {
    if (!text || !socketRef.current) return;
    if (!expectBotReply || liveAgent) {
      setTyping(false);
      if (typingWatchdog.current) { clearTimeout(typingWatchdog.current); typingWatchdog.current = null; }
      socketRef.current.emit("userMessage", { sessionId: sessionRef.current, message: text });
      return;
    }
    setTyping(true);
    if (typingWatchdog.current) clearTimeout(typingWatchdog.current);
    typingWatchdog.current = setTimeout(() => {
      setTyping(false);
      setMsgs((p) => [
        ...p,
        { sender: "system", message: "Our assistant is waking up. Give it a few seconds and send your message again, or email support@bellmontexpress.com.", timestamp: new Date() },
      ]);
    }, 15000);
    socketRef.current.emit("userMessage", { sessionId: sessionRef.current, message: text });
  };

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendRaw(t);
  };

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

  return (
    <>
      {/* launcher: a "LiveChat" speech bubble while closed, a round close
          button while the panel is open */}
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

      {/* panel */}
      {open && (
        <div className="chat-sheet fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[560px] sm:max-h-[calc(100dvh-8rem)] sm:w-[min(390px,calc(100vw-2.5rem))] sm:rounded-[1.35rem] sm:border sm:border-line sm:shadow-2xl" role="dialog" aria-label="Live chat">
          <header className="chat-sheet__header relative bg-orange px-5 pb-5 pt-4 text-white sm:py-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close live chat"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white sm:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <div>
              <p className="text-center text-sm font-medium">Send a message</p>
              <p className="mt-3 text-center text-2xl font-bold sm:mt-7">How can we help?</p>
              <p className="mt-1 text-center text-sm text-white/80">We usually respond within an hour on weekdays</p>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/80">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-white" : "bg-white/40"}`} />
                {connected ? (liveAgent ? "Live agent connected" : "Online now") : "Connecting…"}
              </p>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-white px-3.5 py-4">
            {msgs.map((m, i) => (
              <div key={i}>
                <Bubble msg={m} />
                {m.quickActions && m.quickActions.length > 0 && i === msgs.length - 1 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.quickActions.map((q) => (
                      <button
                        key={q.value}
                        onClick={() => sendRaw(q.value)}
                className="rounded-full border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-brand hover:text-white"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-[6px] bg-brand-tint px-4 py-3">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand-soft" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="chat-sheet__composer flex items-center gap-2 border-t border-line bg-[#fbfbf8] px-3 py-3">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) attach(f); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach a file"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-ocean hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 12.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 4.9a3.7 3.7 0 0 1 5.2 5.2l-8.3 8.3a1.85 1.85 0 0 1-2.6-2.6l7.6-7.6" />
              </svg>
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type here"
              aria-label="Message"
              className="min-w-0 flex-1 rounded-full bg-[#F2F2F7] px-4 py-2.5 text-base outline-none placeholder:text-ink-mute sm:text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange text-white disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M3 11l18-8-8 18-2.5-7.5z" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
