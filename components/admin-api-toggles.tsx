"use client";

import { useEffect, useState } from "react";

export interface ApiServiceToggle {
  key: string;
  name: string;
  description: string;
  category: "email" | "bot" | "alerts" | "forex" | "dispatch";
  enabled: boolean;
  notes?: string;
}

export function AdminApiTogglesCard() {
  const [services, setServices] = useState<ApiServiceToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadToggles() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/api-toggles", { credentials: "include" });
      const data = await res.json();
      if (data.success && Array.isArray(data.services)) {
        setServices(data.services);
      } else {
        throw new Error(data.error || "Failed to load API service toggles");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to load API service status." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadToggles();
  }, []);

  async function handleToggle(serviceKey: string, currentEnabled: boolean) {
    const nextState = !currentEnabled;
    setUpdatingKey(serviceKey);
    setFeedback(null);

    // Optimistically update UI
    setServices((prev) =>
      prev.map((s) => (s.key === serviceKey ? { ...s, enabled: nextState } : s))
    );

    try {
      const res = await fetch("/api/admin/api-toggles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceKey,
          enabled: nextState,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update API service toggle");
      }

      setFeedback({
        type: "success",
        message: `${data.service?.name || serviceKey} is now ${nextState ? "ENABLED (Live)" : "DISABLED (Paused)"}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      // Revert optimistic update
      setServices((prev) =>
        prev.map((s) => (s.key === serviceKey ? { ...s, enabled: currentEnabled } : s))
      );
      setFeedback({
        type: "error",
        message: err.message || "Failed to update service toggle.",
      });
    } finally {
      setUpdatingKey(null);
    }
  }

  const categoryIcons: Record<string, string> = {
    email: "✉️",
    bot: "🤖",
    alerts: "🔔",
    forex: "💱",
    dispatch: "⚡",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1618] p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#baff00]/10 text-base">
              ⚡
            </span>
            <h3 className="text-lg font-black text-white tracking-tight">
              External API Services &amp; Gateway Controls
            </h3>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-300">
              On/Off Killswitches
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Instantly enable or disable individual third-party API services and webhooks. When an API is paused, VEXARO safely bypasses external calls, prevents outgoing network requests, and preserves wallet transactions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadToggles}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
        >
          <span>↻</span>
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-medium flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === "success" ? "✓" : "⚠️"}</span>
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Services List */}
      {loading && services.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
          Loading API service toggles...
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((svc) => {
            const isUpdating = updatingKey === svc.key;
            return (
              <div
                key={svc.key}
                className={`relative flex flex-col justify-between rounded-xl border p-4.5 transition-all ${
                  svc.enabled
                    ? "border-white/10 bg-[#101e21]/70 hover:border-white/20"
                    : "border-red-500/20 bg-red-950/10 opacity-80 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{categoryIcons[svc.category] || "🔌"}</span>
                      <h4 className="text-sm font-black text-white truncate">
                        {svc.name}
                      </h4>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggle(svc.key, svc.enabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        svc.enabled ? "bg-[#baff00]" : "bg-slate-700"
                      } ${isUpdating ? "opacity-50 cursor-wait" : ""}`}
                      role="switch"
                      aria-checked={svc.enabled}
                      title={`Click to ${svc.enabled ? "Disable" : "Enable"} ${svc.name}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#07100f] shadow ring-0 transition duration-200 ease-in-out ${
                          svc.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300/90 leading-relaxed mb-3">
                    {svc.description}
                  </p>
                </div>

                <div className="mt-2 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-400">
                    key: {svc.key}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
                      svc.enabled
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/15 text-red-400 border border-red-500/30"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${svc.enabled ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                    <span>{svc.enabled ? "ONLINE (Active)" : "DISABLED (Paused)"}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="rounded-xl border border-white/5 bg-black/30 p-3.5 text-[11px] text-slate-400 flex items-start gap-2.5">
        <span className="text-sm">💡</span>
        <div className="leading-relaxed">
          <strong className="text-slate-200">How API Toggles Work:</strong>
          {" "}Disabling an API immediately halts outgoing network calls for that provider. For example, if you disable <strong>Resend Customer Email Delivery</strong>, users will still be able to place orders and purchase subscriptions, but no external email API requests will be dispatched to Resend. Toggle any service back on at any time to resume live requests.
        </div>
      </div>
    </div>
  );
}
