"use client";

import React, { useState, useEffect } from "react";

interface EventItem {
  id: string;
  title: string;
  description: string;
  status: "upcoming" | "live" | "ended";
  type: string;
  streamUrl: string;
  rewardAmount: number;
  rewardType: string;
  autoCreditOnJoin: boolean;
  maxWinners: number;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  participantCount: number;
  winnersCount: number;
  totalAwarded: number;
  createdAt: string;
}

interface Participant {
  id: string;
  eventId: string;
  userId: number;
  userName: string;
  userEmail: string;
  status: "entered" | "winner" | "claimed";
  rewardAmount: number;
  rewardCreditedAt?: string | null;
  currentBalance: number;
  createdAt: string;
}

export function LiveEventsAdminView() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for hosting new event
  const [showHostForm, setShowHostForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [rewardAmount, setRewardAmount] = useState(50);
  const [autoCreditOnJoin, setAutoCreditOnJoin] = useState(true);
  const [status, setStatus] = useState<"upcoming" | "live">("live");

  // Host Announcement in Chat
  const [hostChatMsg, setHostChatMsg] = useState("");
  const [sendingHostMsg, setSendingHostMsg] = useState(false);

  // Load events
  async function loadEvents() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
        if (!selectedEventId && data.events.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load live events.");
    } finally {
      setLoading(false);
    }
  }

  // Load participants for selected event
  async function loadParticipants(eventId: string) {
    try {
      setLoadingParticipants(true);
      const res = await fetch(`/api/admin/events/participants?eventId=${encodeURIComponent(eventId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingParticipants(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadParticipants(selectedEventId);
    }
  }, [selectedEventId]);

  // Create new event
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          streamUrl,
          rewardAmount,
          autoCreditOnJoin,
          status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Event hosted successfully!");
        setShowHostForm(false);
        setTitle("");
        setDescription("");
        setStreamUrl("");
        await loadEvents();
        if (data.event?.id) setSelectedEventId(data.event.id);
      } else {
        setError(data.error || "Failed to create event");
      }
    } catch (err) {
      setError("Error creating event");
    } finally {
      setBusy(false);
    }
  }

  // Update status (Go live / End event)
  async function handleUpdateStatus(eventId: string, nextStatus: "live" | "upcoming" | "ended") {
    try {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Event status changed to ${nextStatus.toUpperCase()}`);
        await loadEvents();
      } else {
        setError(data.error || "Failed to update event status");
      }
    } catch (err) {
      setError("Error updating event status");
    } finally {
      setBusy(false);
    }
  }

  // Set 12-hour duration
  async function handleSet12Hours(eventId: string) {
    try {
      setBusy(true);
      setError(null);
      const endsAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, endedAt: endsAt, status: "live" }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Event timer set to 12 hours from now!");
        await loadEvents();
      } else {
        setError(data.error || "Failed to set 12-hour timer");
      }
    } catch (err) {
      setError("Error setting 12-hour timer");
    } finally {
      setBusy(false);
    }
  }

  // Spin Lucky Draw Winner
  async function handleSpinLuckyWinner() {
    if (!selectedEventId) return;
    try {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/admin/events/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spin_lucky_winner", eventId: selectedEventId }),
      });
      const data = await res.json();
      if (data.success && data.winner) {
        setSuccess(`🎉 LUCKY DRAW WINNER: ${data.winner.name} (${data.winner.email}) won ₨${data.winner.amount} balance!`);
        await loadParticipants(selectedEventId);
        await loadEvents();
      } else {
        setError(data.error || "No eligible participants found for lucky draw.");
      }
    } catch (err) {
      setError("Failed to spin lucky winner.");
    } finally {
      setBusy(false);
    }
  }

  // Bulk Award All Participants
  async function handleBulkAward() {
    if (!selectedEventId) return;
    if (!confirm("Are you sure you want to award the giveaway reward to ALL uncredited participants?")) return;

    try {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/admin/events/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_award_all", eventId: selectedEventId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ Successfully awarded ${data.count} participants (Total: ₨${data.amountAwarded})!`);
        await loadParticipants(selectedEventId);
        await loadEvents();
      } else {
        setError(data.error || "Failed to award participants.");
      }
    } catch (err) {
      setError("Error awarding participants");
    } finally {
      setBusy(false);
    }
  }

  // Award Single Participant
  async function handleAwardSingle(userId: number, customAmount?: number) {
    if (!selectedEventId) return;
    try {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/admin/events/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "award_single",
          eventId: selectedEventId,
          userId,
          amount: customAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Reward awarded successfully!");
        await loadParticipants(selectedEventId);
        await loadEvents();
      } else {
        setError(data.error || "Failed to award user.");
      }
    } catch (err) {
      setError("Error awarding user");
    } finally {
      setBusy(false);
    }
  }

  // Send Host Message into Chat
  async function handleSendHostChat(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId || !hostChatMsg.trim()) return;

    try {
      setSendingHostMsg(true);
      const res = await fetch("/api/events/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          message: hostChatMsg.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHostChatMsg("");
        setSuccess("Host message broadcasted into live event chat!");
      }
    } catch (err) {
      setError("Failed to broadcast message");
    } finally {
      setSendingHostMsg(false);
    }
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-white/10 bg-[#0d171a] p-6 sm:p-7 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-pink-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-pink-400">
              VEXARO EVENT HOSTING DECK
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-white">
            Host &amp; Manage Live On-Site Events
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl leading-relaxed">
            Host live events directly on the website. Run real-time giveaways, auto-credit ₨50 balance, spin random lucky draws, and interact with participants in the live arena.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/live-event"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 px-4 py-2.5 text-xs font-black text-pink-300 transition flex items-center gap-1.5 shadow"
          >
            <span>👁️ Open Live Arena (/live-event)</span>
            <span>↗</span>
          </a>
          <button
            type="button"
            onClick={() => setShowHostForm(!showHostForm)}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-pink-500/25 transition flex items-center gap-1.5"
          >
            <span>{showHostForm ? "✕ Close Form" : "🎪 Host New Event"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/15 p-4 text-xs font-bold text-rose-200">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-xs font-bold text-emerald-200">
          ✅ {success}
        </div>
      )}

      {/* Host New Event Form Modal/Drawer */}
      {showHostForm && (
        <div className="rounded-3xl border border-pink-500/40 bg-[#121921] p-6 sm:p-7 shadow-2xl animate-in fade-in duration-200">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <span>🎪</span> Host a New Live Event &amp; Giveaway
          </h3>

          <form onSubmit={handleCreateEvent} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300">Event Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🎉 Grand 9:00 PM Live Event: Join & Win Free ₨50 Balance!"
                className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#091114] px-4 text-sm text-white outline-none focus:border-pink-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300">Description &amp; Event Rules</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Welcome instructions, giveaway details, and how participants win..."
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#091114] p-3 text-sm text-white outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Giveaway Reward (PKR)</label>
              <input
                type="number"
                min={1}
                value={rewardAmount}
                onChange={(e) => setRewardAmount(Number(e.target.value))}
                className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#091114] px-4 text-sm text-white outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#091114] px-4 text-sm text-white outline-none focus:border-pink-500"
              >
                <option value="live">🔴 Go Live Immediately</option>
                <option value="upcoming">⏳ Schedule as Upcoming</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300">
                Optional Stream Embed URL (Facebook Live embed, YouTube Live, or leave empty for chat-only stage)
              </label>
              <input
                type="url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/... or https://www.facebook.com/plugins/video.php?..."
                className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#091114] px-4 text-sm text-white outline-none focus:border-pink-500 font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="autoCreditCheck"
                checked={autoCreditOnJoin}
                onChange={(e) => setAutoCreditOnJoin(e.target.checked)}
                className="h-4 w-4 rounded accent-pink-500 cursor-pointer"
              />
              <label htmlFor="autoCreditCheck" className="text-xs font-bold text-slate-200 cursor-pointer">
                ⚡ Instant Auto-Credit: Automatically add ₨{rewardAmount} balance to each member who joins on-site.
                <span className="block text-[11px] text-slate-400 font-normal">
                  (Uncheck if you want to pick lucky draw winners manually using the Spin wheel)
                </span>
              </label>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowHostForm(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2.5 text-xs font-black text-white shadow hover:scale-105 transition disabled:opacity-50"
              >
                {busy ? "Launching Event..." : "🚀 Launch Event Now"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Event Selection & Control Deck */}
      {events.length > 0 && selectedEvent && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left Column: All Hosted Events List */}
          <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-5 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 px-1">
              Events History ({events.length})
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {events.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedEventId(e.id)}
                  className={`w-full text-left rounded-2xl p-4 transition border cursor-pointer ${
                    selectedEventId === e.id
                      ? "border-pink-500/50 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-transparent"
                      : "border-white/5 bg-[#0b1316] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                        e.status === "live"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : e.status === "upcoming"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {e.status === "live" ? "🔴 LIVE" : e.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      👥 {e.participantCount} joined
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-white truncate">{e.title}</h4>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Reward: ₨{e.rewardAmount}</span>
                    <span>Won: ₨{e.totalAwarded}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Event Live Controls & Giveaway Tools */}
          <div className="space-y-6">
            {/* Control Panel Card */}
            <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        selectedEvent.status === "live"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                          : "bg-slate-500/20 text-slate-300"
                      }`}
                    >
                      {selectedEvent.status === "live" ? "🔴 LIVE NOW" : selectedEvent.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {selectedEvent.id.slice(0, 8)}...
                    </span>
                    {selectedEvent.endedAt && (
                      <span className="rounded-full bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-mono text-amber-300">
                        ⏳ Ends: {new Date(selectedEvent.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg sm:text-xl font-black text-white">
                    {selectedEvent.title}
                  </h3>
                </div>

                {/* Quick Status Control Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSet12Hours(selectedEvent.id)}
                    className="rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 text-xs font-bold text-amber-300 shadow transition"
                    title="Set event to run for next 12 hours"
                  >
                    ⏳ Set 12h Limit
                  </button>
                  {selectedEvent.status !== "live" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleUpdateStatus(selectedEvent.id, "live")}
                      className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 px-4 py-2 text-xs font-black text-white shadow transition"
                    >
                      🔴 Go Live
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleUpdateStatus(selectedEvent.id, "upcoming")}
                      className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-300"
                    >
                      ⏸️ Pause Event
                    </button>
                  )}

                  {selectedEvent.status !== "ended" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleUpdateStatus(selectedEvent.id, "ended")}
                      className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300"
                    >
                      🏁 End Event
                    </button>
                  )}
                </div>
              </div>

              {/* Giveaway Tools & Actions Bar */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-amber-300">🎲 Lucky Draw Spinner</span>
                    <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                      Selects a random uncredited participant and awards ₨{selectedEvent.rewardAmount} with chat announcement.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || participants.length === 0}
                    onClick={handleSpinLuckyWinner}
                    className="mt-3 w-full rounded-xl bg-amber-400 hover:bg-amber-300 py-2.5 text-xs font-black text-black shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    🎲 Spin / Pick Winner
                  </button>
                </div>

                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-purple-300">⚡ Bulk Award All</span>
                    <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                      Award ₨{selectedEvent.rewardAmount} balance to all {participants.filter((p) => p.status === "entered").length} pending participants at once.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || participants.filter((p) => p.status === "entered").length === 0}
                    onClick={handleBulkAward}
                    className="mt-3 w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-black text-white shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    ⚡ Award All ({participants.filter((p) => p.status === "entered").length})
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-slate-300">📊 Event Stats</span>
                    <div className="mt-2 space-y-1 text-xs font-mono text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Joined:</span>
                        <strong className="text-white">{participants.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Winners/Claimed:</span>
                        <strong className="text-emerald-400">
                          {participants.filter((p) => p.status !== "entered").length}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Distributed:</span>
                        <strong className="text-amber-400">₨{selectedEvent.totalAwarded}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadParticipants(selectedEvent.id)}
                    className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
                  >
                    ↻ Refresh Queue
                  </button>
                </div>
              </div>

              {/* Host Broadcast to Live Chat */}
              <form onSubmit={handleSendHostChat} className="mt-5 pt-4 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={hostChatMsg}
                  onChange={(e) => setHostChatMsg(e.target.value)}
                  placeholder="Broadcast official host announcement into live event chat..."
                  className="flex-1 h-10 rounded-xl border border-white/10 bg-[#091114] px-4 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={!hostChatMsg.trim() || sendingHostMsg}
                  className="rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-black disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {sendingHostMsg ? "..." : "📢 Broadcast Chat"}
                </button>
              </form>
            </div>

            {/* Participants Queue Table */}
            <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-6 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-white">
                  Event Participants &amp; Claims ({participants.length})
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {participants.filter((p) => p.status !== "entered").length} Awarded
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b1418] text-slate-500 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">Joined At</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Awarded</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {loadingParticipants ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Loading participants...
                        </td>
                      </tr>
                    ) : participants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No participants have joined this event yet. Share the event link:{" "}
                          <strong className="text-pink-400">/live-event</strong>
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white">{p.userName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{p.userEmail}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-emerald-400">
                            ₨{p.currentBalance.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-400 text-[11px]">
                            {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                                p.status === "winner"
                                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                  : p.status === "claimed"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold">
                            {p.rewardAmount > 0 ? (
                              <span className="text-emerald-400 font-mono">₨{p.rewardAmount}</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {p.status === "entered" ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAwardSingle(p.userId, selectedEvent.rewardAmount)}
                                className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 px-2.5 py-1 text-[11px] font-black text-emerald-300 transition"
                              >
                                Award ₨{selectedEvent.rewardAmount}
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-bold">✓ Credited</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
