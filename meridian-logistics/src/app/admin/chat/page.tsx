"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  ChatMsg,
  ChatSessionSummary,
  getChatMessages,
  getToken,
  listChatSessions,
} from "@/lib/adminApi";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ATT = "§ATT§";

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

function Body({ text }: { text: string }) {
  if (text.startsWith(ATT)) {
    try {
      const att = JSON.parse(text.slice(ATT.length)) as { name: string; type: string; data: string };
      return att.type.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={att.data} alt={att.name} className="max-h-44 rounded-lg" />
      ) : (
        <a href={att.data} download={att.name} className="font-medium underline">
          {att.name}
        </a>
      );
    } catch { /* fall through to text */ }
  }
  return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
}

export default function AdminChatPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [active, setActive] = useState<ChatSessionSummary | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    if (!getToken()) { router.replace("/admin/login"); return; }
    void listChatSessions().then(setSessions).catch(() => router.replace("/admin/login"));

    const s = io(API, { transports: ["websocket", "polling"] });
    socketRef.current = s;
    s.on("connect", () => { setConnected(true); s.emit("adminConnect"); });
    s.on("disconnect", () => setConnected(false));
    s.on("newMessage", (m: ChatMsg & { sessionId?: string }) => {
      if (m.sessionId === activeRef.current) setMsgs((p) => [...p, m]);
      void listChatSessions().then(setSessions).catch(() => {});
    });
    s.on("sessionUpdate", () => {
      void listChatSessions().then(setSessions).catch(() => {});
      setActive((a) => a); // keep selection; status refreshes with the list
    });
    return () => { s.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = async (session: ChatSessionSummary) => {
    setActive(session);
    activeRef.current = session.sessionId;
    setMsgs(await getChatMessages(session.sessionId));
  };

  const takeOver = () => {
    if (!active) return;
    socketRef.current?.emit("adminJoin", { sessionId: active.sessionId });
    setActive({ ...active, status: "human" });
  };

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t || !active) return;
    setInput("");
    socketRef.current?.emit("adminMessage", { sessionId: active.sessionId, message: t });
  };

  const close = () => {
    if (!active) return;
    socketRef.current?.emit("closeSession", { sessionId: active.sessionId });
    setActive({ ...active, status: "closed" });
  };

  const attach = (file: File) => {
    if (!active) return;
    if (file.size > 700 * 1024) {
      alert("Attachments must be under 700 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      socketRef.current?.emit("adminMessage", {
        sessionId: active.sessionId,
        message:
          ATT +
          JSON.stringify({
            name: file.name,
            type: file.type || "application/octet-stream",
            data: reader.result,
          }),
      });
    reader.readAsDataURL(file);
  };

  const current = sessions.find((x) => x.sessionId === active?.sessionId) ?? active;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sage">Bellmont Express Admin</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold">
            Live chat
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-line"}`} aria-label={connected ? "Connected" : "Disconnected"} />
          </h1>
        </div>
        <Link href="/admin" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">
          Back to console
        </Link>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-[280px_1fr]">
        {/* sessions */}
        <div className="max-h-[70svh] overflow-y-auto rounded-2xl border border-line">
          {sessions.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-ink-mute">No conversations yet.</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => void open(s)}
              className={`block w-full border-b border-line px-4 py-3.5 text-left last:border-0 hover:bg-ocean ${
                active?.sessionId === s.sessionId ? "bg-ocean" : ""
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{s.userName || "Visitor"}</span>
                <span className="shrink-0 text-[11px] text-ink-mute">{timeAgo(s.updatedAt)}</span>
              </span>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                  s.status === "human"
                    ? "bg-green-100 text-green-700"
                    : s.status === "closed"
                      ? "bg-line text-ink-mute"
                      : "bg-sage-tint text-sage-deep"
                }`}
              >
                {s.status === "human" ? "LIVE AGENT" : s.status === "closed" ? "CLOSED" : "BOT"}
              </span>
            </button>
          ))}
        </div>

        {/* conversation */}
        <div className="flex h-[70svh] flex-col rounded-2xl border border-line">
          {!current ? (
            <p className="m-auto text-sm text-ink-mute">Select a conversation.</p>
          ) : (
            <>
              <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold">{current.userName || "Visitor"}</p>
                  <p className="notranslate text-[11px] text-ink-mute">{current.sessionId.slice(0, 24)}…</p>
                </div>
                <div className="flex gap-2">
                  {current.status === "bot" && (
                    <button onClick={takeOver} className="rounded-full bg-sage px-4 py-2 text-xs font-bold text-white hover:bg-sage-deep">
                      Take over
                    </button>
                  )}
                  {current.status !== "closed" && (
                    <button onClick={close} className="rounded-full border border-line px-4 py-2 text-xs font-semibold hover:border-ink">
                      Close chat
                    </button>
                  )}
                </div>
              </header>

              <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
                {msgs.map((m, i) =>
                  m.sender === "system" ? (
                    <p key={i} className="text-center text-[11px] text-ink-mute">{m.message}</p>
                  ) : (
                    <div key={i} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[76%] px-3.5 py-2 text-sm leading-snug ${
                          m.sender === "admin"
                            ? "rounded-2xl rounded-br-[6px] bg-[#0A84FF] text-white"
                            : "rounded-2xl rounded-bl-[6px] bg-[#E9E9EB] text-ink"
                        }`}
                      >
                        {m.sender !== "admin" && (
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-sage">
                            {m.sender === "bot" ? "Bot" : "Customer"}
                          </p>
                        )}
                        <Body text={m.message} />
                      </div>
                    </div>
                  )
                )}
                <div ref={endRef} />
              </div>

              {current.status === "human" ? (
                <form onSubmit={send} className="flex gap-2 border-t border-line p-3.5">
                  <label
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line text-ink-mute transition-colors hover:border-ink hover:text-ink"
                    aria-label="Attach a file"
                    title="Attach an image or document (under 700 KB)"
                  >
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M21 11.5 12.5 20a5.3 5.3 0 0 1-7.5-7.5L13.5 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a1.77 1.77 0 0 1-2.5-2.5L15 7.5" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) attach(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type here"
                    aria-label="Reply"
                    className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm outline-none focus:border-ink"
                  />
                  <button type="submit" disabled={!input.trim()} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-sage disabled:opacity-40">
                    Send
                  </button>
                </form>
              ) : current.status === "bot" ? (
                <p className="border-t border-line px-5 py-3.5 text-center text-xs text-ink-mute">
                  The bot is handling this conversation. Take over to reply as a live agent.
                </p>
              ) : (
                <p className="border-t border-line px-5 py-3.5 text-center text-xs text-ink-mute">
                  This conversation is closed.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
