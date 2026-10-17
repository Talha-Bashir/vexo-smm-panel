"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import React, { memo } from "react";
import { SeoManagementView } from "@/components/admin-seo-management";
import { PlatformSettingsView } from "@/components/admin-platform-settings";
import { BlogCmsAdmin } from "@/components/admin-blog-cms";
import { AdminApiTogglesCard } from "@/components/admin-api-toggles";

type Tab =
  | "Dashboard"
  | "Users"
  | "Deposits"
  | "Orders"
  | "Services"
  | "Subscriptions"
  | "Coupons"
  | "Withdrawals"
  | "Tickets"
  | "Announcements"
  | "SEO & Meta"
  | "Blog CMS"
  | "Settings"
  | "Appearance"
  | "Activity"
  | "Sub-Admins";

const tabs: Tab[] = [
  "Dashboard",
  "Users",
  "Deposits",
  "Orders",
  "Services",
  "Subscriptions",
  "Coupons",
  "Withdrawals",
  "Tickets",
  "Announcements",
  "SEO & Meta",
  "Blog CMS",
  "Settings",
  "Appearance",
  "Activity",
  "Sub-Admins",
];

const card = "rounded-2xl border border-white/10 bg-[#111a1d]";

function money(n: number) {
  return `₨${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  if (typeof window === "undefined") return;
  const escapeCell = (val: string | number | null | undefined) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const csvContent = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#baff00]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[#cfff62]">
      {children}
    </span>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userQ, setUserQ] = useState("");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositBusyId, setDepositBusyId] = useState("");
  const [depositScreenshot, setDepositScreenshot] = useState<string | null>(null);
  const [depositFilter, setDepositFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [orders, setOrders] = useState<any[]>([]);
  const [orderQ, setOrderQ] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [usdToPkr, setUsdToPkr] = useState<number>(278.0);
  const [syncingProviders, setSyncingProviders] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ann, setAnn] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [providerBalances, setProviderBalances] = useState<any[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesLastChecked, setBalancesLastChecked] = useState<string | null>(null);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  async function api(url: string, init?: RequestInit) {
    const r = await fetch(url, { ...init, credentials: "include", cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.success) throw new Error(d?.error || "Request failed");
    return d;
  }

  async function handleSyncAllOrders() {
    setSyncingOrders(true);
    try {
      const res = await api("/api/cron/sync-orders", { method: "POST" });
      await load();
      alert(`✓ Order sync complete: ${res.totalChecked || 0} active orders checked, ${res.updatedCount || 0} updated.`);
    } catch (e) {
      alert("Order sync warning: " + (e instanceof Error ? e.message : "Sync failed"));
    } finally {
      setSyncingOrders(false);
    }
  }

  async function fetchProviderBalances() {
    setBalancesLoading(true);
    setBalancesError(null);
    try {
      const res = await api("/api/admin/check-balances");
      if (res?.providers) {
        setProviderBalances(res.providers);
        setBalancesLastChecked(new Date().toLocaleTimeString());
      }
    } catch (e) {
      setBalancesError(e instanceof Error ? e.message : "Failed to load live balances");
    } finally {
      setBalancesLoading(false);
    }
  }

  async function load() {
    setError("");
    try {
      api("/api/admin/settings")
        .then((sData) => {
          setMaintenanceActive(sData?.settings?.site_maintenance_mode === "true");
        })
        .catch(() => {});

      if (tab === "Dashboard") {
        setStats((await api("/api/admin/overview")).stats);
        fetchProviderBalances().catch(() => {});
      }
      if (tab === "Users") setUsers((await api(`/api/admin/users?q=${encodeURIComponent(userQ)}`)).users);
      if (tab === "Deposits") setDeposits((await api("/api/admin/deposits")).deposits || []);
      if (tab === "Orders") setOrders((await api(`/api/admin/orders?q=${encodeURIComponent(orderQ)}&status=${encodeURIComponent(orderStatus)}`)).orders);
      if (tab === "Services") {
        const [sData, pData] = await Promise.all([
          api("/api/admin/services"),
          api("/api/admin/providers").catch(() => ({ providers: [] })),
        ]);
        setServices(sData.services);
        setProviders(pData.providers || []);
        if (sData.usd_to_pkr) setUsdToPkr(Number(sData.usd_to_pkr));
        fetchProviderBalances().catch(() => {});
      }
      if (tab === "Withdrawals") setWithdrawals((await api("/api/admin/referrals")).withdrawals);
      if (tab === "Tickets") setTickets((await api("/api/admin/tickets")).tickets);
      if (tab === "Announcements") setAnn((await api("/api/admin/announcements")).announcements);
      if (tab === "Activity") setActivity((await api("/api/admin/activity")).activity);
      if (tab === "Sub-Admins") {
        const saData = await api("/api/admin/sub-admins");
        setSubAdmins(saData.subAdmins || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load.");
    }
  }

  const visibleTabs = useMemo(() => {
    if (!currentUser) return tabs;
    if (currentUser.is_super_admin) return tabs;
    const p = currentUser.permissions || {};
    if (p.full_access) return tabs;
    const list: Tab[] = [];
    if (p.analytics) list.push("Dashboard");
    if (p.users) list.push("Users");
    if (p.deposits) list.push("Deposits");
    if (p.orders) list.push("Orders");
    if (p.services) list.push("Services");
    if (p.subscriptions || p.services) list.push("Subscriptions");
    if (p.coupons || p.users) list.push("Coupons");
    if (p.withdrawals) list.push("Withdrawals");
    if (p.tickets) list.push("Tickets");
    if (p.announcements) list.push("Announcements");
    if (p.seo || p.settings) {
      list.push("SEO & Meta");
      list.push("Blog CMS");
    }
    if (p.settings) {
      list.push("Settings");
      list.push("Appearance");
    }
    if (p.analytics) list.push("Activity");
    return list;
  }, [currentUser]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(tab)) {
      setTab(visibleTabs[0]);
    }
  }, [visibleTabs, tab]);

  async function syncProviders() {
    try {
      setSyncingProviders(true);
      setSyncMessage("⚡ Contacting all 5 providers and running least-cost routing engine...");
      const res = await api("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      setSyncMessage(res.message || "✓ All 4 providers synced successfully!");
      await load();
      setTimeout(() => setSyncMessage(""), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Provider sync failed.");
      setSyncMessage("");
    } finally {
      setSyncingProviders(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlTab = new URLSearchParams(window.location.search).get("tab") as Tab | null;
      if (urlTab && tabs.includes(urlTab)) {
        setTab(urlTab);
      }
    }
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success || !d?.user?.is_admin) {
          window.location.href = "/";
        } else {
          setCurrentUser(d.user);
        }
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  useEffect(() => {
    load();
  }, [tab]);

  async function wallet(userId: number, mode: "add" | "deduct") {
    const amount = Number(window.prompt(`Amount to ${mode}:`, "1000"));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const reason = window.prompt("Reason:", "Admin adjustment") || "Admin adjustment";
    try {
      setBusy(true);
      await api("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount, mode, reason }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function grantBonus(userId: number, userNameOrEmail: string, currentBonus: number) {
    const inputAmount = window.prompt(
      `Add Promotional Bonus to ${userNameOrEmail}\n\nEnter bonus amount in PKR (Default: 50):`,
      "50"
    );
    if (inputAmount === null) return;
    const trimmed = inputAmount.trim();
    const amount = trimmed === "" ? 50 : Number(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid positive number for promotional bonus credit.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const res = await api("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_bonus",
          userId,
          amount,
          reason: "Manual bonus grant by admin",
        }),
      });

      // Optimistically update the user row immediately in UI
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                bonusBalancePkr: Number(res.bonusBalancePkr ?? (Number(u.bonusBalancePkr || 0) + amount)),
                bonusStatus: "CLAIMED",
                bonusReason: "ADMIN_MANUAL_GRANTED",
              }
            : u
        )
      );

      alert(res.message || `✓ Rs. ${amount} promotional bonus added successfully!`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bonus grant failed.";
      setError(msg);
      alert("❌ " + msg);
    } finally {
      setBusy(false);
    }
  }

  async function updateDeposit(depositId: string, action: "approve" | "reject", customBonusPercent?: number) {
    if (depositBusyId) return;
    let rejectionReason = "";
    if (action === "reject") {
      rejectionReason =
        window.prompt("Reason for rejection:", "Payment could not be verified.")?.trim() ||
        "Payment could not be verified.";
    }
    setDepositBusyId(depositId);
    setError("");
    try {
      await api("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositId,
          action,
          rejectionReason,
          bonusPercent: customBonusPercent,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update deposit.");
    } finally {
      setDepositBusyId("");
    }
  }

  async function resetUserPassword(userId: number, email: string) {
    const newPassword = window.prompt(`Enter new password for ${email} (minimum 6 characters):`);
    if (!newPassword || newPassword.trim().length < 6) {
      if (newPassword !== null) alert("Password must be at least 6 characters long.");
      return;
    }
    try {
      setBusy(true);
      const res = await api("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", userId, password: newPassword.trim() }),
      });
      alert(res.message || "Password reset successfully!");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password reset failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveService(s: any, silent: boolean = false) {
    try {
      if (!silent) setBusy(true);
      const res = await api("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: String(s.service || s.id),
          name: s.name,
          platform: s.platform,
          category: s.category,
          min: s.min,
          max: s.max,
          refill: s.refill,
          cancel: s.cancel,
          is_guaranteed: s.is_guaranteed,
          enabled: s.enabled,
          popular: s.popular,
          autoRoute: s.auto_route,
          activeProviderId: s.active_provider_id,
          activeRemoteServiceId: s.active_remote_service_id,
          baseRateUsd: s.base_rate_usd,
          rateMultiplier: Number(s.rate_multiplier || 1.07),
          rateUsd: s.rate_usd != null ? Number(s.rate_usd) : undefined,
          ratePkr: s.rate_pkr != null ? Number(s.rate_pkr) : undefined,
          customRatePkr: s.custom_rate_pkr != null ? Number(s.custom_rate_pkr) : (s.rate_pkr != null ? Number(s.rate_pkr) : undefined),
          description: s.description,
        }),
      });
      if (res?.service) {
        setServices((v) => v.map((x) => (String(x.service || x.id) === String(s.service || s.id) ? { ...x, ...res.service } : x)));
      }
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Service update failed.");
      throw e;
    } finally {
      if (!silent) setBusy(false);
    }
  }

  async function updateWithdrawal(withdrawalId: string, action: "approve" | "reject") {
    let rejectionReason = "";
    if (action === "reject") {
      rejectionReason = window.prompt("Reason for rejection:", "Invalid account or payment details") || "Invalid account details";
    }

    try {
      setBusy(true);
      await api("/api/admin/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action, rejectionReason }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update withdrawal.");
    } finally {
      setBusy(false);
    }
  }

  async function updateTicketStatus(ticketId: string, status: string) {
    try {
      setBusy(true);
      await api("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update ticket.");
    } finally {
      setBusy(false);
    }
  }

  async function createAnnouncement() {
    if (!title.trim() || !message.trim()) return;
    try {
      setBusy(true);
      await api("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, enabled: true }),
      });
      setTitle("");
      setMessage("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Announcement failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api(`/api/admin/announcements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  async function updateOrderStatus(id: string, status: string) {
    try {
      await api("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed.");
    }
  }

  return (
    <main className="min-h-screen bg-[#07100f] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0d171a] p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(186,255,0,0.3)] border border-[#baff00]/30">
              <img src="/logo.png" alt="VEXARO" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[.25em] text-[#baff00]">VEXARO CONTROL CENTER</p>
              {currentUser?.is_super_admin ? (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  👑 SUPER ADMIN
                </span>
              ) : currentUser?.role === "sub_admin" ? (
                <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-300">
                  🛡️ STAFF / SUB-ADMIN: {currentUser.name}
                </span>
              ) : null}
            </div>
            <h1 className="mt-1 text-3xl font-black">
              {currentUser?.is_super_admin ? "Admin Panel" : "Staff Portal"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {currentUser?.is_super_admin
                ? "Full root management: users, money, orders, services, providers, and team access."
                : "Authorized management portal: manage your assigned orders, tickets, and tasks."}
            </p>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const order = ["dark", "light"];
                const cur = document.documentElement.getAttribute("data-theme") || "dark";
                const next = order[(order.indexOf(cur) + 1) % order.length];
                document.documentElement.setAttribute("data-theme", next);
                try { localStorage.setItem("vexo_platform_theme", next); } catch {}
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-300 hover:border-[#baff00]/40 hover:text-white transition"
              title="Cycle Platform Theme (Dark / Light)"
            >
              🎨 Switch Theme
            </button>
            <a href="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:border-[#baff00]/40 transition">
              Open site
            </a>
            <button
              onClick={() => {
                fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => (location.href = "/login"));
              }}
              className="rounded-xl bg-[#baff00] px-4 py-2 text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
            >
              Logout
            </button>
          </div>
        </header>

        {maintenanceActive && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-xl border border-amber-500/30">
                ⚠️
              </span>
              <div>
                <p className="text-sm font-black text-amber-300 tracking-wide uppercase">
                  Platform Maintenance Mode is Currently Active
                </p>
                <p className="text-xs text-amber-200/80">
                  All public visitors and customers see the Maintenance screen. Only administrators can access the site.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={togglingMaintenance}
                onClick={async () => {
                  setTogglingMaintenance(true);
                  try {
                    await api("/api/admin/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ site_maintenance_mode: "false" }),
                    });
                    setMaintenanceActive(false);
                    alert("✓ Platform Maintenance Mode has been turned OFF. The website is now online for all visitors!");
                  } catch (e: any) {
                    alert("Failed to turn off maintenance mode: " + (e?.message || "Error"));
                  } finally {
                    setTogglingMaintenance(false);
                  }
                }}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-[#07100f] hover:bg-amber-300 transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {togglingMaintenance ? "Disabling..." : "🟢 Turn Off Maintenance (Go Online)"}
              </button>
              <button
                type="button"
                onClick={() => setTab("Settings")}
                className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition cursor-pointer"
              >
                Settings
              </button>
            </div>
          </div>
        )}

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                tab === t
                  ? "bg-[#baff00] text-[#07100f] shadow-[0_4px_20px_rgba(186,255,0,0.2)]"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {t === "Sub-Admins"
                ? "👥 Sub-Admins"
                : t === "Subscriptions"
                ? "⚡ Subscriptions & Tools"
                : t === "Coupons"
                ? "🎟️ Coupons"
                : t === "SEO & Meta"
                ? "🚀 SEO & Meta"
                : t === "Blog CMS"
                ? "✍️ Blog CMS"
                : t === "Settings"
                ? "⚙️ Settings"
                : t === "Appearance"
                ? "🎨 Appearance"
                : t}
            </button>
          ))}
        </nav>

        {error && <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        {tab === "Dashboard" && (
          <Dashboard
            stats={stats}
            setTab={setTab}
            balances={providerBalances}
            balancesLoading={balancesLoading}
            balancesLastChecked={balancesLastChecked}
            balancesError={balancesError}
            onRefreshBalances={fetchProviderBalances}
          />
        )}
        {tab === "Users" && (
          <Users
            users={users}
            setUsers={setUsers}
            q={userQ}
            setQ={setUserQ}
            reload={load}
            wallet={wallet}
            grantBonus={grantBonus}
            resetPass={resetUserPassword}
            busy={busy}
            services={services}
            api={api}
          />
        )}
        {tab === "Deposits" && (
          <DepositsAdmin
            deposits={deposits}
            reload={load}
            updateDeposit={updateDeposit}
            busyId={depositBusyId}
            previewScreenshot={depositScreenshot}
            setPreviewScreenshot={setDepositScreenshot}
            filter={depositFilter}
            setFilter={setDepositFilter}
          />
        )}
        {tab === "Orders" && (
          <Orders
            orders={orders}
            q={orderQ}
            setQ={setOrderQ}
            status={orderStatus}
            setStatus={setOrderStatus}
            reload={load}
            update={updateOrderStatus}
            syncing={syncingOrders}
            onSync={handleSyncAllOrders}
          />
        )}
        {tab === "Withdrawals" && <Withdrawals withdrawals={withdrawals} reload={load} update={updateWithdrawal} busy={busy} />}
        {tab === "Services" && (
          <Services
            services={services}
            setServices={setServices}
            save={saveService}
            busy={busy}
            providers={providers}
            syncProviders={syncProviders}
            syncingProviders={syncingProviders}
            syncMessage={syncMessage}
            usdToPkr={usdToPkr}
            reload={load}
            api={api}
            balances={providerBalances}
            balancesLoading={balancesLoading}
            balancesLastChecked={balancesLastChecked}
            balancesError={balancesError}
            onRefreshBalances={fetchProviderBalances}
          />
        )}
        {tab === "Subscriptions" && (
          <SubscriptionsAdmin
            api={api}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
          />
        )}
        {tab === "Coupons" && (
          <CouponsAdmin
            api={api}
            setError={setError}
            money={money}
          />
        )}
        {tab === "Tickets" && <Tickets tickets={tickets} reload={load} updateStatus={updateTicketStatus} busy={busy} />}
        {tab === "Announcements" && <Announcements ann={ann} title={title} setTitle={setTitle} message={message} setMessage={setMessage} create={createAnnouncement} del={deleteAnnouncement} busy={busy} />}
        {tab === "Activity" && <Activity rows={activity} />}
        {tab === "SEO & Meta" && <SeoManagementView />}
        {tab === "Blog CMS" && <BlogCmsAdmin />}
        {tab === "Settings" && <PlatformSettingsView />}
        {tab === "Appearance" && <AppearanceView />}
        {tab === "Sub-Admins" && (
          <SubAdminsView
            subAdmins={subAdmins}
            reload={load}
            api={api}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
          />
        )}
      </div>
    </main>
  );
}

