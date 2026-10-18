"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface EventData {
  id: string;
  title: string;
  description: string;
  status: "upcoming" | "live" | "ended";
  type: string;
  streamUrl: string;
  rewardAmount: number;
  autoCreditOnJoin: boolean;
  maxWinners: number;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  participantCount: number;
  totalAwarded: number;
}

interface UserParticipation {
  status: "entered" | "winner" | "claimed";
  reward_amount: number;
  reward_credited_at?: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  event_id: string;
  user_id?: number | null;
  sender_name: string;
  is_host: boolean;
  message: string;
  created_at: string;
}

export default function LiveEventArenaPage() {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [userParticipation, setUserParticipation] = useState<UserParticipation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; isAdmin: boolean } | null>(null);

  const [inputMsg, setInputMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinSuccessNotice, setJoinSuccessNotice] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load event details & initial messages
  async function loadEventData(isInitial = false) {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch("/api/events/active", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
        setUserParticipation(data.userParticipation);
        setCurrentUser(data.currentUser);
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error("Failed to load live event data:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  useEffect(() => {
    loadEventData(true);

    // Auto poll chat & event status every 4 seconds
    const interval = setInterval(() => {
      loadEventData(false);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll chat to bottom on new messages
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Join & Claim Giveaway
  async function handleJoinEvent() {
    if (!event) return;
    if (!currentUser) {
      window.location.href = "/login?redirect=/live-event";
      return;
    }

    try {
      setJoining(true);
      const res = await fetch("/api/events/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.newBalancePkr !== undefined) {
          setCurrentBalance(data.newBalancePkr);
        }
        if (data.result.credited) {
          setJoinSuccessNotice(`🎉 SUCCESS! ₨${data.result.rewardAmount} has been credited directly to your VEXARO wallet!`);
        } else {
          setJoinSuccessNotice("🎟️ You have successfully entered the live giveaway! Stay tuned for winner announcements!");
        }
        await loadEventData(false);
      } else {
        alert(data.error || "Unable to join event.");
      }
    } catch (err) {
      alert("Failed to join event. Please check connection.");
    } finally {
      setJoining(false);
    }
  }

  // Send Chat Message
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputMsg.trim() || !event || sendingMsg) return;

    if (!currentUser) {
      window.location.href = "/login?redirect=/live-event";
      return;
    }

    const textToSend = inputMsg.trim();
    setInputMsg("");

    try {
      setSendingMsg(true);
      const res = await fetch("/api/events/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          message: textToSend,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else if (!data.success) {
        alert(data.error || "Failed to send message.");
      }
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setSendingMsg(false);
    }
  }

  function sendQuickReaction(emoji: string) {
    setInputMsg((prev) => (prev ? `${prev} ${emoji}` : emoji));
  }

  return (
    <div className="min-h-screen bg-[#07100f] text-slate-100 font-sans selection:bg-pink-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[140px]" />
        <div className="absolute top-1/3 right-10 h-[450px] w-[450px] rounded-full bg-pink-600/10 blur-[130px]" />
        <div className="absolute bottom-10 left-10 h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      {/* Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1418]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-[#baff00]/30 shadow-[0_0_15px_rgba(186,255,0,0.2)]">
              <img src="/logo.png" alt="VEXARO" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black text-white group-hover:text-pink-400 transition">
                VEXARO <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">LIVE ARENA</span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {currentUser?.isAdmin && (
              <a
                href="/admin?tab=Live Events"
                className="rounded-xl border border-purple-500/40 bg-purple-500/20 px-3.5 py-1.5 text-xs font-black text-purple-300 hover:bg-purple-500 hover:text-white transition flex items-center gap-1.5 shadow"
              >
                <span>👑 Host Deck</span>
              </a>
            )}

            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs sm:text-sm font-bold text-slate-200 hover:bg-white/10 hover:text-white transition"
            >
              Dashboard →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-10 w-10 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-300">Entering Live Arena...</p>
          </div>
        ) : !event ? (
          <div className="rounded-3xl border border-white/10 bg-[#0d171a] p-10 text-center max-w-xl mx-auto my-12">
            <span className="text-5xl">🎪</span>
            <h2 className="mt-4 text-2xl font-black text-white">No Live Events Right Now</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Stay tuned! The host will schedule the next live event &amp; giveaway shortly. You can also join our WhatsApp Channel for instant event notifications.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/dashboard" className="rounded-xl bg-[#baff00] px-5 py-2.5 text-xs font-black text-[#07100f]">
                Open Dashboard
              </Link>
              <a
                href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-xs font-bold text-emerald-300"
              >
                Join WhatsApp Channel
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
            {/* Left Column: Live Stage & Giveaway Card */}
            <div className="space-y-6">
              {/* Event Header Stage */}
              <div className="relative overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-br from-[#1b0d2d]/90 via-[#120f26]/90 to-[#0c181f]/95 p-6 sm:p-8 shadow-2xl shadow-pink-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {event.status === "live" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-300 animate-pulse">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400 animate-ping" />
                        🔴 LIVE NOW ON SITE
                      </span>
                    ) : event.status === "upcoming" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-300">
                        ⏳ UPCOMING EVENT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/20 border border-slate-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-300">
                        🏁 EVENT CONCLUDED
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">
                      👥 {event.participantCount} Participants
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    Host: <strong className="text-white">Talha Bashir (Admin)</strong>
                  </span>
                </div>

                <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  {event.title}
                </h1>

                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>

                {/* Optional Stream / Video Embed Player */}
                {event.streamUrl ? (
                  <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black aspect-video relative shadow-2xl">
                    <iframe
                      src={event.streamUrl}
                      title="Live Event Broadcast"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 text-lg">
                        🎙️
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-purple-300">Live Interactive Arena</p>
                        <p className="text-xs text-slate-400">Live chat &amp; real-time giveaway station active</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                      Active Session
                    </span>
                  </div>
                )}
              </div>

              {/* LIVE GIVEAWAY STATION CARD */}
              <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-r from-[#211604] via-[#1a1205] to-[#120e24] p-6 sm:p-8 shadow-2xl shadow-amber-500/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-3xl text-black shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                      🎁
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                          ON-SITE LIVE GIVEAWAY
                        </span>
                        <span className="text-xs font-bold text-amber-200">
                          Total Won: ₨{event.totalAwarded}
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl sm:text-2xl font-black text-white">
                        Claim FREE ₨{event.rewardAmount} Wallet Balance
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Join the event right now on VEXARO to claim your free wallet balance credited instantly to test any SMM services!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feedback notices */}
                {joinSuccessNotice && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-xs sm:text-sm font-bold text-emerald-200 flex items-center gap-2 animate-in fade-in duration-300">
                    <span>✅</span>
                    <span>{joinSuccessNotice}</span>
                  </div>
                )}

                {/* Giveaway Action Box */}
                <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {!currentUser ? (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-amber-200 font-semibold">
                        Log in or sign up to claim your ₨{event.rewardAmount} giveaway reward:
                      </p>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                          href="/login?redirect=/live-event"
                          className="flex-1 sm:flex-none text-center rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 text-xs font-black text-black shadow transition"
                        >
                          Login to Claim
                        </Link>
                        <Link
                          href="/signup?redirect=/live-event"
                          className="flex-1 sm:flex-none text-center rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition"
                        >
                          Sign Up Free
                        </Link>
                      </div>
                    </div>
                  ) : userParticipation ? (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-300 font-bold">
                        <span>🎉</span>
                        <span>
                          {userParticipation.reward_credited_at
                            ? `You have claimed ₨${userParticipation.reward_amount} reward! Balance credited.`
                            : "You are entered into this live giveaway! Awaiting host draw."}
                        </span>
                      </div>
                      <Link
                        href="/dashboard"
                        className="rounded-xl bg-[#baff00] hover:bg-[#d2ff5a] px-5 py-2.5 text-xs font-black text-[#07100f] shadow transition"
                      >
                        Spend Balance on Services →
                      </Link>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-slate-300">
                        Logged in as: <strong className="text-white">{currentUser.name}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleJoinEvent}
                        disabled={joining || event.status === "ended"}
                        className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-black text-white shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:scale-105 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        {joining ? "Claiming ₨50 Balance..." : `🎉 JOIN EVENT & CLAIM FREE ₨${event.rewardAmount} NOW ↗`}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Help / WhatsApp Support */}
              <div className="rounded-2xl border border-white/10 bg-[#0d171a] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  Questions or special queries during the live event?
                </span>
                <a
                  href="https://wa.me/923088180234?text=Hello%20VEXARO%20Support,%20I%20am%20in%20the%20on-site%20Live%20Event!"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:underline"
                >
                  <span>💬 WhatsApp Support (+92 308 8180234)</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Right Column: Live Event Chat Feed */}
            <div className="flex flex-col h-[650px] sm:h-[720px] rounded-3xl border border-white/10 bg-[#0c1518] shadow-2xl overflow-hidden">
              {/* Chat Header */}
              <div className="border-b border-white/10 bg-[#0f1b1f] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-sm font-black text-white">Live Event Chat</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {messages.length} messages
                </span>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-6">
                    <span className="text-3xl mb-2">💬</span>
                    <p className="text-xs">No messages yet. Be the first to say hello to the host!</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-2xl p-3 text-xs leading-relaxed transition ${
                        m.is_host
                          ? "border border-amber-400/40 bg-gradient-to-r from-amber-400/15 via-purple-500/15 to-transparent text-amber-100 shadow-md"
                          : "border border-white/5 bg-white/[0.03] text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`font-bold truncate ${m.is_host ? "text-amber-300 font-black" : "text-slate-300"}`}>
                            {m.sender_name}
                          </span>
                          {m.is_host && (
                            <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300 border border-amber-400/40">
                              👑 HOST
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Reactions Bar */}
              <div className="border-t border-white/5 bg-[#0b1316] px-3 py-1.5 flex items-center justify-between gap-1 text-sm">
                <span className="text-[10px] text-slate-500 font-mono">React:</span>
                <div className="flex items-center gap-1">
                  {["🔥", "🎉", "🚀", "👏", "₨50"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendQuickReaction(emoji)}
                      className="rounded-lg bg-white/5 hover:bg-white/10 px-2 py-0.5 text-xs transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#0e191d]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder={currentUser ? "Say something in live chat..." : "Log in to chat..."}
                    disabled={!currentUser || sendingMsg}
                    className="flex-1 rounded-xl border border-white/10 bg-[#07100f] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMsg.trim() || sendingMsg || !currentUser}
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-4 py-2.5 text-xs font-black text-white shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {sendingMsg ? "..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
