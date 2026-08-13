"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ATT = "§ATT§"; // attachment marker embedded in the message string

type QuickAction = { label: string; value: string };
type Msg = {
  sender: "user" | "bot" | "admin" | "system";
  message: string;
  timestamp: string | Date;
  quickActions?: QuickAction[];
};
type Attachment = { name: string; type: string; data: string };

const parseAttachment = (m: string): Attachment | null => {
  if (!m.startsWith(ATT)) return null;
  try { return JSON.parse(m.slice(ATT.length)) as Attachment; } catch { return null; }
};

/* The interim backend is shared with the legacy product. Rebrand its copy. */
const rebrand = (m: Msg): Msg =>
  m.sender === "user" || m.message.startsWith(ATT)
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
            ? "rounded-2xl rounded-br-[6px] bg-[#0A84FF] text-white"
            : "rounded-2xl rounded-bl-[6px] bg-[#E9E9EB] text-[#0a0a0a]"
        }`}
      >
        {!mine && msg.sender === "admin" && (
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-sage">Agent</p>
        )}
        {att ? (
          att.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={att.data} alt={att.name} className="max-h-48 rounded-lg" />
          ) : (
            <a
              href={att.data}
              download={att.name}
              className={`flex items-center gap-2 font-medium underline ${mine ? "text-white" : "text-[#0A84FF]"}`}
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
  const socketRef = useRef<Socket | null>(null);
  const sessionRef = useRef<string>("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing, open]);

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
    s.on("newMessage", (m: Msg & { sessionId?: string }) => {
      if (m.sessionId && m.sessionId !== sessionRef.current) return;
      setMsgs((p) => [...p, rebrand(m)]);
    });
    s.on("botReply", (m: Msg) => { if (typingWatchdog.current) clearTimeout(typingWatchdog.current); setTyping(false); setMsgs((p) => [...p, rebrand(m)]); });
    s.on("adminJoin", () =>
      setMsgs((p) => [...p, { sender: "system", message: "A support agent joined the conversation.", timestamp: new Date() }])
    );
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

  const sendRaw = (text: string) => {
    if (!text || !socketRef.current) return;
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
    if (file.size > 700 * 1024) {
      setMsgs((p) => [...p, { sender: "system", message: "Attachments must be under 700 KB.", timestamp: new Date() }]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      sendRaw(ATT + JSON.stringify({ name: file.name, type: file.type || "application/octet-stream", data: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-xl transition-transform hover:scale-105"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a8 8 0 0 1-8 8H4l2.4-2.9A8 8 0 1 1 21 12z" strokeLinejoin="round" /></svg>
        )}
      </button>

      {/* panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[540px] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Bellmont Express Support</p>
              <p className="flex items-center gap-1.5 text-[11px] text-ink-mute">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-ink-mute"}`} />
                {connected ? "Online now" : "Connecting…"}
              </p>
            </div>
            <a href="mailto:support@bellmontexpress.com" className="notranslate text-[11px] font-medium text-sage hover:underline">
              support@bellmontexpress.com
            </a>
          </header>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-white px-3.5 py-4">
            {msgs.map((m, i) => (
              <div key={i}>
                <Bubble msg={m} />
                {m.quickActions && m.quickActions.length > 0 && i === msgs.length - 1 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.quickActions.map((q) => (
                      <button
                        key={q.value}
                        onClick={() => sendRaw(q.value)}
                        className="rounded-full border border-[#0A84FF] px-3 py-1 text-xs font-medium text-[#0A84FF] hover:bg-[#0A84FF] hover:text-white"
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
                <div className="flex gap-1 rounded-2xl rounded-bl-[6px] bg-[#E9E9EB] px-4 py-3">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-[#8a8a8a]" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-line px-3 py-2.5">
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
              className="min-w-0 flex-1 rounded-full bg-[#F2F2F7] px-4 py-2.5 text-sm outline-none placeholder:text-ink-mute"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A84FF] text-white disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M3 11l18-8-8 18-2.5-7.5z" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