function parseNumericBalance(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]/g, "").trim();
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function ProviderBalancesWidget({
  balances,
  loading,
  lastChecked,
  error,
  onRefresh,
}: {
  balances: any[];
  loading: boolean;
  lastChecked: string | null;
  error: string | null;
  onRefresh: () => void;
}) {
  const defaultList = [
    { id: "pak_smm", name: "PAK SMM Panels", url: "paksmmpanels.com" },
    { id: "smooth_smm", name: "Smooth SMM", url: "smoothsmm.com" },
    { id: "am_smm", name: "AM SMM Panel", url: "amsmmpanel.com" },
    { id: "pakistan_smm", name: "Pakistan SMM Panel", url: "pakistansmmpanel.pk" },
    { id: "rizvi_smm", name: "Rizvi SMM Panels", url: "rizvismmpanels.com" },
    { id: "elevatex_bot", name: "ElevateX Partner Gateway", url: "shop.elevatexbyzaid.com" },
  ];

  const balanceMap = useMemo(() => {
    const map = new Map<string, any>();
    balances.forEach((b) => map.set(b.id, b));
    return map;
  }, [balances]);

  return (
    <section className={card + " overflow-hidden p-5"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h3 className="text-base font-black text-white">Upstream Provider Balances</h3>
            <span className="rounded-full bg-[#baff00]/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#cfff62]">
              Live Monitor
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Real-time balance monitoring across all 6 SMM providers with automated low-balance alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-[11px] text-slate-400">
              Checked: <span className="font-mono text-slate-300">{lastChecked}</span>
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#baff00] px-3.5 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 0 1 8-8" strokeWidth="4" className="opacity-75" />
                </svg>
                Checking...
              </>
            ) : (
              <>
                <span>↻</span>
                Refresh Balances
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300">
          ⚠️ Balance Check Warning: {error}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {defaultList.map((dp) => {
          const live = balanceMap.get(dp.id);
          const numBal = parseNumericBalance(live?.balanceRaw ?? live?.balance);

          let badgeClass = "bg-white/5 text-slate-400";
          let dotClass = "bg-slate-500";
          let statusText = "WAITING";

          let cardClass = "border-white/5 bg-[#0b1418]";

          if (loading && !live) {
            statusText = "CHECKING...";
            badgeClass = "bg-blue-500/15 text-blue-400 border border-blue-500/30";
            dotClass = "bg-blue-400 animate-pulse";
          } else if (live?.status === "error") {
            statusText = "OFFLINE";
            badgeClass = "bg-rose-500/20 text-rose-300 border border-rose-500/40";
            dotClass = "bg-rose-500";
            cardClass = "border-rose-500/30 bg-rose-950/20";
          } else if (live?.alertLevel === "CRITICAL") {
            statusText = "CRITICAL (<$5)";
            badgeClass = "bg-red-500/20 text-red-300 border border-red-500/40";
            dotClass = "bg-red-400 animate-ping";
            cardClass = "border-red-500/30 bg-red-950/20";
          } else if (live?.alertLevel === "LOW") {
            statusText = "LOW (<$15)";
            badgeClass = "bg-amber-500/20 text-amber-300 border border-amber-500/40";
            dotClass = "bg-amber-400";
            cardClass = "border-amber-500/30 bg-amber-950/20";
          } else if (live?.alertLevel === "NORMAL" || (numBal !== null && numBal > 15)) {
            statusText = "NORMAL";
            badgeClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
            dotClass = "bg-emerald-400";
          }

          return (
            <div
              key={dp.id}
              className={`rounded-xl border p-3.5 flex flex-col justify-between transition hover:border-[#baff00]/30 min-w-0 ${cardClass}`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-xs font-black text-slate-200 line-clamp-1 leading-snug" title={dp.name}>
                    {dp.name}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${badgeClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
                    {statusText}
                  </span>
                </div>
                <p className="mt-2 text-xl font-black text-white">
                  {numBal !== null ? `$${numBal.toFixed(2)}` : live?.status === "error" ? "Error" : "—"}
                  {numBal !== null && <span className="ml-1 text-[10px] font-normal text-slate-500">USD</span>}
                </p>
                {live?.status === "error" && live?.error && (
                  <p className="mt-1 text-[10px] text-rose-400/90 line-clamp-1" title={live.error}>
                    {live.error}
                  </p>
                )}
              </div>
              <div className="mt-2 border-t border-white/5 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span className="truncate font-mono">{dp.url}</span>
                {live?.thresholds && (
                  <span title={`Thresholds: Critical <$${live.thresholds.critical}, Low <$${live.thresholds.low}`}>
                    &lt;${live.thresholds.low}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Dashboard({
  stats,
  setTab,
  balances,
  balancesLoading,
  balancesLastChecked,
  balancesError,
  onRefreshBalances,
}: {
  stats: any;
  setTab: (t: Tab) => void;
  balances: any[];
  balancesLoading: boolean;
  balancesLastChecked: string | null;
  balancesError: string | null;
  onRefreshBalances: () => void;
}) {
  const [cleaning, setCleaning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cleanReport, setCleanReport] = useState<any>(null);
  const [syncReport, setSyncReport] = useState<any>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);

  const handleCleanup = async () => {
    setCleaning(true);
    setCleanError(null);
    try {
      const res = await fetch("/api/cron/cleanup", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Cleanup failed");
      setCleanReport(data);
    } catch (err: any) {
      setCleanError(err.message || "Failed to run system cleanup");
    } finally {
      setCleaning(false);
    }
  };

  const handleSyncOrders = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/cron/sync-orders", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Sync failed");
      setSyncReport(data);
    } catch (err: any) {
      alert("Sync error: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (!stats) return <div className={card + " p-12 text-center text-slate-500"}>Loading dashboard...</div>;
  const cards = [
    ["Users", stats.users, "👥"],
    ["Wallet liability", money(stats.walletLiabilityPkr), "💳"],
    ["Pending deposits", stats.pendingDeposits, "⏳"],
    ["Orders", stats.orders, "📦"],
    ["Completed", stats.completedOrders, "✅"],
    ["Today's sales", money(stats.salesTodayPkr), "💰"],
    ["Today's orders", stats.ordersToday, "📈"],
    ["Approved deposits", money(stats.approvedDepositsPkr), "🏦"],
  ];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([a, b, c]) => (
          <div key={String(a)} className={card + " p-5"}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{a}</p>
              <span>{c}</span>
            </div>
            <p className="mt-3 text-2xl font-black">{b}</p>
          </div>
        ))}
      </div>

      {/* 💰 Live Profit & Margins Intelligence */}
      <div className={card + " mt-5 p-6"}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <h2 className="text-lg font-black text-white">Live Profit &amp; Margins Intelligence</h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">Live Upstream Delta</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time spread calculation: Customer charges minus upstream wholesale provider cost across automated and manual orders.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {/* Today's Profit */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Today's Net Profit</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                {stats.marginTodayPercent ?? 0}% Margin
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-[#baff00]">{money(stats.profitTodayPkr ?? 0)}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Wholesale Cost:</span>
              <span className="font-mono text-slate-300">{money(stats.costTodayPkr ?? 0)}</span>
            </div>
          </div>

          {/* Month Profit */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">This Month Profit</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                {stats.marginMonthPercent ?? 0}% Margin
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-cyan-400">{money(stats.profitMonthPkr ?? 0)}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Total Revenue:</span>
              <span className="font-mono text-slate-300">{money(stats.revenueMonthPkr ?? 0)}</span>
            </div>
          </div>

          {/* All-Time Profit */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">All-Time Net Profit</span>
              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-black text-purple-400">
                {stats.marginAllTimePercent ?? 0}% Margin
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-white">{money(stats.profitAllTimePkr ?? 0)}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Lifetime Revenue:</span>
              <span className="font-mono text-slate-300">{money(stats.revenueAllTimePkr ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Platform Profitability Breakdown */}
        {Array.isArray(stats.platformProfits) && stats.platformProfits.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              📊 Top Platform Margins &amp; Volume Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500">
                    <th className="pb-2">Platform</th>
                    <th className="pb-2">Orders</th>
                    <th className="pb-2">Revenue (PKR)</th>
                    <th className="pb-2">Net Profit (PKR)</th>
                    <th className="pb-2 text-right">Gross Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {stats.platformProfits.map((p: any) => (
                    <tr key={p.platform} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-sans font-bold text-white">
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px]">{p.platform}</span>
                      </td>
                      <td className="py-2.5 text-slate-300 font-sans">{p.count}</td>
                      <td className="py-2.5 text-slate-200">{money(p.revenuePkr)}</td>
                      <td className="py-2.5 text-[#baff00] font-bold">{money(p.profitPkr)}</td>
                      <td className="py-2.5 text-right font-sans">
                        <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${
                          p.marginPercent >= 15 ? "bg-emerald-500/10 text-emerald-400" :
                          p.marginPercent >= 7 ? "bg-[#baff00]/10 text-[#cfff62]" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {p.marginPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5">
        <ProviderBalancesWidget
          balances={balances}
          loading={balancesLoading}
          lastChecked={balancesLastChecked}
          error={balancesError}
          onRefresh={onRefreshBalances}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className={card + " p-6"}>
          <h2 className="font-black text-lg">Quick Admin Links</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <button onClick={() => setTab("Users")} className="rounded-xl bg-white/5 p-3 text-left hover:bg-white/10">👥 Manage Users</button>
            <button onClick={() => setTab("Deposits")} className="rounded-xl bg-white/5 p-3 text-left hover:bg-white/10">💳 Review Deposits</button>
            <button onClick={() => setTab("Orders")} className="rounded-xl bg-white/5 p-3 text-left hover:bg-white/10">📦 Update Orders</button>
            <button onClick={() => setTab("Withdrawals")} className="rounded-xl bg-white/5 p-3 text-left hover:bg-white/10">💸 Referral Payouts</button>
            <button onClick={() => setTab("Tickets")} className="rounded-xl bg-white/5 p-3 text-left hover:bg-white/10">🎫 Support Tickets</button>
            <button onClick={() => setTab("Services")} className="rounded-xl bg-white/5 p-3 text-left hover:bg-white/10">⚙ Price Multipliers</button>
          </div>
        </div>

        <div className={card + " p-6"}>
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg">🧹 System Maintenance & Optimizer</h2>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">Automated</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Automatic background trash cleaner prunes expired user sessions, removes old audit logs (&gt;90d), deletes stale rejected payment slips (&gt;60d), and optimizes PostgreSQL database indexes.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleCleanup}
              disabled={cleaning}
              className="inline-flex items-center gap-2 rounded-xl bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] hover:bg-[#a6e600] disabled:opacity-50 transition"
            >
              {cleaning ? "Purging..." : "⚡ Run Trash Cleaner Now"}
            </button>
            <button
              onClick={handleSyncOrders}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-50 transition"
            >
              {syncing ? "Syncing..." : "🔄 Sync Live Order Statuses"}
            </button>
          </div>

          {cleanError && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300">
              {cleanError}
            </div>
          )}

          {cleanReport && (
            <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <p className="font-bold">✓ Database Optimized & Cleaned!</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-emerald-200/80">
                <li>• Expired sessions purged: {cleanReport.purged?.expiredSessions ?? 0}</li>
                <li>• Stale audit logs pruned: {cleanReport.purged?.oldActivityLogs ?? 0}</li>
                <li>• Stale rejected slips cleaned: {cleanReport.purged?.staleRejectedDeposits ?? 0}</li>
                <li>• Database table statistics analyzed: {cleanReport.databaseOptimized ? "Yes" : "Skipped"}</li>
              </ul>
            </div>
          )}

          {syncReport && (
            <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-300">
              <p className="font-bold">✓ Order Status Sync Completed!</p>
              <p className="text-[11px] text-cyan-200/80">
                Checked {syncReport.totalChecked} orders • {syncReport.updatedCount} updated • {syncReport.partialRefundsCount} partial refunds.
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-white/5 pt-3 text-[11px] text-slate-500">
            Scheduled automatic cron runs daily at 00:00 UTC. Financial ledgers and active customer balances are 100% immutable and protected.
          </div>
        </div>
      </div>
    </>
  );
}

function Users({
  users,
  setUsers,
  q,
  setQ,
  reload,
  wallet,
  grantBonus,
  resetPass,
  busy,
  services = [],
  api,
}: {
  users: any[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  q: string;
  setQ: (v: string) => void;
  reload: () => void;
  wallet: (id: number, m: "add" | "deduct") => void;
  grantBonus: (id: number, nameOrEmail: string, currentBonus: number) => void;
  resetPass: (id: number, email: string) => void;
  busy: boolean;
  services?: any[];
  api: (url: string, init?: RequestInit) => Promise<any>;
}) {
  const [wholesaleUser, setWholesaleUser] = useState<any | null>(null);
  const [wholesaleDiscount, setWholesaleDiscount] = useState<number>(0);
  const [wholesaleRates, setWholesaleRates] = useState<Record<string, number>>({});
  const [savingWholesale, setSavingWholesale] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [customRatePkr, setCustomRatePkr] = useState("");
  const [allServicesList, setAllServicesList] = useState<any[]>(services || []);

  const openWholesale = async (u: any) => {
    setWholesaleUser(u);
    setWholesaleDiscount(Number(u.customDiscountPercent || 0));
    setWholesaleRates(u.customRates ? { ...u.customRates } : {});
    setSelectedServiceId("");
    setCustomRatePkr("");
    if (!allServicesList || allServicesList.length === 0) {
      try {
        const sData = await api("/api/admin/services");
        if (sData?.services) {
          setAllServicesList(sData.services);
        }
      } catch (err) {
        console.error("Failed to load services for wholesale modal", err);
      }
    }
  };

  const handleAddCustomRate = () => {
    const sId = selectedServiceId.trim();
    const rateNum = Number(customRatePkr);
    if (!sId) {
      alert("Please select a service first.");
      return;
    }
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      alert("Please enter a valid rate in PKR per 1k (e.g. 150.00).");
      return;
    }
    setWholesaleRates((prev) => ({
      ...prev,
      [sId]: Math.round(rateNum * 100) / 100,
    }));
    setSelectedServiceId("");
    setCustomRatePkr("");
  };

  const handleSaveWholesale = async () => {
    if (!wholesaleUser) return;
    setSavingWholesale(true);
    try {
      const res = await api("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_custom_rates",
          userId: wholesaleUser.id,
          customDiscountPercent: wholesaleDiscount,
          customRates: wholesaleRates,
        }),
      });
      setUsers((prev: any[]) =>
        prev.map((u) =>
          u.id === wholesaleUser.id
            ? { ...u, customDiscountPercent: wholesaleDiscount, customRates: wholesaleRates }
            : u
        )
      );
      alert(res.message || "✓ Wholesale pricing updated successfully!");
      setWholesaleUser(null);
    } catch (err: any) {
      alert("Failed to save wholesale pricing: " + (err.message || "Unknown error"));
    } finally {
      setSavingWholesale(false);
    }
  };

  return (
    <section className={card + " overflow-hidden"}>
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && reload()}
          placeholder="Search name or email..."
          className="h-11 flex-1 rounded-xl border border-white/10 bg-[#0b1418] px-4 text-sm outline-none focus:border-[#baff00]/50"
        />
        <button onClick={reload} className="rounded-xl bg-[#baff00] px-4 py-2 text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] transition cursor-pointer">
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            const rows = users.map((u) => [
              u.id,
              u.name,
              u.email,
              u.balance || 0,
              u.orderCount || 0,
              u.depositCount || 0,
              u.createdAt ? new Date(u.createdAt).toISOString() : "",
            ]);
            downloadCsv("vexaro_users_export.csv", ["ID", "Name", "Email", "Balance PKR", "Orders", "Deposits", "Created At"], rows);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <span>📥</span>
          <span>Export CSV</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full text-left">
          <thead className="bg-[#0b1418] text-xs uppercase text-slate-500">
            <tr>
              {["User", "Balance", "Orders", "Deposits", "Joined", "Actions"].map((x) => (
                <th key={x} className="px-5 py-4">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[.02]">
                <td className="px-5 py-4">
                  <b>{u.name}</b>
                  <p className="text-xs text-slate-500">{u.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {Number(u.customDiscountPercent || 0) > 0 && (
                      <span className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                        ⭐ VIP Reseller: -{u.customDiscountPercent}%
                      </span>
                    )}
                    {u.customRates && Object.keys(u.customRates).length > 0 && (
                      <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                        🏷️ {Object.keys(u.customRates).length} Custom Rate{Object.keys(u.customRates).length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 font-black">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-[11px] font-normal text-slate-400">Real:</span>
                    <span>{money(u.balancePkr)}</span>
                  </div>
                  {Number(u.bonusBalancePkr || 0) > 0 ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 rounded bg-[#baff00]/10 border border-[#baff00]/30 px-2 py-0.5 text-[10px] font-bold text-[#baff00]">
                        <span>🎁</span>
                        <span>Bonus: {money(Number(u.bonusBalancePkr))}</span>
                      </span>
                      {u.bonusReason && (
                        <p className="mt-0.5 text-[9px] text-slate-400 font-mono">({u.bonusReason})</p>
                      )}
                    </div>
                  ) : u.bonusStatus === "REJECTED" ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300" title={`Reason: ${u.bonusReason}`}>
                        <span>⚠️</span>
                        <span>Blocked: {u.bonusReason || "No bonus"}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        <span>🎁 ₨0 bonus</span>
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">{u.orderCount}</td>
                <td className="px-5 py-4">{u.depositCount}</td>
                <td className="px-5 py-4 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      disabled={busy}
                      onClick={() => wallet(u.id, "add")}
                      className="rounded-lg bg-[#baff00] px-2.5 py-1.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition cursor-pointer"
                      title="Add real deposited funds"
                    >
                      + Real
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => wallet(u.id, "deduct")}
                      className="rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20 transition cursor-pointer"
                      title="Deduct real funds"
                    >
                      − Real
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => grantBonus(u.id, u.name || u.email, u.bonusBalancePkr)}
                      className="rounded-lg border border-[#baff00]/40 bg-[#baff00]/10 px-2.5 py-1.5 text-xs font-bold text-[#baff00] hover:bg-[#baff00] hover:text-[#07100f] transition shadow-sm cursor-pointer"
                      title="Grant or top-up promotional bonus credit"
                    >
                      🎁 Add Bonus
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => resetPass(u.id, u.email)}
                      className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1.5 text-xs font-bold text-yellow-300 hover:bg-yellow-400/20 transition cursor-pointer"
                      title="Reset user password"
                    >
                      🔑 Reset
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => openWholesale(u)}
                      className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-2.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition cursor-pointer"
                      title="Set wholesale custom rates & VIP reseller discounts"
                    >
                      🏷️ Wholesale
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <p className="p-10 text-center text-sm text-slate-500">No users found.</p>}
      </div>

      {/* Wholesale & Custom Pricing Modal */}
      {wholesaleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111a1d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#0b1418]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-purple-300">
                    Reseller Wholesale Pricing
                  </span>
                  <span className="text-xs font-mono text-slate-400">User #{wholesaleUser.id}</span>
                </div>
                <h3 className="mt-1 font-black text-base text-white">{wholesaleUser.name} ({wholesaleUser.email})</h3>
              </div>
              <button
                type="button"
                onClick={() => setWholesaleUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* VIP Global Discount */}
              <div className="rounded-xl border border-white/5 bg-[#0b1418] p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Global Reseller Discount %
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Applied automatically at checkout for all services where no specific fixed custom rate is set.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="95"
                    step="1"
                    value={wholesaleDiscount}
                    onChange={(e) => setWholesaleDiscount(Math.max(0, Math.min(95, Number(e.target.value) || 0)))}
                    className="w-24 rounded-lg border border-white/10 bg-[#111a1d] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#baff00]"
                    placeholder="0"
                  />
                  <span className="text-sm font-bold text-slate-400">% off all catalog services</span>
                </div>
              </div>

              {/* Service-Specific Custom Fixed Rates */}
              <div className="rounded-xl border border-white/5 bg-[#0b1418] p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Fixed Custom Rates (PKR per 1,000 units)
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Assign custom fixed PKR pricing per 1k for this user on specific high-volume services (overrides global discount).
                </p>

                {/* Add Custom Rate Bar */}
                <div className="mt-4 grid gap-3 sm:grid-cols-12 rounded-lg border border-white/10 bg-[#111a1d] p-3">
                  <div className="sm:col-span-7">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Service</label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full rounded border border-white/10 bg-[#0b1418] px-2.5 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="">-- Choose Service --</option>
                      {allServicesList.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          #{s.id} [{s.platform}] {String(s.name || "").slice(0, 42)} (Std: ₨{Number(s.rate_pkr).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Custom Rate / 1k</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={customRatePkr}
                      onChange={(e) => setCustomRatePkr(e.target.value)}
                      placeholder="₨ PKR"
                      className="w-full rounded border border-white/10 bg-[#0b1418] px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddCustomRate}
                      className="w-full rounded bg-purple-500 hover:bg-purple-600 px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Active Custom Rates List */}
                <div className="mt-4">
                  <h4 className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                    Active Custom Rates ({Object.keys(wholesaleRates).length})
                  </h4>
                  {Object.keys(wholesaleRates).length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No service-specific custom rates assigned yet.</p>
                  ) : (
                    <div className="divide-y divide-white/5 border border-white/10 rounded-lg overflow-hidden bg-[#111a1d]">
                      {Object.entries(wholesaleRates).map(([sId, rate]) => {
                        const sObj = allServicesList.find((x) => String(x.id) === String(sId));
                        return (
                          <div key={sId} className="flex items-center justify-between p-2.5 text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">#{sId}</span>
                                <span className="text-slate-300 font-medium">
                                  {sObj ? sObj.name : `Service #${sId}`}
                                </span>
                              </div>
                              {sObj && (
                                <span className="text-[10px] text-slate-500">
                                  Standard Retail: ₨{Number(sObj.rate_pkr).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-[#baff00]">
                                ₨{Number(rate).toFixed(2)} / 1k
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...wholesaleRates };
                                  delete updated[sId];
                                  setWholesaleRates(updated);
                                }}
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 p-4 bg-[#0b1418]">
              <button
                type="button"
                onClick={() => setWholesaleUser(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingWholesale}
                onClick={handleSaveWholesale}
                className="rounded-xl bg-[#baff00] px-5 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer"
              >
                {savingWholesale ? "Saving..." : "Save Wholesale Pricing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DepositsAdmin({
  deposits,
  reload,
  updateDeposit,
  busyId,
  previewScreenshot,
  setPreviewScreenshot,
  filter,
  setFilter,
}: {
  deposits: any[];
  reload: () => void;
  updateDeposit: (id: string, action: "approve" | "reject", customBonusPercent?: number) => void;
  busyId: string;
  previewScreenshot: string | null;
  setPreviewScreenshot: (url: string | null) => void;
  filter: "All" | "Pending" | "Approved" | "Rejected";
  setFilter: (f: "All" | "Pending" | "Approved" | "Rejected") => void;
}) {
  const [q, setQ] = useState("");
  const [approvingDeposit, setApprovingDeposit] = useState<any | null>(null);
  const [selectedBonusRate, setSelectedBonusRate] = useState<number | "auto">("auto");
  const [customBonusRate, setCustomBonusRate] = useState<string>("");

  const filtered = useMemo(() => {
    return deposits.filter((d) => {
      const matchFilter = filter === "All" || d.status === filter;
      const query = q.toLowerCase().trim();
      const matchQuery =
        !query ||
        d.name?.toLowerCase().includes(query) ||
        d.email?.toLowerCase().includes(query) ||
        d.transactionId?.toLowerCase().includes(query) ||
        d.method?.toLowerCase().includes(query);
      return matchFilter && matchQuery;
    });
  }, [deposits, filter, q]);

  const pendingCount = deposits.filter((d) => d.status === "Pending").length;
  const approvedCount = deposits.filter((d) => d.status === "Approved").length;
  const rejectedCount = deposits.filter((d) => d.status === "Rejected").length;

  return (
    <section className={card + " overflow-hidden"}>
      {/* Top Header & Metrics */}
      <div className="border-b border-white/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>💳</span>
              <span>Customer Deposit Verification</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Review receipts, verify transaction IDs, and approve Easypaisa / JazzCash / SadaPay deposits to credit user wallets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => {
                const rows = filtered.map((d) => [
                  d.id,
                  d.transactionId,
                  d.method,
                  d.name || "",
                  d.email || "",
                  d.amountPkr,
                  d.bonusPkr || 0,
                  d.status,
                  d.createdAt ? new Date(d.createdAt).toISOString() : "",
                ]);
                downloadCsv("vexaro_deposits_export.csv", ["ID", "TID", "Method", "User", "Email", "Amount PKR", "Bonus PKR", "Status", "Created At"], rows);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              📥 Export CSV
            </button>
            <button
              onClick={reload}
              className="rounded-xl border border-white/10 bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition cursor-pointer"
            >
              🔄 Refresh Queue
            </button>
          </div>
        </div>

        {/* Counter cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            onClick={() => setFilter("Pending")}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              filter === "Pending"
                ? "border-amber-400/50 bg-amber-400/10"
                : "border-white/5 bg-white/[0.02] hover:bg-white/5"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Review</p>
            <p className="mt-1 text-2xl font-black text-amber-300">{pendingCount}</p>
          </div>
          <div
            onClick={() => setFilter("Approved")}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              filter === "Approved"
                ? "border-emerald-400/50 bg-emerald-400/10"
                : "border-white/5 bg-white/[0.02] hover:bg-white/5"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved</p>
            <p className="mt-1 text-2xl font-black text-emerald-300">{approvedCount}</p>
          </div>
          <div
            onClick={() => setFilter("Rejected")}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              filter === "Rejected"
                ? "border-red-400/50 bg-red-400/10"
                : "border-white/5 bg-white/[0.02] hover:bg-white/5"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected</p>
            <p className="mt-1 text-2xl font-black text-red-400">{rejectedCount}</p>
          </div>
          <div
            onClick={() => setFilter("All")}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              filter === "All"
                ? "border-[#baff00]/50 bg-[#baff00]/10"
                : "border-white/5 bg-white/[0.02] hover:bg-white/5"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Requests</p>
            <p className="mt-1 text-2xl font-black text-white">{deposits.length}</p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5 overflow-x-auto">
            {(["All", "Pending", "Approved", "Rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filter === f
                    ? "bg-[#baff00] text-[#07100f]"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search user, email, TID, method..."
              className="h-9 w-full sm:w-64 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#baff00]/50"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left">
          <thead className="bg-[#0b1418] text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
            <tr>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Method</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Transaction ID</th>
              <th className="px-5 py-4">Receipt Proof</th>
              <th className="px-5 py-4">Submitted</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-white/[0.02] transition">
                <td className="px-5 py-4">
                  <p className="font-bold text-white">{d.name}</p>
                  <p className="text-[11px] text-slate-500">{d.email}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-1 font-semibold text-slate-200">
                    {d.method}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <p className="font-black text-sm text-white">
                    ₨{Number(d.amount).toLocaleString()}
                  </p>
                  {d.status === "Approved" ? (
                    Number(d.bonusPkr || 0) > 0 ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/20">
                        🎁 +₨{Number(d.bonusPkr).toLocaleString()} bonus
                      </span>
                    ) : (
                      <span className="mt-1 text-[10px] text-slate-500 block">No bonus</span>
                    )
                  ) : d.status === "Pending" ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#baff00]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#baff00] border border-[#baff00]/20">
                      🎁 +₨{Math.round(Number(d.amount) >= 5000 ? Number(d.amount) * 0.10 : Number(d.amount) * 0.05).toLocaleString()} ({Number(d.amount) >= 5000 ? "10%" : "5%"} bonus)
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-4 font-mono text-[11px] text-slate-300 select-all">
                  {d.transactionId}
                </td>
                <td className="px-5 py-4">
                  {d.screenshot ? (
                    <button
                      type="button"
                      onClick={() => setPreviewScreenshot(d.screenshot)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#baff00]/30 bg-[#baff00]/10 px-2.5 py-1 text-xs font-bold text-[#baff00] transition hover:bg-[#baff00] hover:text-[#07100f]"
                    >
                      <span>🖼️</span>
                      <span>View Proof</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-600">
                      {d.status === "Pending" ? "No receipt" : "Purged ✓"}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-[11px] text-slate-500">
                  {new Date(d.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                      d.status === "Approved"
                        ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                        : d.status === "Rejected"
                        ? "bg-red-400/10 text-red-300 border border-red-400/20"
                        : "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                    }`}
                  >
                    {d.status}
                  </span>
                  {d.rejectionReason && (
                    <p className="mt-1 text-[10px] text-red-400 max-w-[160px] truncate" title={d.rejectionReason}>
                      {d.rejectionReason}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  {d.status === "Pending" ? (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={!!busyId}
                        onClick={() => {
                          setApprovingDeposit(d);
                          setSelectedBonusRate("auto");
                          setCustomBonusRate("");
                        }}
                        className="rounded-lg bg-[#baff00] px-3 py-1.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer"
                      >
                        {busyId === d.id ? "..." : "Approve"}
                      </button>
                      <button
                        disabled={!!busyId}
                        onClick={() => updateDeposit(d.id, "reject")}
                        className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20 disabled:opacity-50 transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-600 font-medium">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!filtered.length && (
          <div className="p-12 text-center text-slate-500">
            <p className="font-bold text-sm">No deposits found</p>
            <p className="mt-1 text-xs">
              {q ? `No deposit requests match "${q}".` : "No deposits currently in this view."}
            </p>
          </div>
        )}
      </div>

      {/* Deposit Approval Confirmation & Bonus Rate Modal */}
      {approvingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] max-w-lg w-full overflow-hidden rounded-3xl border border-[#baff00]/30 bg-[#111a1d] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#baff00]/15 text-lg font-black text-[#baff00]">
                  💳
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Approve Deposit &amp; Credit Wallet</h3>
                  <p className="text-xs text-slate-400">Review bonus credit allocation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingDeposit(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>

            {/* Deposit Info Card */}
            <div className="rounded-2xl border border-white/10 bg-[#070d0d] p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{approvingDeposit.name} ({approvingDeposit.email})</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Channel &amp; TID:</span>
                <span className="font-mono text-slate-300">{approvingDeposit.method} • {approvingDeposit.transactionId}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
                <span className="font-bold text-slate-300">Deposited Amount:</span>
                <span className="font-black text-lg text-white">₨{Number(approvingDeposit.amount).toLocaleString()}</span>
              </div>
            </div>

            {/* Bonus Percentage Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Select Deposit Bonus Rate
                </label>
                <span className="text-[11px] text-[#baff00] font-semibold">5% – 10% Policy</span>
              </div>

              {(() => {
                const autoRate = Number(approvingDeposit.amount) >= 5000 ? 10 : 5;
                const effectiveRate =
                  selectedBonusRate === "auto"
                    ? autoRate
                    : selectedBonusRate === -1
                    ? Math.max(0, Math.min(50, Number(customBonusRate) || 0))
                    : selectedBonusRate;
                const bonusAmount = Math.round(((Number(approvingDeposit.amount) * effectiveRate) / 100) * 100) / 100;
                const totalCredited = Number(approvingDeposit.amount) + bonusAmount;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBonusRate("auto")}
                        className={`rounded-xl border p-2.5 text-xs font-bold transition text-left cursor-pointer ${
                          selectedBonusRate === "auto"
                            ? "border-[#baff00] bg-[#baff00]/15 text-white shadow-sm ring-1 ring-[#baff00]/30"
                            : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="block text-[10px] text-[#baff00] uppercase font-black">⚡ Tiered Auto</span>
                        <span className="font-black text-sm">{autoRate}% Bonus</span>
                        <span className="block text-[10px] text-slate-400">+₨{Math.round(approvingDeposit.amount * (autoRate / 100)).toLocaleString()}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBonusRate(5)}
                        className={`rounded-xl border p-2.5 text-xs font-bold transition text-left cursor-pointer ${
                          selectedBonusRate === 5
                            ? "border-[#baff00] bg-[#baff00]/15 text-white shadow-sm ring-1 ring-[#baff00]/30"
                            : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="block text-[10px] text-slate-400 uppercase">Standard</span>
                        <span className="font-black text-sm">5% Bonus</span>
                        <span className="block text-[10px] text-slate-400">+₨{Math.round(approvingDeposit.amount * 0.05).toLocaleString()}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBonusRate(10)}
                        className={`rounded-xl border p-2.5 text-xs font-bold transition text-left cursor-pointer ${
                          selectedBonusRate === 10
                            ? "border-[#baff00] bg-[#baff00]/15 text-white shadow-sm ring-1 ring-[#baff00]/30"
                            : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="block text-[10px] text-amber-400 uppercase">VIP Tier</span>
                        <span className="font-black text-sm">10% Bonus 🔥</span>
                        <span className="block text-[10px] text-slate-400">+₨{Math.round(approvingDeposit.amount * 0.10).toLocaleString()}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBonusRate(7)}
                        className={`rounded-xl border p-2 text-xs font-bold transition text-left cursor-pointer ${
                          selectedBonusRate === 7
                            ? "border-[#baff00] bg-[#baff00]/15 text-white"
                            : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>7% Bonus</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBonusRate(0)}
                        className={`rounded-xl border p-2 text-xs font-bold transition text-left cursor-pointer ${
                          selectedBonusRate === 0
                            ? "border-[#baff00] bg-[#baff00]/15 text-white"
                            : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>0% No Bonus</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBonusRate(-1)}
                        className={`rounded-xl border p-2 text-xs font-bold transition text-left cursor-pointer ${
                          selectedBonusRate === -1
                            ? "border-[#baff00] bg-[#baff00]/15 text-white"
                            : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>Custom %</span>
                      </button>
                    </div>

                    {selectedBonusRate === -1 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-slate-400">Custom Bonus %:</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="1"
                          placeholder="e.g. 8"
                          value={customBonusRate}
                          onChange={(e) => setCustomBonusRate(e.target.value)}
                          className="w-24 rounded-lg border border-white/10 bg-[#070d0d] px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-[#baff00]"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    )}

                    {/* Breakdown Summary Box */}
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Real Cash Balance (For Orders):</span>
                        <span className="font-bold text-white">₨{Number(approvingDeposit.amount).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-300 font-semibold">🎁 Promotional Bonus ({effectiveRate}%):</span>
                        <span className="font-black text-emerald-400">+₨{bonusAmount.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-emerald-500/20 pt-2 flex items-center justify-between text-sm">
                        <span className="font-extrabold text-white">Total Customer Balance:</span>
                        <span className="font-black text-base text-[#baff00]">₨{totalCredited.toLocaleString()} PKR</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={!!busyId}
                        onClick={() => {
                          const depositId = approvingDeposit.id;
                          setApprovingDeposit(null);
                          updateDeposit(depositId, "approve", effectiveRate);
                        }}
                        className="flex-1 rounded-xl bg-[#baff00] py-3 text-xs sm:text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer shadow-[0_4px_20px_rgba(186,255,0,0.3)]"
                      >
                        {busyId === approvingDeposit.id ? "Crediting..." : `✓ Approve & Credit ₨${totalCredited.toLocaleString()}`}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Proof Screenshot Modal */}
      {previewScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] max-w-2xl w-full overflow-hidden rounded-3xl border border-white/10 bg-[#111a1d] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🖼️</span>
                <span>Payment Receipt Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                ✕ Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/5 bg-black/50 p-3 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewScreenshot}
                alt="Deposit Receipt"
                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-500">
              💡 Upon approval or rejection, the screenshot binary is automatically purged from the database for storage optimization and privacy.
            </p>
          </div>
        </div>
      )}

      {/* Security Footer Note */}
      <div className="border-t border-white/10 bg-[#0b1418] p-4 text-[11px] text-slate-400 flex items-center gap-2">
        <span className="text-[#baff00] font-bold">🔒 Security Guarantee:</span>
        <span>
          Approving a deposit automatically locks the record under a PostgreSQL transaction, credits the user&apos;s real balance, and logs an immutable ledger entry.
        </span>
      </div>
    </section>
  );
}

function Orders({
  orders,
  q,
  setQ,
  status,
  setStatus,
  reload,
  update,
  syncing,
  onSync,
}: {
  orders: any[];
  q: string;
  setQ: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  reload: () => void;
  update: (id: string, s: string) => void;
  syncing?: boolean;
  onSync?: () => void;
}) {
  return (
    <section className={card + " overflow-hidden"}>
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && reload()}
          placeholder="Search order, service, email..."
          className="h-11 flex-1 rounded-xl border border-white/10 bg-[#0b1418] px-4 text-sm outline-none"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b1418] px-4 text-sm">
          <option value="">All statuses</option>
          {["Pending", "Processing", "In progress", "Completed", "Partial", "Cancelled", "Failed"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button onClick={reload} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition cursor-pointer">
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            const rows = orders.map((o) => [
              o.id,
              o.userEmail || "",
              o.serviceName || o.serviceId,
              o.link,
              o.quantity,
              o.chargePkr || o.charge || 0,
              o.status,
              o.createdAt ? new Date(o.createdAt).toISOString() : "",
            ]);
            downloadCsv("vexaro_orders_export.csv", ["Order ID", "User", "Service", "Link", "Quantity", "Charge PKR", "Status", "Created At"], rows);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <span>📥</span>
          <span>Export CSV</span>
        </button>
        {onSync && (
          <button
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#baff00] px-4 py-2.5 text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer"
          >
            {syncing ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 0 1 8-8" strokeWidth="4" className="opacity-75" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Sync Orders Now
              </>
            )}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full text-left">
          <thead className="bg-[#0b1418] text-xs uppercase text-slate-500">
            <tr>
              {["Order", "User", "Service", "Link", "Qty", "Charge", "Start", "Remains", "Status", "Date & Time", "Action"].map((x) => (
                <th key={x} className="px-5 py-4">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-white/[.02]">
                <td className="px-5 py-4">
                  <b>{o.providerOrderId || "—"}</b>
                  <p className="text-[10px] text-slate-500 font-mono">{o.id}</p>
                </td>
                <td className="px-5 py-4 text-sm">{o.email || "Guest"}</td>
                <td className="max-w-[260px] px-5 py-4 text-sm">
                  <div className="line-clamp-2" title={o.serviceName}>{o.serviceName}</div>
                  <p className="text-xs text-slate-500">ID {o.serviceId}</p>
                </td>
                <td className="max-w-[220px] px-5 py-4 text-xs">
                  {o.link ? (
                    <a
                      href={o.link.startsWith("http") ? o.link : `https://${o.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-[#baff00] hover:underline"
                      title={o.link}
                    >
                      {o.link}
                    </a>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-5 py-4">{o.quantity.toLocaleString()}</td>
                <td className="px-5 py-4 font-black">{money(o.chargePkr)}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-300">
                  {o.startCount != null && String(o.startCount).trim() !== "" ? o.startCount : "—"}
                </td>
                <td className="px-5 py-4 font-mono text-xs text-slate-300">
                  {o.remains != null && String(o.remains).trim() !== "" ? o.remains : "—"}
                </td>
                <td className="px-5 py-4"><Badge>{o.status}</Badge></td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</p>
                  <p className="text-[11px] text-slate-500">{o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : ""}</p>
                </td>
                <td className="px-5 py-4">
                  <select value={o.status} onChange={(e) => update(o.id, e.target.value)} className="rounded-lg border border-white/10 bg-[#0b1418] px-2 py-2 text-xs">
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>In progress</option>
                    <option>Completed</option>
                    <option>Partial</option>
                    <option>Cancelled</option>
                    <option>Failed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && <p className="p-10 text-center text-sm text-slate-500">No database orders found.</p>}
      </div>
    </section>
  );
}

interface ServiceMatrixRowProps {
  s: any;
  usdToPkr: number;
  savingRowId: string | null;
  savedRowId: string | null;
  onInlineSave: (updated: any) => void;
  onEditFullService: (s: any) => void;
  onDeleteService: (s: any) => void;
}

const ServiceMatrixRow = memo(function ServiceMatrixRow({
  s,
  usdToPkr,
  savingRowId,
  savedRowId,
  onInlineSave,
  onEditFullService,
  onDeleteService,
}: ServiceMatrixRowProps) {
  const rates = s.provider_rates || {};

  // Local multiplier and retail price state to allow instant keystrokes without re-rendering the whole page
  const [localMult, setLocalMult] = useState(s.rate_multiplier ?? 1.07);
  const [localRetailUsd, setLocalRetailUsd] = useState(s.rate_usd != null ? s.rate_usd : "");
  const [localRetailPkr, setLocalRetailPkr] = useState(s.rate_pkr != null ? s.rate_pkr : "");

  // Synchronize when s changes
  useEffect(() => {
    setLocalMult(s.rate_multiplier ?? 1.07);
  }, [s.rate_multiplier]);

  useEffect(() => {
    if (s.rate_usd != null) {
      setLocalRetailUsd(s.rate_usd);
    }
    if (s.rate_pkr != null) {
      setLocalRetailPkr(s.rate_pkr);
    }
  }, [s.rate_usd, s.rate_pkr]);

  // Determine lowest rate across all 5 quotes
  let lowestProvId: string | null = null;
  let lowestRate = Infinity;
  for (const pId of ["pak_smm", "smooth_smm", "am_smm", "pakistan_smm", "rizvi_smm"]) {
    if (rates[pId] && typeof rates[pId].rateUsd === "number") {
      if (rates[pId].rateUsd < lowestRate) {
        lowestRate = rates[pId].rateUsd;
        lowestProvId = pId;
      }
    }
  }

  const baseUsd = Number(s.base_rate_usd || 0);
  const mult = Number(s.rate_multiplier || 1.07);
  const marginPercent = Math.round((mult - 1) * 100);
  const retailUsd = s.rate_usd != null ? Number(s.rate_usd) : Math.round(baseUsd * mult * 10000) / 10000;
  const retailPkr = s.rate_pkr != null ? Number(s.rate_pkr) : Math.round(baseUsd * mult * (usdToPkr || 278) * 10000) / 10000;

  const sId = String(s.service || s.id);
  const isSaving = savingRowId === sId;
  const isSaved = savedRowId === sId;

  return (
    <tr className="hover:bg-white/[.02] transition-colors">
      {/* Service & Platform */}
      <td className="max-w-xs px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black text-white">
            {s.platform || "SMM"}
          </span>
          {s.is_guaranteed && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-400">
              ♻ Refill
            </span>
          )}
        </div>
        <p className="mt-1 font-bold text-slate-100 line-clamp-2">{s.name}</p>
        <p className="text-[10px] text-slate-500">
          ID #{s.service || s.id} · Min: {Number(s.min).toLocaleString()} · Max: {Number(s.max).toLocaleString()}
        </p>
      </td>

      {/* Routing Mode */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextVal = !s.auto_route;
                let newBaseUsd = Number(s.base_rate_usd);
                let newActiveProv = s.active_provider_id;
                if (nextVal && s.fallback_queue && s.fallback_queue.length > 0) {
                  const cheapest = s.fallback_queue[0];
                  newBaseUsd = Number(cheapest.rateUsd);
                  newActiveProv = cheapest.providerId;
                }
                const updated = {
                  ...s,
                  auto_route: nextVal,
                  active_provider_id: newActiveProv,
                  base_rate_usd: newBaseUsd,
                  rate_usd: Math.round(newBaseUsd * Number(s.rate_multiplier || 1.07) * 10000) / 10000,
                  rate_pkr: Math.round(newBaseUsd * Number(s.rate_multiplier || 1.07) * (usdToPkr || 278) * 10000) / 10000,
                };
                onInlineSave(updated);
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                s.auto_route !== false ? "bg-[#baff00]" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#07100f] transition-transform ${
                  s.auto_route !== false ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-[10px] font-black uppercase ${s.auto_route !== false ? "text-[#baff00]" : "text-amber-400"}`}>
              {s.auto_route !== false ? "AUTO" : "MANUAL"}
            </span>
          </div>

          {s.auto_route === false && (
            <select
              value={s.active_provider_id || ""}
              onChange={(e) => {
                const newP = e.target.value;
                const provQuote = s.provider_rates?.[newP];
                const newBaseUsd = provQuote?.rateUsd != null ? Number(provQuote.rateUsd) : Number(s.base_rate_usd || 0);
                const curMult = Number(s.rate_multiplier || 1.07);
                const updated = {
                  ...s,
                  active_provider_id: newP,
                  auto_route: false,
                  base_rate_usd: newBaseUsd,
                  rate_usd: Math.round(newBaseUsd * curMult * 10000) / 10000,
                  rate_pkr: Math.round(newBaseUsd * curMult * (usdToPkr || 278) * 10000) / 10000,
                };
                onInlineSave(updated);
              }}
              className="rounded border border-white/10 bg-[#0b1418] px-2 py-1 text-[11px] text-white outline-none"
            >
              <option value="pak_smm">PAK SMM</option>
              <option value="smooth_smm">Smooth SMM</option>
              <option value="am_smm">AM SMM</option>
              <option value="pakistan_smm">Pakistan SMM</option>
              <option value="rizvi_smm">Rizvi SMM</option>
            </select>
          )}
        </div>
      </td>

      {/* Active Base Rate USD */}
      <td className="px-4 py-3.5 font-mono">
        <div className="flex flex-col">
          <span className="font-bold text-white">${baseUsd.toFixed(4)}</span>
          <span className="text-[10px] text-slate-400 font-sans uppercase">
            {s.active_provider_id ? s.active_provider_id.replace("_smm", " smm") : "auto"}
          </span>
        </div>
      </td>

      {/* PAK SMM Rate */}
      <td className="px-4 py-3.5 font-mono">
        {rates.pak_smm ? (
          <div className="flex flex-col">
            <span className={`text-slate-200 ${s.active_provider_id === "pak_smm" ? "font-bold text-white" : ""}`}>
              ${Number(rates.pak_smm.rateUsd).toFixed(4)}
            </span>
            {lowestProvId === "pak_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-[#baff00]/20 px-1 py-0.5 text-[8px] font-black text-[#cfff62] shadow-[0_0_8px_rgba(186,255,0,0.3)]">
                ★ CHEAPEST
              </span>
            )}
            {s.active_provider_id === "pak_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-400">
                ACTIVE
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* Smooth SMM Rate */}
      <td className="px-4 py-3.5 font-mono">
        {rates.smooth_smm ? (
          <div className="flex flex-col">
            <span className={`text-slate-200 ${s.active_provider_id === "smooth_smm" ? "font-bold text-white" : ""}`}>
              ${Number(rates.smooth_smm.rateUsd).toFixed(4)}
            </span>
            {lowestProvId === "smooth_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-[#baff00]/20 px-1 py-0.5 text-[8px] font-black text-[#cfff62] shadow-[0_0_8px_rgba(186,255,0,0.3)]">
                ★ CHEAPEST
              </span>
            )}
            {s.active_provider_id === "smooth_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-400">
                ACTIVE
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* AM SMM Rate */}
      <td className="px-4 py-3.5 font-mono">
        {rates.am_smm ? (
          <div className="flex flex-col">
            <span className={`text-slate-200 ${s.active_provider_id === "am_smm" ? "font-bold text-white" : ""}`}>
              ${Number(rates.am_smm.rateUsd).toFixed(4)}
            </span>
            {lowestProvId === "am_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-[#baff00]/20 px-1 py-0.5 text-[8px] font-black text-[#cfff62] shadow-[0_0_8px_rgba(186,255,0,0.3)]">
                ★ CHEAPEST
              </span>
            )}
            {s.active_provider_id === "am_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-400">
                ACTIVE
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* Pakistan SMM Rate */}
      <td className="px-4 py-3.5 font-mono">
        {rates.pakistan_smm ? (
          <div className="flex flex-col">
            <span className={`text-slate-200 ${s.active_provider_id === "pakistan_smm" ? "font-bold text-white" : ""}`}>
              ${Number(rates.pakistan_smm.rateUsd).toFixed(4)}
            </span>
            {lowestProvId === "pakistan_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-[#baff00]/20 px-1 py-0.5 text-[8px] font-black text-[#cfff62] shadow-[0_0_8px_rgba(186,255,0,0.3)]">
                ★ CHEAPEST
              </span>
            )}
            {s.active_provider_id === "pakistan_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-400">
                ACTIVE
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* Rizvi SMM Rate */}
      <td className="px-4 py-3.5 font-mono">
        {rates.rizvi_smm ? (
          <div className="flex flex-col">
            <span className={`text-slate-200 ${s.active_provider_id === "rizvi_smm" ? "font-bold text-white" : ""}`}>
              ${Number(rates.rizvi_smm.rateUsd).toFixed(4)}
            </span>
            {lowestProvId === "rizvi_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-[#baff00]/20 px-1 py-0.5 text-[8px] font-black text-[#cfff62] shadow-[0_0_8px_rgba(186,255,0,0.3)]">
                ★ CHEAPEST
              </span>
            )}
            {s.active_provider_id === "rizvi_smm" && (
              <span className="mt-0.5 inline-flex items-center rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-400">
                ACTIVE
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* Markup Multiplier */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0.1"
              max="20"
              step="0.01"
              value={localMult}
              onChange={(e) => setLocalMult(e.target.value)}
              onBlur={() => {
                const multVal = Number(localMult) || 1.07;
                const curBase = Number(s.base_rate_usd || 0);
                const updated = {
                  ...s,
                  rate_multiplier: multVal,
                  rate_usd: Math.round(curBase * multVal * 10000) / 10000,
                  rate_pkr: Math.round(curBase * multVal * (usdToPkr || 278) * 100) / 100,
                };
                onInlineSave(updated);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-20 rounded-lg border border-white/10 bg-[#0b1418] px-2.5 py-1 font-mono text-xs text-white outline-none focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/30 transition"
            />
            <span className="text-[10px] text-slate-500">×</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-bold ${marginPercent >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
              {marginPercent >= 0 ? `+${marginPercent}% profit` : `${marginPercent}%`}
            </span>
            {isSaving && (
              <span className="text-[9px] text-cyan-400 font-bold animate-pulse">⏳</span>
            )}
            {isSaved && (
              <span className="text-[9px] text-emerald-400 font-black">✓</span>
            )}
          </div>
        </div>
      </td>

      {/* Retail USD Price - DIRECTLY EDITABLE WITH AUTO-SAVE */}
      <td className="px-4 py-3.5 font-mono font-bold">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-cyan-400">$</span>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={localRetailUsd !== "" ? localRetailUsd : retailUsd}
              onChange={(e) => setLocalRetailUsd(e.target.value)}
              onBlur={() => {
                const val = Number(localRetailUsd !== "" ? localRetailUsd : retailUsd);
                const curBase = Number(s.base_rate_usd || 0);
                const effectiveRate = usdToPkr || 285;
                const newMult = curBase > 0 ? Math.round((val / curBase) * 10000) / 10000 : 1.07;
                const targetPkr = Math.round(val * effectiveRate * 100) / 100;
                const minProfitablePkr = Math.round(curBase * effectiveRate * 1.05 * 100) / 100;
                const finalPkr = targetPkr < minProfitablePkr && targetPkr > 0 ? minProfitablePkr : targetPkr;
                const updated = {
                  ...s,
                  rate_usd: val,
                  rate_multiplier: newMult,
                  rate_pkr: finalPkr,
                  custom_rate_pkr: finalPkr,
                };
                setLocalRetailPkr(String(finalPkr));
                onInlineSave(updated);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-24 rounded-lg border border-cyan-500/30 bg-[#071317] px-2.5 py-1 font-mono text-xs font-bold text-cyan-300 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition"
            />
          </div>
          <span className="text-[9px] font-normal text-slate-500">per 1k</span>
        </div>
      </td>

      {/* Retail PKR Price - DIRECTLY EDITABLE WITH AUTO-SAVE */}
      <td className="px-4 py-3.5 font-mono font-bold text-[#baff00]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[#baff00]">₨</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={localRetailPkr !== "" ? localRetailPkr : (s.rate_pkr != null ? Number(s.rate_pkr).toFixed(2) : Number(retailPkr).toFixed(2))}
              onChange={(e) => {
                setLocalRetailPkr(e.target.value);
                const pVal = Number(e.target.value);
                if (Number.isFinite(pVal) && pVal > 0) {
                  const uVal = Math.round((pVal / (usdToPkr || 285)) * 10000) / 10000;
                  setLocalRetailUsd(String(uVal));
                }
              }}
              onBlur={() => {
                const valPkr = Number(localRetailPkr !== "" ? localRetailPkr : retailPkr);
                const curBase = Number(s.base_rate_usd || 0);
                const effectiveRate = usdToPkr || 285;
                const minCostPkr = curBase * effectiveRate;
                const minProfitablePkr = Math.round(minCostPkr * 1.05 * 100) / 100;
                const finalPkr = valPkr < minProfitablePkr && valPkr > 0 ? minProfitablePkr : valPkr;
                const valUsd = Math.round((finalPkr / effectiveRate) * 10000) / 10000;
                const newMult = curBase > 0 ? Math.round((valUsd / curBase) * 10000) / 10000 : 1.07;
                const updated = {
                  ...s,
                  rate_pkr: finalPkr,
                  custom_rate_pkr: finalPkr,
                  rate_usd: valUsd,
                  rate_multiplier: newMult,
                };
                setLocalRetailPkr(String(finalPkr));
                setLocalRetailUsd(String(valUsd));
                onInlineSave(updated);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-24 rounded-lg border border-[#baff00]/30 bg-[#071317] px-2.5 py-1 font-mono text-xs font-bold text-[#baff00] outline-none focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/30 transition"
            />
          </div>
          <span className="text-[9px] font-normal text-slate-500">per 1k</span>
        </div>
      </td>

      {/* Status checkboxes */}
      <td className="px-4 py-3.5 text-center">
        <div className="flex items-center justify-center gap-2.5">
          <label
            title={s.enabled !== false ? "Service is ACTIVE (Click to disable)" : "Service is DISABLED (Click to enable)"}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={s.enabled !== false}
              onChange={(e) => {
                const nextVal = e.target.checked;
                const updated = { ...s, enabled: nextVal };
                onInlineSave(updated);
              }}
              className="h-4 w-4 rounded accent-[#baff00] cursor-pointer"
            />
            <span className={`text-[10px] font-bold ${s.enabled !== false ? "text-[#cfff62]" : "text-rose-400"}`}>
              {s.enabled !== false ? "Active" : "Off"}
            </span>
          </label>

          <label title="Toggle Hot/Popular Service Badge" className="cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(s.popular)}
              onChange={(e) => {
                const nextVal = e.target.checked;
                const updated = { ...s, popular: nextVal };
                onInlineSave(updated);
              }}
              className="h-4 w-4 rounded accent-amber-400 cursor-pointer"
            />
          </label>
        </div>
      </td>

      {/* Actions Column - STICKY RIGHT */}
      <td className="px-4 py-3.5 text-center sticky right-0 bg-[#07100f] z-10 shadow-[-6px_0_12px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => onEditFullService(s)}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/25 cursor-pointer"
            title="Edit everything: Name, Category, Platform, Limits, Rates, Provider & Description"
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => onDeleteService(s)}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs font-bold text-rose-400 transition hover:bg-rose-500/20 cursor-pointer"
            title="Delete service permanently"
          >
            🗑️
          </button>
          <button
            disabled={isSaving}
            onClick={() => onInlineSave(s)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition cursor-pointer flex items-center gap-1 ${
              isSaved
                ? "bg-emerald-400 text-[#07100f]"
                : "bg-[#baff00] text-[#07100f] hover:bg-[#d2ff5a]"
            }`}
            title="Save price & changes"
          >
            {isSaving ? (
              <span>⏳ Saving</span>
            ) : isSaved ? (
              <span>✓ Saved</span>
            ) : (
              <span>💾 Save</span>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
});

function Services({
  services,
  setServices,
  save,
  busy,
  providers,
  syncProviders,
  syncingProviders,
  syncMessage,
  usdToPkr,
  reload,
  api,
  balances,
  balancesLoading,
  balancesLastChecked,
  balancesError,
  onRefreshBalances,
}: {
  services: any[];
  setServices: React.Dispatch<React.SetStateAction<any[]>>;
  save: (s: any, silent?: boolean) => Promise<any> | void;
  busy: boolean;
  providers: any[];
  syncProviders: () => void;
  syncingProviders: boolean;
  syncMessage: string;
  usdToPkr: number;
  reload: () => Promise<void>;
  api: (url: string, init?: RequestInit) => Promise<any>;
  balances: any[];
  balancesLoading: boolean;
  balancesLastChecked: string | null;
  balancesError: string | null;
  onRefreshBalances: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(50);
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [autoRouteFilter, setAutoRouteFilter] = useState("All");
  const [providerFilter, setProviderFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [bulkMult, setBulkMult] = useState("1.07");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);

  // Debounce search so keystrokes remain instantaneous with 0ms input freeze
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setDisplayCount(50);
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(50);
  }, [selectedPlatform, autoRouteFilter, providerFilter, statusFilter]);

  const handleInlineSave = useCallback(async (updatedService: any) => {
    const sId = String(updatedService.service || updatedService.id);
    try {
      setSavingRowId(sId);
      setServices((v) =>
        v.map((x) =>
          String(x.service || x.id) === sId ? { ...x, ...updatedService } : x
        )
      );
      await Promise.resolve(save(updatedService, true));
      setSavedRowId(sId);
      setTimeout(() => {
        setSavedRowId((prev) => (prev === sId ? null : prev));
      }, 2500);
    } catch (err) {
      console.error("Auto save failed:", err);
    } finally {
      setSavingRowId((prev) => (prev === sId ? null : prev));
    }
  }, [save, setServices]);

  const [isAddingService, setIsAddingService] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [editingFullService, setEditingFullService] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    name: "",
    platform: "Instagram",
    category: "",
    active_provider_id: "pak_smm",
    active_remote_service_id: "",
    auto_route: true,
    base_rate_usd: 0.5,
    rate_multiplier: 1.07,
    min: 10,
    max: 100000,
    refill: true,
    cancel: false,
    is_guaranteed: true,
    popular: false,
    enabled: true,
    description: "",
  });

  const providerStats = useMemo(() => {
    const list = [
      { id: "pak_smm", name: "PAK SMM", short: "PAK SMM", color: "text-blue-400", border: "border-blue-500/30", badge: "bg-blue-500/20 text-blue-300", barBg: "bg-blue-500" },
      { id: "smooth_smm", name: "Smooth SMM", short: "Smooth", color: "text-emerald-400", border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300", barBg: "bg-emerald-500" },
      { id: "am_smm", name: "AM SMM", short: "AM SMM", color: "text-purple-400", border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-300", barBg: "bg-purple-500" },
      { id: "pakistan_smm", name: "Pakistan SMM", short: "Pakistan", color: "text-amber-400", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-300", barBg: "bg-amber-500" },
      { id: "rizvi_smm", name: "Rizvi SMM", short: "Rizvi", color: "text-rose-400", border: "border-rose-500/30", badge: "bg-rose-500/20 text-rose-300", barBg: "bg-rose-500" },
    ];

    const totalServices = services.length || 1;
    const counts: Record<string, { activeCount: number; cheapestCount: number; quotesCount: number }> = {
      pak_smm: { activeCount: 0, cheapestCount: 0, quotesCount: 0 },
      smooth_smm: { activeCount: 0, cheapestCount: 0, quotesCount: 0 },
      am_smm: { activeCount: 0, cheapestCount: 0, quotesCount: 0 },
      pakistan_smm: { activeCount: 0, cheapestCount: 0, quotesCount: 0 },
      rizvi_smm: { activeCount: 0, cheapestCount: 0, quotesCount: 0 },
    };

    services.forEach((s) => {
      // 1. Determine active provider
      const activeId = s.active_provider_id || (s.auto_route !== false && s.fallback_queue?.[0]?.providerId) || "";
      if (counts[activeId]) {
        counts[activeId].activeCount++;
      }

      // 2. Determine quotes and cheapest provider
      const rates = s.provider_rates || {};
      let lowestPId: string | null = null;
      let lowestRate = Infinity;

      for (const p of list) {
        if (rates[p.id] && typeof rates[p.id].rateUsd === "number") {
          counts[p.id].quotesCount++;
          if (rates[p.id].rateUsd < lowestRate) {
            lowestRate = rates[p.id].rateUsd;
            lowestPId = p.id;
          }
        }
      }

      if (lowestPId && counts[lowestPId]) {
        counts[lowestPId].cheapestCount++;
      }
    });

    return list.map((p) => {
      const data = counts[p.id] || { activeCount: 0, cheapestCount: 0, quotesCount: 0 };
      const pct = Math.round((data.activeCount / totalServices) * 1000) / 10;
      return {
        ...p,
        activeCount: data.activeCount,
        percent: pct,
        cheapestCount: data.cheapestCount,
        quotesCount: data.quotesCount,
      };
    });
  }, [services]);

  const platforms = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.platform) set.add(s.platform);
    });
    return ["All", ...Array.from(set).sort()];
  }, [services]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return services.filter((s) => {
      if (selectedPlatform !== "All" && s.platform !== selectedPlatform) return false;
      if (autoRouteFilter === "Auto" && s.auto_route === false) return false;
      if (autoRouteFilter === "Manual" && s.auto_route !== false) return false;
      if (statusFilter === "Enabled" && s.enabled === false) return false;
      if (statusFilter === "Disabled" && s.enabled !== false) return false;
      if (providerFilter !== "All") {
        const activeId = s.active_provider_id || (s.auto_route !== false && s.fallback_queue?.[0]?.providerId) || "";
        if (activeId !== providerFilter) return false;
      }
      if (!q) return true;
      return (
        String(s.name || "").toLowerCase().includes(q) ||
        String(s.platform || "").toLowerCase().includes(q) ||
        String(s.category || "").toLowerCase().includes(q) ||
        String(s.service || s.id || "").includes(q)
      );
    });
  }, [services, debouncedSearch, selectedPlatform, autoRouteFilter, providerFilter, statusFilter]);

  const handleDeleteService = useCallback(async (s: any) => {
    const sId = String(s.service || s.id);
    if (!confirm(`Are you sure you want to permanently delete service #${sId} ("${s.name}")?\n\nThis will remove it completely from the catalog.`)) {
      return;
    }
    try {
      await api(`/api/admin/services?id=${encodeURIComponent(sId)}`, {
        method: "DELETE",
      });
      setServices((prev) => prev.filter((x) => String(x.service || x.id) !== sId));
      alert(`✓ Service #${sId} deleted successfully.`);
    } catch (e: any) {
      alert("Failed to delete service: " + (e.message || "Unknown error"));
    }
  }, [api, setServices]);

  const handleEditFullService = useCallback((s: any) => {
    setEditingFullService(s);
  }, []);

  async function handleBulkMultiplier() {
    const val = Number(bulkMult);
    if (!Number.isFinite(val) || val < 0.1 || val > 50) {
      alert("Please enter a valid multiplier between 0.1 and 50 (e.g. 1.07 for 7% margin).");
      return;
    }
    const targetLabel = selectedPlatform === "All" ? "ALL services" : `all ${selectedPlatform} services`;
    if (!confirm(`Apply markup multiplier ×${val.toFixed(2)} to ${targetLabel}?`)) return;

    try {
      setBulkLoading(true);
      const res = await api("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_multiplier",
          rateMultiplier: val,
          platform: selectedPlatform,
        }),
      });
      alert(res.message || "Bulk multiplier applied!");
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Bulk update failed.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkStatus(targetEnabled: boolean) {
    const count = filtered.length;
    if (count === 0) {
      alert("No services match the current filter.");
      return;
    }
    const actionLabel = targetEnabled ? "ENABLE" : "DISABLE";
    const targetLabel = selectedPlatform === "All" ? `all ${count} filtered services` : `all ${count} filtered ${selectedPlatform} services`;
    if (!confirm(`Are you sure you want to ${actionLabel} ${targetLabel}?`)) return;

    try {
      setBulkStatusLoading(true);
      const targetIds = filtered.map((s) => Number(s.service || s.id));
      const res = await api("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_status",
          enabled: targetEnabled,
          serviceIds: targetIds,
        }),
      });
      setServices((prev) =>
        prev.map((s) => (targetIds.includes(Number(s.service || s.id)) ? { ...s, enabled: targetEnabled } : s))
      );
      alert(res.message || `Services ${actionLabel.toLowerCase()}d successfully.`);
    } catch (e: any) {
      alert(e.message || "Bulk status update failed.");
    } finally {
      setBulkStatusLoading(false);
    }
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!newServiceForm.name.trim()) {
      alert("Please enter a service name.");
      return;
    }
    try {
      setSavingNew(true);
      const res = await api("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newServiceForm),
      });
      if (res?.service) {
        setServices((prev) => [res.service, ...prev]);
        alert("✓ New service created successfully!");
        setIsAddingService(false);
      }
    } catch (e: any) {
      alert("Failed to create service: " + (e.message || "Unknown error"));
    } finally {
      setSavingNew(false);
    }
  }

  async function handleUpdateFullService(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFullService) return;
    try {
      setSavingEdit(true);
      const res = await api("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: String(editingFullService.service || editingFullService.id),
          name: editingFullService.name,
          platform: editingFullService.platform,
          category: editingFullService.category,
          min: editingFullService.min,
          max: editingFullService.max,
          refill: editingFullService.refill,
          cancel: editingFullService.cancel,
          is_guaranteed: editingFullService.is_guaranteed,
          enabled: editingFullService.enabled,
          popular: editingFullService.popular,
          autoRoute: editingFullService.auto_route,
          activeProviderId: editingFullService.active_provider_id,
          activeRemoteServiceId: editingFullService.active_remote_service_id,
          baseRateUsd: editingFullService.base_rate_usd,
          rateMultiplier: Number(editingFullService.rate_multiplier || 1.07),
          ratePkr: editingFullService.rate_pkr != null ? Number(editingFullService.rate_pkr) : undefined,
          custom_rate_pkr: editingFullService.custom_rate_pkr != null ? Number(editingFullService.custom_rate_pkr) : (editingFullService.rate_pkr != null ? Number(editingFullService.rate_pkr) : undefined),
          rateUsd: editingFullService.rate_usd != null ? Number(editingFullService.rate_usd) : undefined,
          description: editingFullService.description,
        }),
      });
      if (res?.service) {
        setServices((prev) =>
          prev.map((x) =>
            String(x.service || x.id) === String(editingFullService.service || editingFullService.id)
              ? { ...x, ...res.service }
              : x
          )
        );
        alert("✓ Service updated successfully!");
        setEditingFullService(null);
      }
    } catch (e: any) {
      alert("Failed to update service: " + (e.message || "Unknown error"));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Live Upstream Provider Balance Cards */}
      <ProviderBalancesWidget
        balances={balances}
        loading={balancesLoading}
        lastChecked={balancesLastChecked}
        error={balancesError}
        onRefresh={onRefreshBalances}
      />

      {/* 2. Upstream Provider API Utilization & Market Share Breakdown */}
      <section className={card + " overflow-hidden p-5"}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔌</span>
              <h3 className="text-base font-black text-white">Upstream API Service Allocation &amp; Active Utilization</h3>
              <span className="rounded-full bg-[#baff00]/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#cfff62]">
                {services.length} Total Services
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Live breakdown showing exactly how many catalog services are actively routed to and fulfilled by each upstream provider API. Click any card to filter the matrix table.
            </p>
          </div>
          {providerFilter !== "All" && (
            <button
              onClick={() => setProviderFilter("All")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <span>✕</span>
              <span>Reset Filter (Showing {providerFilter.replace("_smm", " SMM")})</span>
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {providerStats.map((p) => {
            const isSelected = providerFilter === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setProviderFilter(isSelected ? "All" : p.id)}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 cursor-pointer select-none ${
                  isSelected
                    ? "border-[#baff00] bg-[#baff00]/10 shadow-[0_0_24px_rgba(186,255,0,0.15)] ring-1 ring-[#baff00]/40"
                    : `${p.border} bg-[#0b1418] hover:border-white/20 hover:bg-white/[0.03]`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white group-hover:text-[#baff00] transition-colors">{p.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${p.badge}`}>
                      {p.short}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1.5">
                    <p className={`text-3xl font-black font-mono ${isSelected ? "text-[#baff00]" : p.color}`}>
                      {p.activeCount}
                    </p>
                    <span className="text-xs font-bold text-slate-400">
                      active ({p.percent}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full transition-all duration-500 ${isSelected ? "bg-[#baff00]" : p.barBg}`}
                      style={{ width: `${Math.max(4, Math.min(100, p.percent))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="text-emerald-400">★</span> Lowest Rate:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{p.cheapestCount} services</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>📋</span> Mapped Quotes:
                    </span>
                    <span className="font-mono text-slate-300">{p.quotesCount} services</span>
                  </div>
                </div>

                <div className="mt-3.5">
                  <span className={`inline-block w-full rounded-lg py-1.5 text-center text-[10px] font-black uppercase tracking-wider transition ${
                    isSelected
                      ? "bg-[#baff00] text-[#07100f] shadow-sm"
                      : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white"
                  }`}>
                    {isSelected ? "✓ Active Filter" : "Filter Services"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Rates Matrix Controls & Sync Bar */}
      <section className={card + " overflow-hidden"}>
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-white">Least-Cost Multi-Provider Routing Matrix</h2>
              <span className="rounded-full bg-[#baff00]/10 px-3 py-1 text-xs font-black text-[#cfff62]">
                {services.length} ACTIVE ROUTES
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Live price synchronization across PAK SMM, Smooth SMM, AM SMM, Pakistan SMM &amp; Rizvi SMM. Upstream rates are native <strong className="text-slate-200">USD ($)</strong>, dynamically converted to <strong className="text-[#baff00]">PKR (₨)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setNewServiceForm({
                  name: "",
                  platform: selectedPlatform !== "All" ? selectedPlatform : "Instagram",
                  category: "",
                  active_provider_id: "pak_smm",
                  active_remote_service_id: "",
                  auto_route: true,
                  base_rate_usd: 0.5,
                  rate_multiplier: 1.07,
                  min: 10,
                  max: 100000,
                  refill: true,
                  cancel: false,
                  is_guaranteed: true,
                  popular: false,
                  enabled: true,
                  description: "",
                });
                setIsAddingService(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition cursor-pointer"
            >
              <span>➕</span>
              <span>Add New Service</span>
            </button>

            <button
              type="button"
              disabled={bulkStatusLoading || busy || filtered.length === 0}
              onClick={() => handleBulkStatus(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-40 cursor-pointer"
              title="Enable all currently filtered services"
            >
              <span>✓</span>
              <span>Enable All ({filtered.length})</span>
            </button>

            <button
              type="button"
              disabled={bulkStatusLoading || busy || filtered.length === 0}
              onClick={() => handleBulkStatus(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-40 cursor-pointer"
              title="Disable all currently filtered services"
            >
              <span>✕</span>
              <span>Disable All ({filtered.length})</span>
            </button>

            <button
              disabled={syncingProviders}
              onClick={syncProviders}
              className="inline-flex items-center gap-2 rounded-xl bg-[#baff00] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#07100f] shadow-[0_4px_20px_rgba(186,255,0,0.25)] transition hover:bg-[#d2ff5a] disabled:opacity-60 cursor-pointer"
            >
              {syncingProviders ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 0 1 8-8" strokeWidth="4" className="opacity-75" />
                  </svg>
                  Syncing 5 Providers...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Sync Providers
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Forex & Pricing Information Strip */}
        <div className="grid grid-cols-1 gap-3 border-b border-white/10 bg-[#07100f]/80 p-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#baff00]/10 text-lg text-[#baff00]">
              💱
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Forex Rate</p>
              <p className="font-mono text-sm font-black text-white">
                1 USD = <span className="text-[#baff00]">₨{Number(usdToPkr || 278).toFixed(2)}</span> PKR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-lg text-cyan-400">
              🌐
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upstream Native Currency</p>
              <p className="font-mono text-sm font-black text-white">
                USD ($) <span className="text-[11px] font-normal text-slate-400">via 5 SMM APIs</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-lg text-purple-400">
              📈
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pricing Formula</p>
              <p className="font-mono text-[11px] font-semibold text-slate-300">
                Base USD × Multiplier × Live Rate
              </p>
            </div>
          </div>

          {/* Bulk Multiplier Action */}
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bulk Margin Multiplier</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="10"
                  value={bulkMult}
                  onChange={(e) => setBulkMult(e.target.value)}
                  className="w-16 h-7 rounded border border-white/10 bg-[#0b1418] px-2 font-mono text-xs text-white outline-none focus:border-[#baff00]/50"
                  placeholder="1.07"
                />
                <button
                  type="button"
                  disabled={bulkLoading || busy}
                  onClick={handleBulkMultiplier}
                  className="h-7 rounded bg-[#baff00] px-2.5 text-[10px] font-black uppercase text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-50 whitespace-nowrap"
                >
                  {bulkLoading ? "Applying..." : "Apply to Filtered"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {syncMessage && (
          <div className="border-b border-[#baff00]/20 bg-[#baff00]/10 px-5 py-3 text-xs font-bold text-[#cfff62]">
            {syncMessage}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-white/10 bg-[#0b1418]/60 p-4 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by service name, platform, ID..."
            className="h-10 flex-1 rounded-xl border border-white/10 bg-[#0b1418] px-4 text-xs text-white outline-none focus:border-[#baff00]/50"
          />

          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none"
          >
            {platforms.map((p: string) => (
              <option key={p} value={p}>
                {p === "All" ? "All Platforms" : p}
              </option>
            ))}
          </select>

          <select
            value={autoRouteFilter}
            onChange={(e) => setAutoRouteFilter(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none focus:border-[#baff00]/50"
          >
            <option value="All">All Routing Modes</option>
            <option value="Auto">Auto-Route Only</option>
            <option value="Manual">Manual Override Only</option>
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none focus:border-[#baff00]/50"
          >
            <option value="All">All Upstream APIs ({services.length} services)</option>
            {providerStats.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.activeCount} active · {p.percent}%)
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none focus:border-[#baff00]/50"
          >
            <option value="All">All Statuses</option>
            <option value="Enabled">🟢 Enabled Only</option>
            <option value="Disabled">🔴 Disabled Only</option>
          </select>
        </div>

        {/* 3. Rates Matrix Table */}
        <div className="overflow-x-auto">
          <table className="min-w-[1550px] w-full text-left">
            <thead className="bg-[#0b1418] text-[11px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Service &amp; Platform</th>
                <th className="px-4 py-3.5">Routing Mode</th>
                <th className="px-4 py-3.5">Active Base ($ USD)</th>
                <th className="px-4 py-3.5">PAK SMM ($)</th>
                <th className="px-4 py-3.5">Smooth SMM ($)</th>
                <th className="px-4 py-3.5">AM SMM ($)</th>
                <th className="px-4 py-3.5">Pakistan SMM ($)</th>
                <th className="px-4 py-3.5">Rizvi SMM ($)</th>
                <th className="px-4 py-3.5">Markup Multiplier</th>
                <th className="px-4 py-3.5">Retail Price ($ USD)</th>
                <th className="px-4 py-3.5">Retail Price (₨ PKR)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center sticky right-0 bg-[#0b1418] z-20 shadow-[-6px_0_12px_rgba(0,0,0,0.6)]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filtered.slice(0, displayCount).map((s: any) => (
                <ServiceMatrixRow
                  key={s.service || s.id}
                  s={s}
                  usdToPkr={usdToPkr}
                  savingRowId={savingRowId}
                  savedRowId={savedRowId}
                  onInlineSave={handleInlineSave}
                  onEditFullService={handleEditFullService}
                  onDeleteService={handleDeleteService}
                />
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-10 text-center text-sm text-slate-500">No matching services found in routing matrix.</p>
          )}
          {filtered.length > displayCount && (
            <div className="flex items-center justify-between border-t border-white/5 bg-[#0b1418]/60 p-4">
              <span className="text-xs text-slate-400">
                Showing <strong className="text-white">{displayCount}</strong> of <strong className="text-white">{filtered.length}</strong> matching services
              </span>
              <button
                type="button"
                onClick={() => setDisplayCount((prev) => prev + 50)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10 hover:border-[#baff00]/40 cursor-pointer"
              >
                Load More Services (+50)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. Comprehensive Add New Service Modal */}
      {isAddingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#111a1d] shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#0b1418]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase">
                    New Catalog Service
                  </span>
                </div>
                <h3 className="mt-1 font-black text-lg text-white">
                  ➕ Add New Service
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingService(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService} className="overflow-y-auto p-6 space-y-5 flex-1">
              {/* Row 1: Name & Platform */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newServiceForm.name}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                    placeholder="e.g. Instagram Followers [Non-Drop • Real • 30D Refill]"
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Platform *
                  </label>
                  <select
                    value={newServiceForm.platform}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, platform: e.target.value })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none focus:border-[#baff00]/50"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Twitter">Twitter / X</option>
                    <option value="Spotify">Spotify</option>
                    <option value="Threads">Threads</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Category & Active Provider */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newServiceForm.category}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, category: e.target.value })}
                    placeholder="e.g. Instagram Followers — Guaranteed"
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Fulfillment Provider
                  </label>
                  <select
                    value={newServiceForm.active_provider_id}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, active_provider_id: e.target.value })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none focus:border-[#baff00]/50"
                  >
                    <option value="pak_smm">PAK SMM Panels (paksmmpanels.com)</option>
                    <option value="smooth_smm">Smooth SMM (smoothsmm.com)</option>
                    <option value="am_smm">AM SMM Panel (amsmmpanel.com)</option>
                    <option value="pakistan_smm">Pakistan SMM Panel (pakistansmmpanel.pk)</option>
                    <option value="rizvi_smm">Rizvi SMM Panels (rizvismmpanels.com)</option>
                    <option value="manual">Manual / Direct Fulfillment</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Remote Service ID & Routing Mode */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Remote Provider Service ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={newServiceForm.active_remote_service_id}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, active_remote_service_id: e.target.value })}
                    placeholder="e.g. 1024 (leave blank for manual)"
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Routing Automation
                  </label>
                  <div className="flex items-center gap-3 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newServiceForm.auto_route}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, auto_route: e.target.checked })}
                        className="h-4 w-4 rounded accent-[#baff00]"
                      />
                      <span className="text-xs font-semibold text-slate-300">
                        Enable Auto-Route failover
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 4: Base Rate USD & Margin Multiplier */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Wholesale Base Cost ($ USD per 1k)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={newServiceForm.base_rate_usd}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, base_rate_usd: parseFloat(e.target.value) || 0 })}
                    placeholder="0.50"
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Profit Margin Multiplier (e.g. 1.07 = +7%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="20"
                    value={newServiceForm.rate_multiplier}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, rate_multiplier: parseFloat(e.target.value) || 1.07 })}
                    placeholder="1.07"
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>
              </div>

              {/* Live Price Preview Box */}
              <div className="rounded-xl border border-[#baff00]/20 bg-[#baff00]/5 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#cfff62]">💰 Live Price Calculator</span>
                  <span className="text-[10px] font-mono text-slate-400">1 USD = ₨{Number(usdToPkr || 278).toFixed(2)}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-[10px] text-slate-400">Wholesale USD</p>
                    <p className="text-sm font-black font-mono text-white">${Number(newServiceForm.base_rate_usd || 0).toFixed(4)}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-[10px] text-slate-400">Retail USD</p>
                    <p className="text-sm font-black font-mono text-cyan-400">
                      ${(Number(newServiceForm.base_rate_usd || 0) * Number(newServiceForm.rate_multiplier || 1.07)).toFixed(4)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#baff00]/10 border border-[#baff00]/20 p-2">
                    <p className="text-[10px] text-[#cfff62]">Customer PKR Rate</p>
                    <p className="text-sm font-black font-mono text-[#baff00]">
                      ₨{(Number(newServiceForm.base_rate_usd || 0) * Number(newServiceForm.rate_multiplier || 1.07) * (usdToPkr || 278)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 5: Min & Max Limits */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Minimum Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newServiceForm.min}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, min: parseInt(e.target.value) || 10 })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Maximum Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newServiceForm.max}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, max: parseInt(e.target.value) || 100000 })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>
              </div>

              {/* Row 6: Feature Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition">
                  <input
                    type="checkbox"
                    checked={newServiceForm.enabled}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, enabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#baff00]"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Active</p>
                    <p className="text-[10px] text-slate-400">Visible to users</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition">
                  <input
                    type="checkbox"
                    checked={newServiceForm.is_guaranteed}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, is_guaranteed: e.target.checked, refill: e.target.checked })}
                    className="h-4 w-4 rounded accent-emerald-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-emerald-400">Refill ♻</p>
                    <p className="text-[10px] text-slate-400">Guaranteed refill</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition">
                  <input
                    type="checkbox"
                    checked={newServiceForm.cancel}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, cancel: e.target.checked })}
                    className="h-4 w-4 rounded accent-cyan-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Cancelable</p>
                    <p className="text-[10px] text-slate-400">Cancel button</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition">
                  <input
                    type="checkbox"
                    checked={newServiceForm.popular}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, popular: e.target.checked })}
                    className="h-4 w-4 rounded accent-amber-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-amber-300">Popular ★</p>
                    <p className="text-[10px] text-slate-400">Badge highlight</p>
                  </div>
                </label>
              </div>

              {/* Row 7: Service Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Service Description &amp; Instructions
                </label>
                <textarea
                  rows={4}
                  value={newServiceForm.description}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
                  placeholder="Enter details, speed, link guidelines, guarantee rules..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1418] p-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddingService(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {savingNew ? "Creating..." : "✓ Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Comprehensive Edit Existing Service Modal */}
      {editingFullService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#111a1d] shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#0b1418]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    {editingFullService.platform || "Service"}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ID #{editingFullService.service || editingFullService.id}
                  </span>
                </div>
                <h3 className="mt-1 font-black text-lg text-white line-clamp-1">
                  ✏️ Edit Service: {editingFullService.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFullService(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateFullService} className="overflow-y-auto p-6 space-y-5 flex-1">
              {/* Row 1: Name & Platform */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingFullService.name || ""}
                    onChange={(e) => setEditingFullService({ ...editingFullService, name: e.target.value })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Platform *
                  </label>
                  <select
                    value={editingFullService.platform || "Instagram"}
                    onChange={(e) => setEditingFullService({ ...editingFullService, platform: e.target.value })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none focus:border-[#baff00]/50"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Twitter">Twitter / X</option>
                    <option value="Spotify">Spotify</option>
                    <option value="Threads">Threads</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Category & Active Provider */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingFullService.category || ""}
                    onChange={(e) => setEditingFullService({ ...editingFullService, category: e.target.value })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Fulfillment Provider
                  </label>
                  <select
                    value={editingFullService.active_provider_id || "pak_smm"}
                    onChange={(e) => setEditingFullService({ ...editingFullService, active_provider_id: e.target.value, auto_route: false })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none focus:border-[#baff00]/50"
                  >
                    <option value="pak_smm">PAK SMM Panels (paksmmpanels.com)</option>
                    <option value="smooth_smm">Smooth SMM (smoothsmm.com)</option>
                    <option value="am_smm">AM SMM Panel (amsmmpanel.com)</option>
                    <option value="pakistan_smm">Pakistan SMM Panel (pakistansmmpanel.pk)</option>
                    <option value="rizvi_smm">Rizvi SMM Panels (rizvismmpanels.com)</option>
                    <option value="manual">Manual / Direct Fulfillment</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Remote Service ID & Routing Mode */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Remote Provider Service ID
                  </label>
                  <input
                    type="text"
                    value={editingFullService.active_remote_service_id || ""}
                    onChange={(e) => setEditingFullService({ ...editingFullService, active_remote_service_id: e.target.value })}
                    placeholder="e.g. 1024"
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Routing Automation
                  </label>
                  <div className="flex items-center gap-3 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingFullService.auto_route !== false}
                        onChange={(e) => setEditingFullService({ ...editingFullService, auto_route: e.target.checked })}
                        className="h-4 w-4 rounded accent-[#baff00]"
                      />
                      <span className="text-xs font-semibold text-slate-300">
                        Enable Auto-Route Least-Cost Failover
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 4: Base Rate USD, Multiplier & Direct Retail PKR Price */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Wholesale Base Cost ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={editingFullService.base_rate_usd ?? 0}
                    onChange={(e) => {
                      const curBase = parseFloat(e.target.value) || 0;
                      const effectiveRate = usdToPkr || 285;
                      const curMult = Number(editingFullService.rate_multiplier || 1.07);
                      const calcPkr = Math.round(curBase * curMult * effectiveRate * 100) / 100;
                      setEditingFullService({
                        ...editingFullService,
                        base_rate_usd: curBase,
                        rate_pkr: editingFullService.custom_rate_pkr ? editingFullService.rate_pkr : calcPkr,
                        rate_usd: Math.round(curBase * curMult * 10000) / 10000,
                      });
                    }}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Profit Multiplier (e.g. 1.07)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="20"
                    value={editingFullService.rate_multiplier ?? 1.07}
                    onChange={(e) => {
                      const multVal = parseFloat(e.target.value) || 1.07;
                      const curBase = Number(editingFullService.base_rate_usd || 0);
                      const effectiveRate = usdToPkr || 285;
                      const calcPkr = Math.round(curBase * multVal * effectiveRate * 100) / 100;
                      setEditingFullService({
                        ...editingFullService,
                        rate_multiplier: multVal,
                        rate_pkr: calcPkr,
                        custom_rate_pkr: undefined,
                        rate_usd: Math.round(curBase * multVal * 10000) / 10000,
                      });
                    }}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#baff00] mb-1.5 flex items-center justify-between">
                    <span>Retail PKR Price (₨)</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Direct Input</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#baff00]">₨</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingFullService.rate_pkr !== undefined ? editingFullService.rate_pkr : Math.round(Number(editingFullService.base_rate_usd || 0) * Number(editingFullService.rate_multiplier || 1.07) * (usdToPkr || 285) * 100) / 100}
                      onChange={(e) => {
                        const pkrVal = parseFloat(e.target.value) || 0;
                        const curBase = Number(editingFullService.base_rate_usd || 0);
                        const effectiveRate = usdToPkr || 285;
                        const uVal = Math.round((pkrVal / effectiveRate) * 10000) / 10000;
                        const newMult = curBase > 0 ? Math.round((uVal / curBase) * 10000) / 10000 : 1.07;
                        setEditingFullService({
                          ...editingFullService,
                          rate_pkr: pkrVal,
                          custom_rate_pkr: pkrVal,
                          rate_usd: uVal,
                          rate_multiplier: newMult,
                        });
                      }}
                      className="w-full h-10 rounded-xl border border-[#baff00]/40 bg-[#0b1418] pl-8 pr-3.5 text-xs font-black text-[#baff00] outline-none focus:border-[#baff00] font-mono shadow-[0_0_12px_rgba(186,255,0,0.1)]"
                    />
                  </div>
                </div>
              </div>

              {/* Live Price & Profitability Metrics Box */}
              {(() => {
                const curBase = Number(editingFullService.base_rate_usd || 0);
                const effectiveRate = usdToPkr || 285;
                const wholesalePkr = Math.round(curBase * effectiveRate * 100) / 100;
                const currentRetailPkr = editingFullService.rate_pkr != null
                  ? Number(editingFullService.rate_pkr)
                  : Math.round(curBase * Number(editingFullService.rate_multiplier || 1.07) * effectiveRate * 100) / 100;
                const profitPkr = Math.round((currentRetailPkr - wholesalePkr) * 100) / 100;
                const marginPct = wholesalePkr > 0 ? Math.round((profitPkr / wholesalePkr) * 100) : 0;
                const isLoss = currentRetailPkr < wholesalePkr;

                return (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-[#baff00]/20 bg-[#baff00]/5 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#cfff62]">💰 Real-Time Profit &amp; Pricing Breakdown</span>
                        <span className="text-[10px] font-mono text-slate-400">Rate: 1 USD = ₨{Number(effectiveRate).toFixed(2)}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-lg bg-white/5 p-2">
                          <p className="text-[10px] text-slate-400">Wholesale USD</p>
                          <p className="text-sm font-black font-mono text-white">${curBase.toFixed(4)}</p>
                        </div>
                        <div className="rounded-lg bg-white/5 p-2">
                          <p className="text-[10px] text-slate-400">Wholesale PKR</p>
                          <p className="text-sm font-black font-mono text-slate-300">₨{wholesalePkr.toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg bg-[#baff00]/10 border border-[#baff00]/20 p-2">
                          <p className="text-[10px] text-[#cfff62]">Customer PKR</p>
                          <p className="text-sm font-black font-mono text-[#baff00]">₨{currentRetailPkr.toFixed(2)}</p>
                        </div>
                        <div className={`rounded-lg p-2 border ${isLoss ? "bg-rose-500/15 border-rose-500/30 text-rose-400" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"}`}>
                          <p className="text-[10px] uppercase font-bold">{isLoss ? "LOSS / 1k" : "PROFIT / 1k"}</p>
                          <p className="text-sm font-black font-mono">{isLoss ? `-₨${Math.abs(profitPkr).toFixed(2)}` : `+₨${profitPkr.toFixed(2)}`} ({marginPct}%)</p>
                        </div>
                      </div>
                    </div>

                    {isLoss && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                        <span>⚠️</span>
                        <span><strong>Negative Margin Warning:</strong> Retail price is lower than wholesale cost (₨{wholesalePkr.toFixed(2)}). Platform will automatically enforce a 5% floor (₨{(wholesalePkr * 1.05).toFixed(2)}) to prevent loss.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Row 5: Min & Max Limits */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Minimum Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingFullService.min ?? 10}
                    onChange={(e) => setEditingFullService({ ...editingFullService, min: parseInt(e.target.value) || 10 })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Maximum Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingFullService.max ?? 100000}
                    onChange={(e) => setEditingFullService({ ...editingFullService, max: parseInt(e.target.value) || 100000 })}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                  />
                </div>
              </div>

              {/* Row 6: Feature Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition">
                  <input
                    type="checkbox"
                    checked={editingFullService.enabled !== false}
                    onChange={(e) => setEditingFullService({ ...editingFullService, enabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#baff00]"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Active</p>
                    <p className="text-[10px] text-slate-400">Visible to users</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition">
                  <input
                    type="checkbox"
                    checked={Boolean(editingFullService.is_guaranteed || editingFullService.refill)}
                    onChange={(e) => setEditingFullService({ ...editingFullService, is_guaranteed: e.target.checked, refill: e.target.checked })}
                    className="h-4 w-4 rounded accent-emerald-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-emerald-400">Refill ♻</p>
                    <p className="text-[10px] text-slate-400">Guaranteed refill</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition">
                  <input
                    type="checkbox"
                    checked={Boolean(editingFullService.cancel)}
                    onChange={(e) => setEditingFullService({ ...editingFullService, cancel: e.target.checked })}
                    className="h-4 w-4 rounded accent-cyan-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Cancelable</p>
                    <p className="text-[10px] text-slate-400">Cancel button</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition">
                  <input
                    type="checkbox"
                    checked={Boolean(editingFullService.popular)}
                    onChange={(e) => setEditingFullService({ ...editingFullService, popular: e.target.checked })}
                    className="h-4 w-4 rounded accent-amber-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-amber-300">Popular ★</p>
                    <p className="text-[10px] text-slate-400">Badge highlight</p>
                  </div>
                </label>
              </div>

              {/* Row 7: Service Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Service Description &amp; Instructions
                </label>
                <textarea
                  rows={6}
                  value={editingFullService.description || ""}
                  onChange={(e) => setEditingFullService({ ...editingFullService, description: e.target.value })}
                  placeholder="Enter detailed description, speed, link format, refill guidelines..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1418] p-3.5 text-xs text-white outline-none focus:border-[#baff00]/50 font-mono"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingFullService(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-[#baff00] hover:bg-[#d2ff5a] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#07100f] shadow-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Saving..." : "✓ Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Withdrawals({ withdrawals, reload, update, busy }: { withdrawals: any[]; reload: () => void; update: (id: string, a: "approve" | "reject") => void; busy: boolean }) {
  return (
    <section className={card + " overflow-hidden"}>
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-black">Referral Commission Cashouts</h2>
          <p className="mt-1 text-sm text-slate-400">Review payout requests submitted by users once they reach the $3.00 minimum threshold.</p>
        </div>
        <button onClick={reload} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10">
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left">
          <thead className="bg-[#0b1418] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Method</th>
              <th className="px-5 py-4">Account Number</th>
              <th className="px-5 py-4">Account Title</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {withdrawals.map((w) => (
              <tr key={w.id} className="hover:bg-white/[.02]">
                <td className="px-5 py-4">
                  <b>{w.name}</b>
                  <p className="text-xs text-slate-500">{w.email}</p>
                </td>
                <td className="px-5 py-4 font-semibold text-white">{w.method}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-300">{w.accountNumber}</td>
                <td className="px-5 py-4 text-xs text-slate-400">{w.accountTitle || "—"}</td>
                <td className="px-5 py-4 font-black text-[#baff00]">
                  ₨{w.amountPkr.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-slate-400">(${w.amountUsd})</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                    w.status === "Paid" || w.status === "Transferred to Wallet"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : w.status === "Rejected"
                      ? "bg-red-400/10 text-red-300"
                      : "bg-amber-400/10 text-amber-300"
                  }`}>
                    {w.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                  {new Date(w.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  {w.status === "Pending" ? (
                    <div className="flex gap-2">
                      <button disabled={busy} onClick={() => update(w.id, "approve")} className="rounded-lg bg-[#baff00] px-3 py-1.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50">
                        Mark Paid
                      </button>
                      <button disabled={busy} onClick={() => update(w.id, "reject")} className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20 disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">Processed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!withdrawals.length && <p className="p-10 text-center text-sm text-slate-500">No referral withdrawal requests found.</p>}
      </div>
    </section>
  );
}

function Tickets({ tickets, reload, updateStatus, busy }: { tickets: any[]; reload: () => void; updateStatus: (id: string, s: string) => void; busy: boolean }) {
  return (
    <section className={card + " overflow-hidden"}>
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-black">Support Tickets Queue</h2>
          <p className="mt-1 text-sm text-slate-400">User inquiries, order assistance, and deposit questions submitted through Support Center.</p>
        </div>
        <button onClick={reload} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10">
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left">
          <thead className="bg-[#0b1418] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Ticket</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Order Ref</th>
              <th className="px-5 py-4">Message</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-white/[.02]">
                <td className="px-5 py-4">
                  <b className="font-mono text-xs">#{t.id.slice(0, 8)}</b>
                  <p className="font-bold text-white text-sm mt-0.5">{t.subject}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.email}</p>
                </td>
                <td className="px-5 py-4 text-xs text-slate-300">{t.category}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-400">{t.orderId ? `#${t.orderId}` : "—"}</td>
                <td className="max-w-[300px] px-5 py-4 text-xs text-slate-300">
                  <p className="line-clamp-2">{t.message}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                    t.status === "Resolved"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : t.status === "In Review"
                      ? "bg-sky-400/10 text-sky-300"
                      : "bg-amber-400/10 text-amber-300"
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  <select
                    disabled={busy}
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#0b1418] px-2 py-1.5 text-xs text-white outline-none focus:border-[#baff00]"
                  >
                    <option value="Open">Open</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!tickets.length && <p className="p-10 text-center text-sm text-slate-500">No support tickets found.</p>}
      </div>
    </section>
  );
}

function Announcements({ ann, title, setTitle, message, setMessage, create, del, busy }: { ann: any[]; title: string; setTitle: (x: string) => void; message: string; setMessage: (x: string) => void; create: () => void; del: (x: string) => void; busy: boolean }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className={card + " p-5"}>
        <h2 className="text-xl font-black">New Announcement</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-[#0b1418] px-4 text-sm outline-none focus:border-[#baff00]"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message shown to users..."
          rows={7}
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1418] p-4 text-sm outline-none focus:border-[#baff00]"
        />
        <button disabled={busy} onClick={create} className="mt-3 w-full rounded-xl bg-[#baff00] px-4 py-3 text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50">
          Publish
        </button>
      </div>
      <div className={card + " divide-y divide-white/5 overflow-hidden"}>
        {ann.map((a) => (
          <div key={a.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-black">{a.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{a.message}</p>
              </div>
              <button onClick={() => del(a.id)} className="text-xs font-bold text-red-300 hover:underline">
                Delete
              </button>
            </div>
            <p className="mt-3 text-[10px] uppercase text-slate-600">
              {a.enabled ? "Live" : "Disabled"} · {new Date(a.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        {!ann.length && <p className="p-10 text-center text-sm text-slate-500">No announcements.</p>}
      </div>
    </section>
  );
}

function Activity({ rows }: { rows: any[] }) {
  return (
    <section className={card + " overflow-hidden"}>
      <div className="overflow-x-auto">
        <table className="min-w-[950px] w-full text-left">
          <thead className="bg-[#0b1418] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Time</th>
              <th className="px-5 py-4">Admin</th>
              <th className="px-5 py-4">Action</th>
              <th className="px-5 py-4">Target</th>
              <th className="px-5 py-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/[.02]">
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-5 py-4 text-sm">{r.adminEmail || "—"}</td>
                <td className="px-5 py-4"><Badge>{r.action}</Badge></td>
                <td className="px-5 py-4 text-xs">{r.targetType || "—"} / {r.targetId || "—"}</td>
                <td className="max-w-[450px] px-5 py-4 font-mono text-xs text-slate-400">{JSON.stringify(r.details || {})}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-10 text-center text-sm text-slate-500">No admin activity yet.</p>}
      </div>
    </section>
  );
}

const ALL_PERMISSIONS = [
  { key: "orders", label: "Manage Orders", icon: "📦", desc: "View, update statuses, retry, or cancel customer orders" },
  { key: "tickets", label: "Support Tickets", icon: "💬", desc: "Read customer inquiries and send official support replies" },
  { key: "deposits", label: "Manage Deposits", icon: "💳", desc: "Review payment screenshots, approve or reject deposits" },
  { key: "services", label: "Services & Pricing", icon: "⚡", desc: "Enable/disable services and adjust pricing markups" },
  { key: "announcements", label: "Announcements", icon: "📢", desc: "Create, edit, and publish platform news and alerts" },
  { key: "users", label: "Customer Accounts", icon: "👥", desc: "View customer directory, emails, and balances" },
  { key: "analytics", label: "Dashboard Analytics", icon: "📊", desc: "Access overview revenue, orders, and system statistics" },
  { key: "withdrawals", label: "Referral Payouts", icon: "💸", desc: "Review and approve affiliate commission withdrawals" },
  { key: "coupons", label: "Coupons & Vouchers", icon: "🎟️", desc: "Create discount codes, promo vouchers, and usage limits" },
  { key: "subscriptions", label: "Subscriptions & Tools", icon: "⚡", desc: "Manage ElevateX reseller gateway, automated tools and accounts" },
  { key: "settings", label: "Platform & Payment Controls", icon: "⚙️", desc: "Configure payment gateways, bank accounts, profit margins, and maintenance mode" },
  { key: "seo", label: "SEO & Metadata Engine", icon: "🚀", desc: "Edit search meta titles, descriptions, Google Search Console verification, and tracking pixels" },
];

function SubAdminsView({
  subAdmins,
  reload,
  api,
  busy,
  setBusy,
  setError,
}: {
  subAdmins: any[];
  reload: () => Promise<void>;
  api: (url: string, init?: RequestInit) => Promise<any>;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (s: string) => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPermissionsTarget, setEditPermissionsTarget] = useState<any>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<any>(null);

  // Form states
  const [addMode, setAddMode] = useState<"create" | "existing">("create");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPermissions, setNewPermissions] = useState<Record<string, boolean>>({
    orders: true,
    tickets: true,
  });

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState<any>(null);

  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const activeCount = subAdmins.filter((s) => s.isActive !== false).length;
  const suspendedCount = subAdmins.filter((s) => s.isActive === false).length;

  async function searchUsers(q: string) {
    setUserSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await api(`/api/admin/users?q=${encodeURIComponent(q.trim())}`);
      if (res?.users) {
        const existingSubAdminIds = new Set(subAdmins.map((s) => s.id));
        setUserSearchResults(
          res.users.filter(
            (u: any) =>
              !existingSubAdminIds.has(u.id) &&
              u.role !== "admin" &&
              u.role !== "super_admin"
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setSearchingUsers(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (addMode === "existing") {
      if (!selectedExistingUser) {
        setError("Please search and select an existing user account to promote.");
        return;
      }
      try {
        setBusy(true);
        await api("/api/admin/sub-admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            existingUserId: selectedExistingUser.id,
            permissions: newPermissions,
            password: newPassword.trim() || undefined,
          }),
        });
        setShowAddModal(false);
        setSelectedExistingUser(null);
        setUserSearchQuery("");
        setUserSearchResults([]);
        setNewPassword("");
        setNewPermissions({ orders: true, tickets: true });
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to promote user to sub-admin.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!newName.trim() || !newEmail.trim() || !newPassword) return;
    try {
      setBusy(true);
      await api("/api/admin/sub-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          permissions: newPermissions,
        }),
      });
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewPermissions({ orders: true, tickets: true });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sub-admin.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus(subAdmin: any, targetActive: boolean) {
    const promptMsg = targetActive
      ? `Re-activate staff account "${subAdmin.name}" (${subAdmin.email})?\nThey will be allowed to log in immediately.`
      : `Are you sure you want to suspend staff account "${subAdmin.name}" (${subAdmin.email})?\nAll active sessions will be terminated and they will not be able to log in.`;
    if (!confirm(promptMsg)) return;

    try {
      setBusy(true);
      await api("/api/admin/sub-admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subAdmin.id,
          isActive: targetActive,
        }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePermissions(e: React.FormEvent) {
    e.preventDefault();
    if (!editPermissionsTarget) return;
    try {
      setBusy(true);
      await api("/api/admin/sub-admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editPermissionsTarget.id,
          permissions: editPermissions,
        }),
      });
      setEditPermissionsTarget(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permissions.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPasswordTarget || newPasswordInput.length < 6) return;
    try {
      setBusy(true);
      await api("/api/admin/sub-admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetPasswordTarget.id,
          password: newPasswordInput,
        }),
      });
      setResetPasswordTarget(null);
      setNewPasswordInput("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(subAdmin: any) {
    if (!confirm(`Are you sure you want to remove staff member "${subAdmin.name}" (${subAdmin.email})?`)) {
      return;
    }
    try {
      setBusy(true);
      await api(`/api/admin/sub-admins?id=${subAdmin.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sub-admin.");
    } finally {
      setBusy(false);
    }
  }

  function applyPreset(preset: "support" | "finance" | "manager" | "all" | "clear", isEdit = false) {
    const allObj: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((p) => {
      allObj[p.key] = true;
    });
    allObj.full_access = true;

    let nextPerms: Record<string, boolean> = {};
    if (preset === "support") {
      nextPerms = { orders: true, tickets: true };
    } else if (preset === "finance") {
      nextPerms = { deposits: true, withdrawals: true };
    } else if (preset === "manager") {
      nextPerms = {
        orders: true,
        tickets: true,
        deposits: true,
        services: true,
        announcements: true,
        users: true,
        analytics: true,
        withdrawals: true,
        coupons: true,
        subscriptions: true,
      };
    } else if (preset === "all") {
      nextPerms = allObj;
    } else {
      nextPerms = {};
    }

    if (isEdit) {
      setEditPermissions(nextPerms);
    } else {
      setNewPermissions(nextPerms);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Action & Metrics */}
      <div className={`${card} p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Staff &amp; Sub-Admins Management</h2>
              <span className="rounded-full bg-[#baff00]/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#cfff62]">
                Super Admin Only
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Invite team members and assign granular permissions so they can manage orders, tickets, deposits, or services without root privileges.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#baff00] px-5 py-3 text-xs font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.2)] transition hover:bg-[#d2ff5a]"
          >
            <span>+ Add New Sub-Admin</span>
          </button>
        </div>

        {/* Quick Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-[#0b1418] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Staff Accounts</p>
            <p className="mt-1 text-2xl font-black text-white">{subAdmins.length}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0b1418] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Active Team Members</p>
            <p className="mt-1 text-2xl font-black text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0b1418] p-3.5 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Suspended Accounts</p>
            <p className="mt-1 text-2xl font-black text-amber-400">{suspendedCount}</p>
          </div>
        </div>
      </div>

      {/* 2. Sub-Admins Table */}
      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left">
            <thead className="bg-[#0b1418] text-[11px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Staff Member</th>
                <th className="px-5 py-4">Granted Permissions</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Added On</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {subAdmins.map((admin) => {
                const perms = admin.permissions || {};
                const activePermsList = ALL_PERMISSIONS.filter((p) => perms[p.key] === true);

                return (
                  <tr key={admin.id} className="hover:bg-white/[.02] transition">
                    {/* User Info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-sm font-black text-purple-400 border border-purple-500/20">
                          {admin.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{admin.name}</p>
                          <p className="font-mono text-[11px] text-slate-400">{admin.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Permissions Badges */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[420px]">
                        {activePermsList.length > 0 ? (
                          activePermsList.map((p) => (
                            <span
                              key={p.key}
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#070d0d] px-2 py-0.5 text-[10px] font-semibold text-slate-200"
                              title={p.desc}
                            >
                              <span>{p.icon}</span>
                              <span>{p.label}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">No permissions assigned</span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge (Static Display) */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                          admin.isActive !== false
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${admin.isActive !== false ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                        <span>{admin.isActive !== false ? "Active" : "Suspended"}</span>
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(admin.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Explicit Suspend / Activate Button */}
                        <button
                          onClick={() => handleToggleStatus(admin, admin.isActive === false)}
                          disabled={busy}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
                            admin.isActive !== false
                              ? "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                          }`}
                        >
                          {admin.isActive !== false ? "Suspend" : "Activate"}
                        </button>
                        <button
                          onClick={() => {
                            setEditPermissionsTarget(admin);
                            setEditPermissions(admin.permissions || {});
                          }}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-white/20 hover:bg-white/10 transition"
                        >
                          Permissions
                        </button>
                        <button
                          onClick={() => {
                            setResetPasswordTarget(admin);
                            setNewPasswordInput("");
                          }}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-white/20 hover:bg-white/10 transition"
                        >
                          Password
                        </button>
                        <button
                          onClick={() => handleDelete(admin)}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {subAdmins.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-sm text-slate-500">
                    No sub-admins added yet. Click &quot;+ Add New Sub-Admin&quot; to invite your first staff member.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Modal: Add New Sub-Admin */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0d171a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header (Sticky) */}
            <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6 pb-4 shrink-0 bg-[#0d171a]">
              <div>
                <h3 className="text-lg font-black text-white">Add New Sub-Admin</h3>
                <p className="text-xs text-slate-400">
                  {addMode === "existing" ? "Promote registered user to staff" : "Create staff credentials and specify authorized areas"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-5 sm:px-6 pt-4 pb-1 shrink-0 bg-[#0d171a]">
              <div className="flex rounded-xl border border-white/10 bg-[#070d0d] p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAddMode("create")}
                  className={`flex-1 rounded-lg py-2 transition cursor-pointer ${
                    addMode === "create" ? "bg-[#baff00] text-[#07100f] font-black shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Create New Staff Account
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("existing")}
                  className={`flex-1 rounded-lg py-2 transition cursor-pointer ${
                    addMode === "existing" ? "bg-[#baff00] text-[#07100f] font-black shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Promote Existing User
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form id="add-subadmin-form" onSubmit={handleCreate} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {addMode === "existing" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Search Registered User (Email or Name)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => searchUsers(e.target.value)}
                        placeholder="Type email or name to find user..."
                        className="w-full rounded-xl border border-white/10 bg-[#070d0d] pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#baff00]"
                      />
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">🔍</span>
                    </div>
                  </div>

                  {searchingUsers && (
                    <p className="text-[11px] text-slate-400">Searching user database...</p>
                  )}

                  {userSearchResults.length > 0 && !selectedExistingUser && (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#070d0d] divide-y divide-white/5">
                      {userSearchResults.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedExistingUser(u);
                            setUserSearchQuery(u.email);
                          }}
                          className="p-2.5 hover:bg-white/5 cursor-pointer flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <p className="font-bold text-white">{u.name}</p>
                            <p className="text-[11px] font-mono text-slate-400">{u.email}</p>
                          </div>
                          <span className="rounded-lg bg-[#baff00]/15 px-2 py-0.5 text-[10px] font-bold text-[#baff00]">
                            Select →
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedExistingUser && (
                    <div className="rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>👤 Selected User:</span>
                          <span className="text-[#baff00]">{selectedExistingUser.name}</span>
                        </p>
                        <p className="text-[11px] font-mono text-slate-300">{selectedExistingUser.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExistingUser(null);
                          setUserSearchQuery("");
                        }}
                        className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      New Password <span className="text-slate-500 font-normal lowercase">(optional - leave blank to keep user&apos;s existing login password)</span>
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to preserve current password"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#baff00]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Bilal Support"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#baff00]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Email Address (Login)
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="staff@vexarosmm.com"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#baff00]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Temporary Password
                    </label>
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#baff00]"
                    />
                  </div>
                </>
              )}

              {/* Permissions Presets */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Assign Permissions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset("all")}
                      className="rounded-lg border border-[#baff00]/30 bg-[#baff00]/15 px-2 py-0.5 text-[10px] font-black text-[#baff00] hover:bg-[#baff00]/25 cursor-pointer"
                    >
                      ⚡ Full Control (All 12)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("support")}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Support
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("finance")}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Finance
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("manager")}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("clear")}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Permissions Grid */}
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {ALL_PERMISSIONS.map((p) => {
                    const checked = Boolean(newPermissions[p.key]);
                    return (
                      <label
                        key={p.key}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition ${
                          checked
                            ? "border-[#baff00]/40 bg-[#baff00]/5"
                            : "border-white/5 bg-[#070d0d] hover:border-white/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setNewPermissions((prev) => ({
                              ...prev,
                              [p.key]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 accent-[#baff00]"
                        />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{p.icon}</span>
                            <span>{p.label}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 leading-3.5 mt-0.5">{p.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <p>New accounts are created with <b>Active status immediately</b>. No additional activation step is required.</p>
              </div>
            </form>

            {/* Pinned Action Footer */}
            <div className="border-t border-white/10 bg-[#091113] p-4 sm:px-6 shrink-0 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-subadmin-form"
                disabled={busy}
                className="rounded-xl bg-[#baff00] px-5 py-2.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer shadow-[0_0_15px_rgba(186,255,0,0.25)]"
              >
                {busy
                  ? "Saving..."
                  : addMode === "existing"
                  ? "Promote to Sub-Admin →"
                  : "Create Sub-Admin →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit Permissions */}
      {editPermissionsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0d171a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6 pb-4 shrink-0 bg-[#0d171a]">
              <div>
                <h3 className="text-lg font-black text-white">Edit Permissions</h3>
                <p className="text-xs text-slate-400">
                  Update access rules for {editPermissionsTarget.name} ({editPermissionsTarget.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditPermissionsTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-2.5 border-b border-white/5 bg-[#0a1215] shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset("all", true)}
                  className="rounded-lg border border-[#baff00]/30 bg-[#baff00]/15 px-2.5 py-1 text-[10px] font-black text-[#baff00] hover:bg-[#baff00]/25 cursor-pointer"
                >
                  ⚡ Full Control (All 12)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("support", true)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Support
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("finance", true)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Finance
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("manager", true)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Manager
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("clear", true)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <form id="edit-perms-form" onSubmit={handleSavePermissions} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {ALL_PERMISSIONS.map((p) => {
                  const checked = Boolean(editPermissions[p.key]);
                  return (
                    <label
                      key={p.key}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition ${
                        checked
                          ? "border-[#baff00]/40 bg-[#baff00]/5"
                          : "border-white/5 bg-[#070d0d] hover:border-white/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            [p.key]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 accent-[#baff00]"
                      />
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 leading-3.5 mt-0.5">{p.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </form>

            <div className="border-t border-white/10 bg-[#091113] p-4 sm:px-6 shrink-0 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditPermissionsTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-perms-form"
                disabled={busy}
                className="rounded-xl bg-[#baff00] px-5 py-2.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer shadow-[0_0_15px_rgba(186,255,0,0.25)]"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Reset Password */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d171a] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Reset Staff Password</h3>
                <p className="text-xs text-slate-400">
                  Set a new password for {resetPasswordTarget.name}
                </p>
              </div>
              <button
                onClick={() => setResetPasswordTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#baff00]"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setResetPasswordTarget(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || newPasswordInput.length < 6}
                  className="rounded-xl bg-[#baff00] px-5 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50"
                >
                  {busy ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AppearanceView() {
  const themes = [
    {
      id: "dark",
      name: "Cyber Dark (Default)",
      desc: "Ultra-modern cosmic dark background with luminous neon green accents and high-contrast readability.",
      main: "#070d0d",
      surface: "#111a1d",
      accent: "#baff00",
      accentText: "#07100f",
    },
    {
      id: "light",
      name: "Clean Light",
      desc: "Crisp modern minimalist light pearl background with pure white cards, dark slate text, and emerald green accents.",
      main: "#f8fafc",
      surface: "#ffffff",
      accent: "#10b981",
      accentText: "#ffffff",
    },
  ];

  const [activeTheme, setActiveTheme] = useState("dark");
  const [platformDefaultTheme, setPlatformDefaultTheme] = useState("dark");
  const [profitMargin, setProfitMargin] = useState("7");
  const [dollarOrderMarkup, setDollarOrderMarkup] = useState("7");
  const [liveForexRate, setLiveForexRate] = useState<number>(278.0);
  const [sadaPayNum, setSadaPayNum] = useState("03197008275");
  const [sadaPayTitle, setSadaPayTitle] = useState("Saeed Bashir");
  const [binanceUid, setBinanceUid] = useState("1069021883");
  const [binanceName, setBinanceName] = useState("Talha Bashir Bhatti");
  const [binanceUsdtAddress, setBinanceUsdtAddress] = useState("0xaa3037450e112ef10406df821803522bc589821c");
  const [binanceNetwork, setBinanceNetwork] = useState("BSC BNB Smart Chain (BEP20)");
  const [depositBonusSetting, setDepositBonusSetting] = useState("tiered");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const current = typeof window !== "undefined" ? (localStorage.getItem("vexo_platform_theme") || document.documentElement.getAttribute("data-theme") || "cyber-lime") : "cyber-lime";
    setActiveTheme(current);

    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.settings) {
          if (d.settings.platform_theme) setPlatformDefaultTheme(d.settings.platform_theme);
          if (d.settings.global_profit_margin) setProfitMargin(d.settings.global_profit_margin);
          if (d.settings.dollar_order_markup) setDollarOrderMarkup(d.settings.dollar_order_markup);
          if (d.settings.sadapay_number) setSadaPayNum(d.settings.sadapay_number);
          if (d.settings.sadapay_title) setSadaPayTitle(d.settings.sadapay_title);
          if (d.settings.binance_uid) setBinanceUid(d.settings.binance_uid);
          if (d.settings.binance_name) setBinanceName(d.settings.binance_name);
          if (d.settings.binance_usdt_address) setBinanceUsdtAddress(d.settings.binance_usdt_address);
          if (d.settings.binance_network) setBinanceNetwork(d.settings.binance_network);
          if (d.settings.deposit_bonus_percentage) setDepositBonusSetting(d.settings.deposit_bonus_percentage);
        }
      })
      .catch((e) => console.error("Failed to load settings:", e));

    fetch("/api/rates")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.rates?.USD) {
          setLiveForexRate(Math.round(Number(d.rates.USD) * 100) / 100);
        }
      })
      .catch(() => {});
  }, []);

  function handlePreview(themeId: string) {
    setActiveTheme(themeId);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", themeId);
      localStorage.setItem("vexo_platform_theme", themeId);
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform_theme: activeTheme,
          global_profit_margin: profitMargin,
          dollar_order_markup: dollarOrderMarkup,
          sadapay_number: sadaPayNum,
          sadapay_title: sadaPayTitle,
          binance_uid: binanceUid,
          binance_name: binanceName,
          binance_usdt_address: binanceUsdtAddress,
          binance_network: binanceNetwork,
          deposit_bonus_percentage: depositBonusSetting,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings");
      }
      setPlatformDefaultTheme(activeTheme);
      setMsg("✓ Theme & Platform Settings saved successfully!");
      setTimeout(() => setMsg(""), 4000);
    } catch (e: any) {
      setErr(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 mb-2">
              <span>🎨 Design System &amp; Appearance Control</span>
            </div>
            <h2 className="text-2xl font-black text-white">Platform Themes &amp; Global Appearance</h2>
            <p className="mt-1 text-xs text-slate-400">
              Select, live-preview, and set the default color theme for all users across the platform without page reload.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#baff00] px-6 py-3 text-xs sm:text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition shadow-[0_4px_20px_rgba(186,255,0,0.3)] cursor-pointer"
          >
            <span>{saving ? "Saving Changes..." : "💾 Save as Platform Default"}</span>
          </button>
        </div>

        {msg && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400">{msg}</div>}
        {err && <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-400">{err}</div>}
      </div>

      {/* Theme Swatch Grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {themes.map((t) => {
          const isCurrentActive = activeTheme === t.id;
          const isPlatformDefault = platformDefaultTheme === t.id;

          return (
            <div
              key={t.id}
              className={`rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                isCurrentActive
                  ? "border-[#baff00] bg-white/[0.04] shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
                  : "border-white/10 bg-[#111a1d] hover:border-white/20"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{t.name}</span>
                  {isPlatformDefault && (
                    <span className="rounded-full bg-[#baff00]/10 border border-[#baff00]/30 px-2 py-0.5 text-[9px] font-black text-[#baff00]">
                      DEFAULT
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[36px]">{t.desc}</p>

                {/* Color Palette Swatches */}
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#070d0d] p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-lg border border-white/20 shadow-inner" style={{ backgroundColor: t.main }} title="Main BG" />
                    <span className="text-[10px] font-mono text-slate-400">BG</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-lg border border-white/20 shadow-inner" style={{ backgroundColor: t.surface }} title="Surface" />
                    <span className="text-[10px] font-mono text-slate-400">Card</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="h-5 w-5 rounded-lg border border-white/20 shadow-inner" style={{ backgroundColor: t.accent }} title="Accent" />
                    <span className="text-[10px] font-mono text-slate-400">Accent</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handlePreview(t.id)}
                  className={`w-full rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isCurrentActive
                      ? "bg-white/15 text-white cursor-default"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {isCurrentActive ? "✓ Currently Active (Previewing)" : "⚡ Preview Theme"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Profit Margin, Dollar Price & Payment Settings */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6">
          <h3 className="text-base font-black text-white">Global Profit Margin</h3>
          <p className="mt-1 text-xs text-slate-400">
            Set the platform markup percentage applied over upstream provider rates.
          </p>

          <div className="mt-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Profit Margin (%)
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={profitMargin}
                onChange={(e) => setProfitMargin(e.target.value)}
                className="w-28 rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-sm font-black text-white focus:border-[#baff00] outline-none"
              />
              <span className="text-xs text-slate-400">
                Markup: <strong className="text-[#baff00]">+{profitMargin}%</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-white">Dollar Exchange Rate ($ to PKR)</h3>
              <p className="mt-1 text-xs text-slate-400">
                Base dollar rate is continuously auto-checked from live global forex feeds (no manual fixed rate).
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>1 USD = ~₨{liveForexRate} PKR (Live Auto)</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Dollar Markup on Orders (%)
            </label>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Applied strictly to service pricing &amp; orders. Adding funds / deposits uses 0% pure live market rate so users are never penalized.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={dollarOrderMarkup}
                onChange={(e) => setDollarOrderMarkup(e.target.value)}
                className="w-28 rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-sm font-black text-white focus:border-[#baff00] outline-none"
              />
              <span className="text-xs text-slate-400">
                Order Markup: <strong className="text-[#baff00]">+{dollarOrderMarkup}%</strong>
                {" · "}Effective Order Rate: <strong className="text-white">₨{(liveForexRate * (1 + (Number(dollarOrderMarkup) || 0) / 100)).toFixed(2)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6">
          <h3 className="text-base font-black text-white">Official SadaPay Receiving Account</h3>
          <p className="mt-1 text-xs text-slate-400">
            Official account displayed to customers on the manual deposit / Add Funds page.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Account Number
              </label>
              <input
                type="text"
                value={sadaPayNum}
                onChange={(e) => setSadaPayNum(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs font-mono font-bold text-white focus:border-[#baff00] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Account Title
              </label>
              <input
                type="text"
                value={sadaPayTitle}
                onChange={(e) => setSadaPayTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#baff00] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0B90B]/30 bg-[#111a1d] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0B90B]/15 text-lg font-black text-[#F0B90B] ring-1 ring-[#F0B90B]/30">
                🟡
              </div>
              <div>
                <span className="rounded-full bg-[#F0B90B]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#F0B90B]">
                  Global Crypto Receiver
                </span>
                <h3 className="text-base font-black text-white">Official Binance &amp; Crypto Receiving Account</h3>
              </div>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              0% Fee • Spot Wallet
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Account details and deposit addresses displayed to global customers on the Add Funds page.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Binance UID / Pay ID
              </label>
              <input
                type="text"
                value={binanceUid}
                onChange={(e) => setBinanceUid(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs font-mono font-bold text-white focus:border-[#F0B90B] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Beneficiary Name / Account Title
              </label>
              <input
                type="text"
                value={binanceName}
                onChange={(e) => setBinanceName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#F0B90B] outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                USDT Deposit Address
              </label>
              <input
                type="text"
                value={binanceUsdtAddress}
                onChange={(e) => setBinanceUsdtAddress(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs font-mono text-white focus:border-[#F0B90B] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Deposit Network
              </label>
              <input
                type="text"
                value={binanceNetwork}
                onChange={(e) => setBinanceNetwork(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#F0B90B] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Deposit Approval Bonus Settings Card */}
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#baff00]/15 text-xl">🎁</span>
              <div>
                <h3 className="text-base font-black text-white">Deposit Approval Bonus (5% – 10%)</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Automatically allocate promotional bonus credit to users when their manual deposit is approved.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#baff00]/30 bg-[#baff00]/10 px-3 py-1 text-xs font-bold text-[#baff00]">
              Active Policy: {depositBonusSetting === "tiered" ? "Tiered 5% – 10%" : `${depositBonusSetting}% Flat`}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Default Approval Bonus Mode
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                {
                  id: "tiered",
                  title: "Tiered (Recommended)",
                  rate: "5% (₨500–₨5k) / 10% (≥₨5k)",
                  desc: "5% bonus from ₨500 to ₨4,999; 10% bonus for ₨5,000+ (min ₨500)",
                },
                {
                  id: "5",
                  title: "Flat 5% Bonus",
                  rate: "5% on all deposits",
                  desc: "Fixed 5% promotional credit on all approved amounts",
                },
                {
                  id: "7",
                  title: "Flat 7% Bonus",
                  rate: "7% on all deposits",
                  desc: "Fixed 7% promotional credit on all approved amounts",
                },
                {
                  id: "10",
                  title: "Flat 10% Bonus",
                  rate: "10% on all deposits",
                  desc: "Maximum 10% promotional credit on all approved amounts",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDepositBonusSetting(opt.id)}
                  className={`rounded-xl border p-3.5 text-left transition cursor-pointer ${
                    depositBonusSetting === opt.id
                      ? "border-[#baff00] bg-[#baff00]/15 text-white shadow-sm ring-1 ring-[#baff00]/30"
                      : "border-white/10 bg-[#070d0d] text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{opt.title}</span>
                    {depositBonusSetting === opt.id && <span className="text-xs font-bold text-[#baff00]">✓</span>}
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#baff00]">{opt.rate}</p>
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 pt-1">
              💡 When approving an individual customer deposit in the Deposits tab, administrators can also customize or fine-tune the bonus percentage before confirming.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsAdmin({
  api,
  busy,
  setBusy,
  setError,
}: {
  api: (url: string, init?: RequestInit) => Promise<any>;
  busy: boolean;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiUrlInput, setApiUrlInput] = useState("https://shop.elevatexbyzaid.com/api/v1");
  const [markupInput, setMarkupInput] = useState<number>(7);
  const [showApiKey, setShowApiKey] = useState(false);
  const [resendKeyInput, setResendKeyInput] = useState("");
  const [senderEmailInput, setSenderEmailInput] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState<boolean>(false);
  const [maintenanceMode, setMaintenanceMode] = useState<"auto" | "force_on" | "force_off">("auto");
  const [upstreamBotStatus, setUpstreamBotStatus] = useState<string>("online");
  const [maintenanceMessageInput, setMaintenanceMessageInput] = useState<string>("We are maintaining our services, please come back later.");
  const [togglingMaintenance, setTogglingMaintenance] = useState<boolean>(false);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/admin/partner-bot");
      setData(res);
      if (res.config) {
        setApiKeyInput(res.config.apiKey || "");
        if (res.config.apiUrl) setApiUrlInput(res.config.apiUrl);
        if (typeof res.config.markupPercent === "number") setMarkupInput(res.config.markupPercent);
        if (res.config.resendApiKey) setResendKeyInput(res.config.resendApiKey);
        if (res.config.senderEmail) setSenderEmailInput(res.config.senderEmail);
      }
      if (res.maintenance) {
        setMaintenanceActive(Boolean(res.maintenance.isMaintenance));
        if (res.maintenance.mode) {
          setMaintenanceMode(res.maintenance.mode);
        }
        if (res.maintenance.upstreamStatus) {
          setUpstreamBotStatus(res.maintenance.upstreamStatus);
        }
        if (res.maintenance.message) {
          setMaintenanceMessageInput(res.maintenance.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load partner bot details");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetMaintenanceMode(mode: "auto" | "force_on" | "force_off") {
    try {
      setTogglingMaintenance(true);
      const res = await api("/api/admin/partner-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_maintenance",
          mode,
          message: maintenanceMessageInput.trim() || "We are maintaining our services, please come back later.",
        }),
      });
      if (res.success) {
        setMaintenanceMode(mode);
        if (res.maintenance) {
          setMaintenanceActive(Boolean(res.maintenance.isMaintenance));
        }
        await loadData();
        alert(res.message || "Maintenance configuration updated successfully!");
      } else {
        alert(res.error || "Failed to update maintenance mode");
      }
    } catch (e: any) {
      alert(e.message || "Failed to update maintenance mode");
    } finally {
      setTogglingMaintenance(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleTestConnection() {
    try {
      setTestLoading(true);
      setTestResult(null);
      const res = await api("/api/admin/partner-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_connection",
          apiKey: apiKeyInput.trim(),
        }),
      });
      setTestResult({
        ok: res.success,
        message: res.message || (res.success ? "Connection successful!" : "Connection failed"),
      });
    } catch (e) {
      setTestResult({
        ok: false,
        message: e instanceof Error ? e.message : "Connection test failed",
      });
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSaveConfig() {
    try {
      setSaveLoading(true);
      setSaveSuccess(false);
      const res = await api("/api/admin/partner-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          apiKey: apiKeyInput.trim(),
          apiUrl: apiUrlInput.trim(),
          markupPercent: Number(markupInput) || 7,
          resendApiKey: resendKeyInput.trim(),
          senderEmail: senderEmailInput.trim(),
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      await loadData();
      alert(res.message || "Partner bot settings saved successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save configuration");
    } finally {
      setSaveLoading(false);
    }
  }

  const isHealthy = data?.health?.ok === true;
  const [syncStockLoading, setSyncStockLoading] = useState(false);
  const [syncStockMessage, setSyncStockMessage] = useState<string | null>(null);

  async function handleSyncStock() {
    try {
      setSyncStockLoading(true);
      setSyncStockMessage(null);
      const res = await api("/api/admin/partner-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_stock" }),
      });
      if (res.success) {
        setSyncStockMessage(res.message);
        setTimeout(() => setSyncStockMessage(null), 4000);
        await loadData();
      } else {
        alert(res.error || "Stock sync failed");
      }
    } catch (e: any) {
      alert(e.message || "Failed to sync stock");
    } finally {
      setSyncStockLoading(false);
    }
  }
  const rawBalance = data?.balance?.balance;
  const balanceUsd = typeof rawBalance === "number" ? rawBalance : 0;
  const isFunded = balanceUsd > 0.05;

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Overview */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-[#0d171a] via-[#122226] to-[#0d171a] p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-3 py-1 text-xs font-bold text-[#00D4FF]">
              ⚡ ELEVATEX RESELLER GATEWAY
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300 font-mono">
              Reseller: {data?.balance?.label || "Talha Bashir"} • ID: {data?.balance?.user_id || "8672881616"}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isHealthy ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}>
              <span className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              {isHealthy ? "GATEWAY ONLINE" : "OFFLINE"}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            ElevateX Subscriptions &amp; Digital Products Automation
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
            Instant automated wholesale orders &amp; live automated delivery for AI tools, streaming, subscriptions, and software via the ElevateX Reseller Gateway.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh Status"}
          </button>
          <a
            href="/dashboard/subscriptions"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-[#baff00] px-4 py-2.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition flex items-center gap-1"
          >
            <span>Customer Store View</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      {/* Elevate Bot Maintenance Mode Control Card */}
      <div className={`rounded-3xl border p-6 transition-all ${
        maintenanceActive
          ? "border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-[#1a140b] to-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
          : "border-white/10 bg-[#0d171a]"
      }`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl border ${
              maintenanceActive
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-white/5 text-slate-400 border-white/10"
            }`}>
              {maintenanceActive ? "⚠️" : "⚡"}
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  Elevate Bot Maintenance Mode
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  maintenanceActive
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}>
                  {maintenanceActive ? "● MAINTENANCE ACTIVE" : "● OPERATIONAL (ONLINE)"}
                </span>
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-mono text-slate-300 border border-white/10">
                  Mode: <strong className={maintenanceMode === "auto" ? "text-[#00D4FF]" : "text-amber-400"}>
                    {maintenanceMode === "auto" ? "AUTO-DETECT" : maintenanceMode === "force_on" ? "FORCED ON" : "FORCED OFF"}
                  </strong>
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                When active, customer purchasing is safely locked while keeping <strong>all 40+ services and tools visible</strong> with an &quot;Under Maintenance&quot; notice. In <strong>Auto-Detect</strong> mode, your store automatically enters maintenance whenever the upstream Telegram bot undergoes maintenance, and automatically goes live when the bot finishes.
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400">Upstream Bot Status:</span>
                <span className={`font-bold flex items-center gap-1.5 ${
                  upstreamBotStatus === "online" || upstreamBotStatus === "ok" ? "text-emerald-400" : "text-amber-400"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${upstreamBotStatus === "online" || upstreamBotStatus === "ok" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  <span>@exzshop_bot ({upstreamBotStatus.toUpperCase()})</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={togglingMaintenance}
              onClick={() => handleSetMaintenanceMode("auto")}
              className={`rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border ${
                maintenanceMode === "auto"
                  ? "bg-[#00D4FF] text-[#07100f] border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                  : "bg-white/5 text-slate-300 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              <span>⚡</span>
              <span>Auto-Detect (Recommended)</span>
            </button>
            <button
              type="button"
              disabled={togglingMaintenance}
              onClick={() => handleSetMaintenanceMode("force_on")}
              className={`rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border ${
                maintenanceMode === "force_on"
                  ? "bg-amber-500 text-[#07100f] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  : "bg-white/5 text-slate-300 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              <span>⚠️</span>
              <span>Force ON</span>
            </button>
            <button
              type="button"
              disabled={togglingMaintenance}
              onClick={() => handleSetMaintenanceMode("force_off")}
              className={`rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border ${
                maintenanceMode === "force_off"
                  ? "bg-emerald-400 text-[#07100f] border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                  : "bg-white/5 text-slate-300 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              <span>🟢</span>
              <span>Force Live</span>
            </button>
          </div>
        </div>

        {/* Custom Notice Message Field */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
            Public Notice Message:
          </label>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={maintenanceMessageInput}
              onChange={(e) => setMaintenanceMessageInput(e.target.value)}
              placeholder="We are maintaining our services, please come back later."
              className="flex-1 rounded-xl border border-white/10 bg-[#070e10] px-3.5 py-2 text-xs text-white outline-none focus:border-amber-400 placeholder-slate-600"
            />
            <button
              type="button"
              disabled={togglingMaintenance}
              onClick={() => handleSetMaintenanceMode(maintenanceMode)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              Save Message
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: API Status */}
        <div className={card + " p-5 space-y-2"}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gateway Status</span>
            <span className="text-lg">⚡</span>
          </div>
          <p className="text-2xl font-black text-white">
            {isHealthy ? "Operational" : "Offline"}
          </p>
          <p className="text-xs text-slate-500 font-mono truncate">
            {data?.config?.apiUrl || "shop.elevatexbyzaid.com/api/v1"}
          </p>
        </div>

        {/* Card 2: Live Bot Balance */}
        <div className={card + " p-5 space-y-2"}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reseller Wallet Balance</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isFunded ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
            }`}>
              {isFunded ? "FUNDED" : "TOPUP REQUIRED"}
            </span>
          </div>
          <p className="text-2xl font-black text-[#00D4FF]">
            ${balanceUsd.toFixed(2)} <span className="text-xs font-normal text-slate-400">USDT</span>
          </p>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>≈ ₨{Number(data?.balance?.balance_pkr || 0).toLocaleString()} PKR</span>
            <a
              href="https://t.me/exzshop_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4FF] hover:underline font-semibold"
            >
              Topup @exzshop_bot ↗
            </a>
          </div>
        </div>

        {/* Card 3: Active Products & Real Stock */}
        <div className={card + " p-5 space-y-2"}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Products &amp; Stock</span>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-2xl font-black text-white">
            {data?.productsCount || 0}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-emerald-400">
              ✓ {data?.inStockCount ?? 0} In Stock
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-semibold text-amber-400">
              {data?.outOfStockCount ?? 0} Sold Out
            </span>
          </div>
        </div>

        {/* Card 4: Orders & Delivery */}
        <div className={card + " p-5 space-y-2"}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bot Orders Dispatched</span>
            <span className="text-lg">🚀</span>
          </div>
          <p className="text-2xl font-black text-white">
            {data?.usage?.totalOrders || data?.recentOrders?.length || 0}
          </p>
          <p className="text-xs text-slate-400">
            Spent: ${Number(data?.usage?.totalSpent || 0).toFixed(2)} USD
          </p>
        </div>
      </div>

      {/* 3. API Key & Profit Margin Configuration Card */}
      <section className={card + " p-6 space-y-5"}>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-black text-white">ElevateX Reseller Credentials &amp; Margin Rules</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Securely authenticate with <code className="text-[#00D4FF] font-mono">https://shop.elevatexbyzaid.com/api/v1</code>. Saved directly to database settings.
            </p>
          </div>
          {saveSuccess && (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              ✓ Saved successfully!
            </span>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                ElevateX Reseller API Key
              </label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-[11px] text-[#00D4FF] hover:underline"
              >
                {showApiKey ? "Hide Key" : "Show Key"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="elx_live_..."
                className="w-full rounded-xl border border-white/10 bg-[#070e10] px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-[#00D4FF] placeholder-slate-600"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Account: Talha Bashir (ID: 8672881616)</span>
              <a
                href="https://shop.elevatexbyzaid.com/api/v1/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00D4FF] hover:underline"
              >
                View API Docs ↗
              </a>
            </div>
          </div>

          {/* API Endpoint URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              API Base URL
            </label>
            <input
              type="text"
              value={apiUrlInput}
              onChange={(e) => setApiUrlInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#070e10] px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-[#00D4FF]"
            />
            <p className="text-[11px] text-slate-500">
              Standard endpoint: <code className="text-slate-400">https://shop.elevatexbyzaid.com/api/v1</code>
            </p>
          </div>

          {/* Profit Markup Percentage */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Reseller Profit Markup (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={markupInput}
                onChange={(e) => setMarkupInput(Number(e.target.value))}
                className="w-28 rounded-xl border border-white/10 bg-[#070e10] px-3.5 py-2.5 text-sm font-black text-[#baff00] outline-none focus:border-[#baff00]"
              />
              <span className="text-xs text-slate-300">
                Recommended: <strong className="text-[#baff00]">5% to 10%</strong> markup over wholesale bot price
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Formula: Wholesale Unit USD × (1 + {markupInput}%) × Forex Rate = Retail Price
            </p>
          </div>

          {/* Live Pricing Preview Math */}
          <div className="rounded-xl border border-white/5 bg-[#081013] p-4 text-xs space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pricing Engine Example
            </span>
            <div className="flex justify-between text-slate-300">
              <span>Wholesale Bot Cost:</span>
              <span className="font-mono text-white">$10.00 USD</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Your Profit Margin (+{markupInput}%):</span>
              <span className="font-mono text-[#baff00]">+$[{(10 * (markupInput / 100)).toFixed(2)}] USD</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1 font-bold text-white">
              <span>Customer Retail Price:</span>
              <span className="font-mono text-[#baff00]">
                ${(10 * (1 + markupInput / 100)).toFixed(2)} USD (≈ ₨{Math.round(10 * (1 + markupInput / 100) * 278).toLocaleString()} PKR)
              </span>
            </div>
          </div>
        </div>

        {/* Automated Customer Email Delivery Settings (Resend API) */}
        <div className="rounded-2xl border border-white/10 bg-[#070e10] p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base">✉️</span>
            <h4 className="text-sm font-black text-white">Automated Customer Email Delivery (Resend API)</h4>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
              Email-Only Dispatch Active
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            When a customer purchases a subscription or tool, license credentials and setup guides are dispatched directly to their email inbox via the Resend API, displayed on-screen, and recorded in their dashboard.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Resend Email API Key */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Resend Email API Key
              </label>
              <input
                type="password"
                value={resendKeyInput}
                onChange={(e) => setResendKeyInput(e.target.value)}
                placeholder="re_..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 font-mono text-xs text-white outline-none focus:border-[#00D4FF]"
              />
              <p className="text-[10px] text-slate-500">
                Free 3,000 emails/mo from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] hover:underline">resend.com ↗</a>
              </p>
            </div>

            {/* Sender Email Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Sender Email Address
              </label>
              <input
                type="text"
                value={senderEmailInput}
                onChange={(e) => setSenderEmailInput(e.target.value)}
                placeholder="Vexaro Subscriptions <onboarding@resend.dev>"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 font-mono text-xs text-white outline-none focus:border-[#00D4FF]"
              />
              <p className="text-[10px] text-slate-500">
                Default: onboarding@resend.dev (or verified domain address)
              </p>
            </div>
          </div>
        </div>

        {/* Global External API Services & Killswitches */}
        <AdminApiTogglesCard />

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testLoading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition disabled:opacity-50 flex items-center gap-2"
            >
              {testLoading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Testing...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Test Gateway Connection
                </>
              )}
            </button>

            {testResult && (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                testResult.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}>
                {testResult.message}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saveLoading}
            className="rounded-xl bg-[#00D4FF] px-6 py-2.5 text-xs font-black text-[#0B1F3A] hover:bg-[#38bdf8] transition disabled:opacity-50 shadow-[0_4px_14px_rgba(0,212,255,0.25)]"
          >
            {saveLoading ? "Saving..." : "Save Gateway Configuration"}
          </button>
        </div>
      </section>

      {/* 4. Live Bot Catalog Table */}
      {Array.isArray(data?.sampleProducts) && data.sampleProducts.length > 0 && (
        <section className={card + " overflow-hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <h3 className="text-base font-black text-white">Live Products Synced from ElevateX Gateway</h3>
              <p className="text-xs text-slate-400">
                {data.sampleProducts.length} automated products • {data?.inStockCount ?? 0} ready in stock • {data?.outOfStockCount ?? 0} awaiting supplier restock.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {syncStockMessage && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {syncStockMessage}
                </span>
              )}
              <button
                type="button"
                onClick={handleSyncStock}
                disabled={syncStockLoading}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className={syncStockLoading ? "animate-spin text-[#baff00]" : "text-emerald-400"}>↻</span>
                <span>{syncStockLoading ? "Syncing..." : "Sync Live Stock Now"}</span>
              </button>
              <span className="rounded-full bg-[#baff00]/10 px-3 py-1 text-xs font-black text-[#baff00]">
                LIVE INVENTORY
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-[#0b1418] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Provider</th>
                  <th className="px-5 py-3.5">Delivery Type</th>
                  <th className="px-5 py-3.5">Wholesale (USD)</th>
                  <th className="px-5 py-3.5">Retail (+{markupInput}%)</th>
                  <th className="px-5 py-3.5">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {data.sampleProducts.map((p: any) => {
                  const wholesale = Number(p.yourPrice ?? p.basePrice ?? 0);
                  const retailUsd = wholesale * (1 + markupInput / 100);
                  const retailPkr = Math.round(retailUsd * 278);

                  return (
                    <tr key={p.id || p.slug} className="hover:bg-white/[.02]">
                      <td className="px-5 py-3.5">
                        <strong className="text-white block">{p.name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">{p.slug}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {p.provider?.name || p.providerKey || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {p.deliveryType === "LINK" ? (
                          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                            🔗 Activation Link
                          </span>
                        ) : p.deliveryType === "COUPON" ? (
                          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            🎟️ Coupon Code
                          </span>
                        ) : p.deliveryType === "READY_ACCOUNT" ? (
                          <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                            👤 Ready Account
                          </span>
                        ) : (
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            {p.deliveryType || "Standard"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-300">
                        ${wholesale.toFixed(2)} USD
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <strong className="text-[#baff00]">₨{retailPkr.toLocaleString()}</strong>
                        <span className="text-[10px] text-slate-400 ml-1.5">(${retailUsd.toFixed(2)})</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.inStock === false || (p.stockCount !== undefined && p.stockCount <= 0) ? (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                            0 in stock (Sold Out)
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            ✓ {p.stockCount !== undefined ? `${p.stockCount} in stock` : "In Stock"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. Customer Subscription Orders */}
      <section className={card + " overflow-hidden"}>
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <h3 className="text-base font-black text-white">Customer Subscriptions &amp; Delivered Credentials</h3>
            <p className="text-xs text-slate-400">
              Audit delivered activation links, gift coupons, and accounts dispatched to users.
            </p>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
            {data?.recentOrders?.length || 0} ORDERS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#0b1418] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Tool / Service</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Paid</th>
                <th className="px-5 py-3.5">Delivery Type</th>
                <th className="px-5 py-3.5">Delivered License / Link</th>
                <th className="px-5 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {Array.isArray(data?.recentOrders) && data.recentOrders.length > 0 ? (
                data.recentOrders.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-white/[.02]">
                    <td className="px-5 py-3.5">
                      <strong className="text-white block">{sub.user_email || "User #" + sub.user_id}</strong>
                      {sub.delivery_contact?.includes("@") ? (
                        <a
                          href={`mailto:${sub.delivery_contact}`}
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                          title="Send Email"
                        >
                          <span>✉️</span>
                          <span className="truncate max-w-[140px]">{sub.delivery_contact}</span>
                        </a>
                      ) : (
                        <a
                          href={`https://wa.me/${String(sub.delivery_contact || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hello! Here are your credentials for ${sub.tool_name}:\n\n${sub.license_or_access}\n\nInstructions: ${sub.instructions || "Active in your Vexaro dashboard"}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 mt-0.5 font-bold"
                          title="Open WhatsApp Chat"
                        >
                          <span>📱</span>
                          <span className="truncate max-w-[140px]">WhatsApp: {sub.delivery_contact} ↗</span>
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-white font-bold">
                      {sub.tool_name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {sub.plan_duration}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[#baff00] font-black">
                      ₨{Number(sub.price_pkr || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {sub.delivery_type || "Standard"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[260px]">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                        <span className="truncate select-all bg-black/40 px-2 py-1 rounded">
                          {sub.license_or_access}
                        </span>
                        {sub.delivery_type === "LINK" || sub.license_or_access?.startsWith("http") ? (
                          <a
                            href={sub.license_or_access}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline shrink-0"
                          >
                            Open ↗
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    No customer subscriptions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CouponsAdmin({
  api,
  setError,
  money,
}: {
  api: (url: string, init?: RequestInit) => Promise<any>;
  setError: (msg: string) => void;
  money: (n: number) => string;
}) {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    totalRedemptions: 0,
    totalPrizeAwardedPkr: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New coupon form state
  const [code, setCode] = useState("");
  const [prizePkr, setPrizePkr] = useState("50");
  const [rewardType, setRewardType] = useState<"bonus" | "real">("bonus");
  const [maxUses, setMaxUses] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [isWelcomeOnly, setIsWelcomeOnly] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api("/api/admin/coupons");
      setCoupons(res.coupons || []);
      setRedemptions(res.recentRedemptions || []);
      if (res.stats) setStats(res.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let random = "";
    for (let i = 0; i < 6; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(`VX${random}`);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      alert("Please enter a coupon code.");
      return;
    }
    const prize = Number(prizePkr);
    if (!Number.isFinite(prize) || prize <= 0) {
      alert("Please enter a valid positive prize amount in PKR.");
      return;
    }

    setSubmitting(true);
    try {
      await api("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          prizePkr: prize,
          rewardType,
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          perUserLimit: Number(perUserLimit) || 1,
          isWelcomeOnly,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          description: description.trim() || undefined,
        }),
      });

      alert(`✓ Coupon "${code.trim().toUpperCase()}" created successfully with prize ₨${prize.toLocaleString()}!`);
      setShowCreateModal(false);
      setCode("");
      setPrizePkr("50");
      setMaxUses("");
      setIsWelcomeOnly(false);
      setDescription("");
      setExpiresAt("");
      await loadData();
    } catch (e) {
      alert("❌ " + (e instanceof Error ? e.message : "Failed to create coupon."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: any) => {
    try {
      const nextActive = !coupon.is_active;
      await api("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: coupon.id,
          isActive: nextActive,
        }),
      });
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: nextActive } : c))
      );
    } catch (e) {
      alert("❌ " + (e instanceof Error ? e.message : "Failed to update coupon status."));
    }
  };

  const handleDelete = async (coupon: any) => {
    if (!confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) return;
    try {
      await api(`/api/admin/coupons?id=${encodeURIComponent(coupon.id)}`, {
        method: "DELETE",
      });
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      alert(`✓ Coupon "${coupon.code}" deleted.`);
    } catch (e) {
      alert("❌ " + (e instanceof Error ? e.message : "Failed to delete coupon."));
    }
  };

  const copyCode = (codeText: string) => {
    try {
      navigator.clipboard.writeText(codeText);
      setCopiedCode(codeText);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase().trim()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>🎟️</span> Promotional Coupon &amp; Bonus Manager
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create coupons with customizable prize amounts in PKR, set usage limits, and reward new or existing users.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!code) generateRandomCode();
            setShowCreateModal(true);
          }}
          className="rounded-xl bg-[#baff00] px-5 py-2.5 text-sm font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.25)] hover:bg-[#d2ff5a] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center gap-2"
        >
          <span>＋</span> Add New Coupon &amp; Prize
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Coupons</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-white">{stats.totalCoupons}</p>
          <span className="text-[10px] text-slate-500">Configured campaigns</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Coupons</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-[#baff00]">{stats.activeCoupons}</p>
          <span className="text-[10px] text-emerald-400">Ready to redeem</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Redemptions</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-white">{stats.totalRedemptions}</p>
          <span className="text-[10px] text-cyan-400">Total times used</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Prize Awarded</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-[#baff00]">
            {money(stats.totalPrizeAwardedPkr)}
          </p>
          <span className="text-[10px] text-slate-500">Total PKR credited</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupons by code or note..."
            className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-[#baff00]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={loadData}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Coupons Table Card */}
      <section className="rounded-2xl border border-white/10 bg-[#111a1d] overflow-hidden">
        <div className="border-b border-white/10 bg-[#0b1418] px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-black text-white">All Promotional Coupons</h3>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
            {filteredCoupons.length} COUPONS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-[#0b1418]/60 text-xs uppercase text-slate-500 border-b border-white/5">
              <tr>
                <th className="px-5 py-3.5">Coupon Code</th>
                <th className="px-5 py-3.5">Prize Amount</th>
                <th className="px-5 py-3.5">Reward Type</th>
                <th className="px-5 py-3.5">Usage / Limits</th>
                <th className="px-5 py-3.5">Expiry Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    Loading promotional coupons...
                  </td>
                </tr>
              ) : filteredCoupons.length > 0 ? (
                filteredCoupons.map((c) => {
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                  const isExhausted = c.max_uses !== null && c.used_count >= c.max_uses;

                  return (
                    <tr key={c.id} className="hover:bg-white/[.02] transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-sm font-black text-white tracking-wider">
                            {c.code}
                          </strong>
                          <button
                            type="button"
                            onClick={() => copyCode(c.code)}
                            title="Copy Code"
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-[#baff00] hover:text-[#07100f] hover:border-[#baff00] transition cursor-pointer"
                          >
                            {copiedCode === c.code ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                        {c.description && (
                          <p className="mt-0.5 text-[11px] text-slate-400">{c.description}</p>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono text-sm font-black text-[#baff00]">
                          ₨{Number(c.prize_pkr).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">PKR</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          {c.reward_type === "real" ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              💵 Real Cash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#baff00]/30 bg-[#baff00]/10 px-2 py-0.5 text-[10px] font-bold text-[#cfff62]">
                              🎁 Bonus Credit
                            </span>
                          )}
                          {c.is_welcome_only && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300">
                              🌟 New Users Only
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            {c.used_count} / {c.max_uses !== null ? c.max_uses : "∞"}
                          </span>
                          {isExhausted && (
                            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
                              Limit Reached
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Limit {c.per_user_limit || 1} per user
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {c.expires_at ? (
                          <div>
                            <span className={isExpired ? "text-red-400 font-bold" : "text-slate-300"}>
                              {new Date(c.expires_at).toLocaleDateString()}
                            </span>
                            {isExpired && (
                              <span className="block text-[9px] text-red-400 uppercase font-black">Expired</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">Never expires</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase transition cursor-pointer border ${
                            c.is_active && !isExpired && !isExhausted
                              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                              : "border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                          }`}
                        >
                          {c.is_active && !isExpired && !isExhausted ? "● Active" : "○ Inactive"}
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            title={c.is_active ? "Deactivate" : "Activate"}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
                          >
                            {c.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            title="Delete Coupon"
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/20 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    No coupons found. Click &quot;Add New Coupon &amp; Prize&quot; above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Redemptions History */}
      <section className="rounded-2xl border border-white/10 bg-[#111a1d] overflow-hidden">
        <div className="border-b border-white/10 bg-[#0b1418] px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white">Recent Coupon Redemptions</h3>
            <p className="text-[11px] text-slate-400">Audit log of users who claimed coupon prizes</p>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
            {redemptions.length} CLAIMS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-[#0b1418]/60 text-xs uppercase text-slate-500 border-b border-white/5">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Coupon Code</th>
                <th className="px-5 py-3">Prize Credited</th>
                <th className="px-5 py-3">Reward Type</th>
                <th className="px-5 py-3">Redeemed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {redemptions.length > 0 ? (
                redemptions.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[.02]">
                    <td className="px-5 py-3">
                      <strong className="text-white block">{r.user_name || "User #" + r.user_id}</strong>
                      <span className="text-[10px] text-slate-400">{r.user_email}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">
                        {r.coupon_code}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-black text-[#baff00]">
                      ₨{Number(r.prize_pkr).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] uppercase font-bold text-slate-300">
                        {r.reward_type === "real" ? "Real Balance" : "Bonus Credit"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No coupon redemptions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#111a1d] p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🎟️</span> Create New Promotional Coupon
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set the coupon code and its reward prize in PKR.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="mt-5 space-y-4">
              {/* Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Coupon Code
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[11px] font-bold text-[#baff00] hover:underline"
                  >
                    🎲 Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  placeholder="e.g. WELCOME100, BONUS50, EID2026"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-2.5 font-mono text-sm font-black tracking-wider text-white placeholder-slate-600 outline-none focus:border-[#baff00]"
                />
              </div>

              {/* Prize Amount & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Prize Amount (₨ PKR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={prizePkr}
                    onChange={(e) => setPrizePkr(e.target.value)}
                    required
                    placeholder="50"
                    className="w-full rounded-xl border border-[#baff00]/30 bg-[#0b1316] px-4 py-2.5 text-sm font-black text-[#baff00] outline-none focus:border-[#baff00]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Reward Credit Type
                  </label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as "bonus" | "real")}
                    className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-[#baff00]"
                  >
                    <option value="bonus">🎁 Bonus Credit (For Orders)</option>
                    <option value="real">💵 Real Balance (Deposited Cash)</option>
                  </select>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Max Total Redemptions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited if blank"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#baff00]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Per User Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={perUserLimit}
                    onChange={(e) => setPerUserLimit(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-2.5 text-xs text-white outline-none focus:border-[#baff00]"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Expiry Date <span className="text-slate-500 lowercase">(optional)</span>
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-2.5 text-xs text-white outline-none focus:border-[#baff00]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Campaign Note / Description <span className="text-slate-500 lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. YouTube influencer giveaway, Telegram community promotion"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#baff00]"
                />
              </div>

              {/* Welcome Bonus Flag */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWelcomeOnly}
                    onChange={(e) => setIsWelcomeOnly(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#0b1316] text-[#baff00] focus:ring-[#baff00]"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      🌟 New Users Only (Welcome Bonus Coupon)
                    </span>
                    <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                      If checked, users who already claimed a signup bonus will be strictly blocked from redeeming this coupon code.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#baff00] px-5 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition"
                >
                  {submitting ? "Creating..." : "Save & Activate Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
