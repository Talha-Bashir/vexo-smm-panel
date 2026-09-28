"use client";

import { useEffect, useState, useMemo } from "react";

type Tab =
  | "Dashboard"
  | "Users"
  | "Deposits"
  | "Orders"
  | "Services"
  | "Subscriptions"
  | "Withdrawals"
  | "Tickets"
  | "Announcements"
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
  "Withdrawals",
  "Tickets",
  "Announcements",
  "Appearance",
  "Activity",
  "Sub-Admins",
];

const card = "rounded-2xl border border-white/10 bg-[#111a1d]";

function money(n: number) {
  return `₨${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
    const list: Tab[] = [];
    if (p.analytics) list.push("Dashboard");
    if (p.users) list.push("Users");
    if (p.deposits) list.push("Deposits");
    if (p.orders) list.push("Orders");
    if (p.services) {
      list.push("Services");
      list.push("Subscriptions");
    }
    if (p.withdrawals) list.push("Withdrawals");
    if (p.tickets) list.push("Tickets");
    if (p.announcements) list.push("Announcements");
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

  async function updateDeposit(depositId: string, action: "approve" | "reject") {
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
        body: JSON.stringify({ depositId, action, rejectionReason }),
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

  async function saveService(s: any) {
    try {
      setBusy(true);
      const res = await api("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: String(s.service || s.id),
          enabled: s.enabled,
          popular: s.popular,
          autoRoute: s.auto_route,
          activeProviderId: s.active_provider_id,
          rateMultiplier: Number(s.rate_multiplier || 1.07),
        }),
      });
      if (res?.service) {
        setServices((v) => v.map((x) => (String(x.service || x.id) === String(s.service || s.id) ? { ...x, ...res.service } : x)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Service update failed.");
    } finally {
      setBusy(false);
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
                const order = ["dark", "light", "midnight", "purple"];
                const cur = document.documentElement.getAttribute("data-theme") || "dark";
                const next = order[(order.indexOf(cur) + 1) % order.length];
                document.documentElement.setAttribute("data-theme", next);
                try { localStorage.setItem("vexo_platform_theme", next); } catch {}
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-300 hover:border-[#baff00]/40 hover:text-white transition"
              title="Cycle Platform Theme (Dark / Light / Midnight / Purple)"
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

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
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
              {t === "Sub-Admins" ? "👥 Sub-Admins" : t === "Subscriptions" ? "🤖 Bot Subscriptions" : t}
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
        {tab === "Users" && <Users users={users} q={userQ} setQ={setUserQ} reload={load} wallet={wallet} grantBonus={grantBonus} resetPass={resetUserPassword} busy={busy} />}
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
        {tab === "Tickets" && <Tickets tickets={tickets} reload={load} updateStatus={updateTicketStatus} busy={busy} />}
        {tab === "Announcements" && <Announcements ann={ann} title={title} setTitle={setTitle} message={message} setMessage={setMessage} create={createAnnouncement} del={deleteAnnouncement} busy={busy} />}
        {tab === "Activity" && <Activity rows={activity} />}
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
    { id: "ggsoma_bot", name: "GGSoma Partner Bot", url: "Partner API" },
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

          if (loading && !live) {
            statusText = "CHECKING...";
            badgeClass = "bg-blue-500/10 text-blue-400";
            dotClass = "bg-blue-400 animate-pulse";
          } else if (live?.alertLevel === "CRITICAL") {
            statusText = "CRITICAL (<$5)";
            badgeClass = "bg-red-500/15 text-red-400 border border-red-500/30";
            dotClass = "bg-red-400 animate-ping";
          } else if (live?.alertLevel === "LOW") {
            statusText = "LOW (<$15)";
            badgeClass = "bg-amber-500/15 text-amber-300 border border-amber-500/30";
            dotClass = "bg-amber-400";
          } else if (live?.alertLevel === "NORMAL" || (numBal !== null && numBal > 15)) {
            statusText = "NORMAL";
            badgeClass = "bg-emerald-500/15 text-emerald-400";
            dotClass = "bg-emerald-400";
          } else if (live?.status === "error") {
            statusText = "OFFLINE";
            badgeClass = "bg-rose-500/10 text-rose-400";
            dotClass = "bg-rose-500";
          }

          return (
            <div
              key={dp.id}
              className="rounded-xl border border-white/5 bg-[#0b1418] p-3.5 flex flex-col justify-between transition hover:border-[#baff00]/30 min-w-0"
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
  q,
  setQ,
  reload,
  wallet,
  grantBonus,
  resetPass,
  busy,
}: {
  users: any[];
  q: string;
  setQ: (v: string) => void;
  reload: () => void;
  wallet: (id: number, m: "add" | "deduct") => void;
  grantBonus: (id: number, nameOrEmail: string, currentBonus: number) => void;
  resetPass: (id: number, email: string) => void;
  busy: boolean;
}) {
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
        <button onClick={reload} className="rounded-xl bg-[#baff00] px-4 py-2 text-sm font-black text-[#07100f]">
          Search
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
                      className="rounded-lg bg-[#baff00] px-2.5 py-1.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
                      title="Add real deposited funds"
                    >
                      + Real
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => wallet(u.id, "deduct")}
                      className="rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20 transition"
                      title="Deduct real funds"
                    >
                      − Real
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => grantBonus(u.id, u.name || u.email, u.bonusBalancePkr)}
                      className="rounded-lg border border-[#baff00]/40 bg-[#baff00]/10 px-2.5 py-1.5 text-xs font-bold text-[#baff00] hover:bg-[#baff00] hover:text-[#07100f] transition shadow-sm"
                      title="Grant or top-up promotional bonus credit"
                    >
                      🎁 Add Bonus
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => resetPass(u.id, u.email)}
                      className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1.5 text-xs font-bold text-yellow-300 hover:bg-yellow-400/20 transition"
                      title="Reset user password"
                    >
                      🔑 Reset
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <p className="p-10 text-center text-sm text-slate-500">No users found.</p>}
      </div>
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
  updateDeposit: (id: string, action: "approve" | "reject") => void;
  busyId: string;
  previewScreenshot: string | null;
  setPreviewScreenshot: (url: string | null) => void;
  filter: "All" | "Pending" | "Approved" | "Rejected";
  setFilter: (f: "All" | "Pending" | "Approved" | "Rejected") => void;
}) {
  const [q, setQ] = useState("");

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
          <button
            onClick={reload}
            className="self-start rounded-xl border border-white/10 bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
          >
            🔄 Refresh Queue
          </button>
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
                <td className="px-5 py-4 font-black text-sm text-white">
                  ₨{Number(d.amount).toLocaleString()}
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
                        onClick={() => updateDeposit(d.id, "approve")}
                        className="rounded-lg bg-[#baff00] px-3 py-1.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition"
                      >
                        {busyId === d.id ? "..." : "Approve"}
                      </button>
                      <button
                        disabled={!!busyId}
                        onClick={() => updateDeposit(d.id, "reject")}
                        className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20 disabled:opacity-50 transition"
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
        <button onClick={reload} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition">
          Search
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
  save: (s: any) => void;
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
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [autoRouteFilter, setAutoRouteFilter] = useState("All");
  const [bulkMult, setBulkMult] = useState("1.07");
  const [bulkLoading, setBulkLoading] = useState(false);

  const platforms = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.platform) set.add(s.platform);
    });
    return ["All", ...Array.from(set).sort()];
  }, [services]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return services.filter((s) => {
      if (selectedPlatform !== "All" && s.platform !== selectedPlatform) return false;
      if (autoRouteFilter === "Auto" && s.auto_route === false) return false;
      if (autoRouteFilter === "Manual" && s.auto_route !== false) return false;
      if (!q) return true;
      return (
        String(s.name || "").toLowerCase().includes(q) ||
        String(s.platform || "").toLowerCase().includes(q) ||
        String(s.category || "").toLowerCase().includes(q) ||
        String(s.service || s.id || "").includes(q)
      );
    });
  }, [services, search, selectedPlatform, autoRouteFilter]);

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

      {/* 2. Rates Matrix Controls & Sync Bar */}
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={syncingProviders}
              onClick={syncProviders}
              className="inline-flex items-center gap-2 rounded-xl bg-[#baff00] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#07100f] shadow-[0_4px_20px_rgba(186,255,0,0.25)] transition hover:bg-[#d2ff5a] disabled:opacity-60"
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
                  Sync All Providers Now
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
            className="h-10 rounded-xl border border-white/10 bg-[#0b1418] px-3 text-xs text-white outline-none"
          >
            <option value="All">All Routing Modes</option>
            <option value="Auto">Auto-Route Only</option>
            <option value="Manual">Manual Override Only</option>
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
                <th className="px-4 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filtered.slice(0, 200).map((s: any) => {
                const rates = s.provider_rates || {};

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

                return (
                  <tr key={s.service || s.id} className="hover:bg-white/[.02] transition-colors">
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
                              setServices((v) =>
                                v.map((x) =>
                                  String(x.service || x.id) === String(s.service || s.id)
                                    ? {
                                        ...x,
                                        auto_route: nextVal,
                                        active_provider_id: newActiveProv,
                                        base_rate_usd: newBaseUsd,
                                        rate_usd: Math.round(newBaseUsd * Number(x.rate_multiplier || 1.07) * 10000) / 10000,
                                        rate_pkr: Math.round(newBaseUsd * Number(x.rate_multiplier || 1.07) * (usdToPkr || 278) * 10000) / 10000,
                                      }
                                    : x
                                )
                              );
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
                              setServices((v) =>
                                v.map((x) =>
                                  String(x.service || x.id) === String(s.service || s.id)
                                    ? {
                                        ...x,
                                        active_provider_id: newP,
                                        auto_route: false,
                                        base_rate_usd: newBaseUsd,
                                        rate_usd: Math.round(newBaseUsd * curMult * 10000) / 10000,
                                        rate_pkr: Math.round(newBaseUsd * curMult * (usdToPkr || 278) * 10000) / 10000,
                                      }
                                    : x
                                )
                              );
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
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0.1"
                            max="20"
                            step="0.05"
                            value={s.rate_multiplier ?? 1.07}
                            onChange={(e) => {
                              const newMult = e.target.value;
                              const multNum = Number(newMult) || 1.07;
                              const curBase = Number(s.base_rate_usd || 0);
                              setServices((v) =>
                                v.map((x) =>
                                  String(x.service || x.id) === String(s.service || s.id)
                                    ? {
                                        ...x,
                                        rate_multiplier: newMult,
                                        rate_usd: Math.round(curBase * multNum * 10000) / 10000,
                                        rate_pkr: Math.round(curBase * multNum * (usdToPkr || 278) * 10000) / 10000,
                                      }
                                    : x
                                )
                              );
                            }}
                            className="w-16 rounded-lg border border-white/10 bg-[#0b1418] px-2 py-1 font-mono text-xs text-white outline-none focus:border-[#baff00]/50"
                          />
                          <span className="text-[10px] text-slate-500">×</span>
                        </div>
                        <span className={`text-[9px] font-bold ${marginPercent >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                          {marginPercent >= 0 ? `+${marginPercent}% profit` : `${marginPercent}%`}
                        </span>
                      </div>
                    </td>

                    {/* Retail USD Price */}
                    <td className="px-4 py-3.5 font-mono font-bold text-cyan-400">
                      ${retailUsd.toFixed(4)}
                      <p className="text-[9px] font-normal text-slate-500">per 1k</p>
                    </td>

                    {/* Retail PKR Price */}
                    <td className="px-4 py-3.5 font-mono font-bold text-[#baff00]">
                      ₨{retailPkr.toFixed(2)}
                      <p className="text-[9px] font-normal text-slate-500">per 1k</p>
                    </td>

                    {/* Status checkboxes */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <label title="Enable / Disable Service" className="cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.enabled !== false}
                            onChange={(e) =>
                              setServices((v) =>
                                v.map((x) =>
                                  String(x.service || x.id) === String(s.service || s.id)
                                    ? { ...x, enabled: e.target.checked }
                                    : x
                                )
                              )
                            }
                            className="h-4 w-4 rounded accent-[#baff00]"
                          />
                        </label>
                        <label title="Mark as Popular" className="cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(s.popular)}
                            onChange={(e) =>
                              setServices((v) =>
                                v.map((x) =>
                                  String(x.service || x.id) === String(s.service || s.id)
                                    ? { ...x, popular: e.target.checked }
                                    : x
                                )
                              )
                            }
                            className="h-4 w-4 rounded accent-amber-400"
                          />
                        </label>
                      </div>
                    </td>

                    {/* Save Button */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        disabled={busy}
                        onClick={() => save(s)}
                        className="rounded-lg bg-[#baff00] px-3 py-1.5 text-xs font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-50"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-10 text-center text-sm text-slate-500">No matching services found in routing matrix.</p>
          )}
        </div>
      </section>
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
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPermissions, setNewPermissions] = useState<Record<string, boolean>>({
    orders: true,
    tickets: true,
  });

  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const activeCount = subAdmins.filter((s) => s.isActive !== false).length;
  const suspendedCount = subAdmins.filter((s) => s.isActive === false).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
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

  function applyPreset(preset: "support" | "finance" | "manager" | "clear") {
    if (preset === "support") {
      setNewPermissions({ orders: true, tickets: true });
    } else if (preset === "finance") {
      setNewPermissions({ deposits: true, withdrawals: true });
    } else if (preset === "manager") {
      setNewPermissions({
        orders: true,
        tickets: true,
        deposits: true,
        services: true,
        announcements: true,
        users: true,
        analytics: true,
        withdrawals: true,
      });
    } else {
      setNewPermissions({});
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d171a] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Add New Sub-Admin</h3>
                <p className="text-xs text-slate-400">Create staff credentials and specify authorized areas</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
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

              {/* Permissions Presets */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Assign Permissions
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset("support")}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white"
                    >
                      Support
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("finance")}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white"
                    >
                      Finance
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("manager")}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-[#baff00] hover:bg-white/10"
                    >
                      All (Manager)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("clear")}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Permissions Grid */}
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1">
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

              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#baff00] px-5 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50"
                >
                  {busy ? "Creating..." : "Create Sub-Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit Permissions */}
      {editPermissionsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d171a] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Edit Permissions</h3>
                <p className="text-xs text-slate-400">
                  Update access rules for {editPermissionsTarget.name} ({editPermissionsTarget.email})
                </p>
              </div>
              <button
                onClick={() => setEditPermissionsTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="mt-4 space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-2 max-h-72 overflow-y-auto pr-1">
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

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setEditPermissionsTarget(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#baff00] px-5 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
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
    {
      id: "midnight",
      name: "Midnight Navy",
      desc: "Deep atmospheric space navy background with midnight blue cards, sapphire glow, and sky blue accents.",
      main: "#060b17",
      surface: "#0c1529",
      accent: "#38bdf8",
      accentText: "#031726",
    },
    {
      id: "purple",
      name: "Neon Purple",
      desc: "Vibrant cyberpunk twilight violet background with royal purple cards and neon magenta-lavender accents.",
      main: "#0a0614",
      surface: "#140d29",
      accent: "#c084fc",
      accentText: "#1e0836",
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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
  const [apiUrlInput, setApiUrlInput] = useState("https://ggsoma.store/api/partner/v1");
  const [markupInput, setMarkupInput] = useState<number>(7);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/admin/partner-bot");
      setData(res);
      if (res.config) {
        setApiKeyInput(res.config.apiKey || "");
        if (res.config.apiUrl) setApiUrlInput(res.config.apiUrl);
        if (typeof res.config.markupPercent === "number") setMarkupInput(res.config.markupPercent);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load partner bot details");
    } finally {
      setLoading(false);
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
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#baff00]/30 bg-[#baff00]/10 px-3 py-1 text-xs font-bold text-[#baff00]">
              🤖 TELEGRAM BOT PARTNER API
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isHealthy ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}>
              <span className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              {isHealthy ? "API ONLINE" : "OFFLINE"}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Telegram Bot Subscriptions &amp; Tools Automation
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
            Instant automated order placement and live delivery for ChatGPT Plus, Canva Pro, streaming passes, and SEO software via the GGSoma Telegram Bot Partner API network.
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

      {/* 2. Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: API Status */}
        <div className={card + " p-5 space-y-2"}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bot Service Status</span>
            <span className="text-lg">⚡</span>
          </div>
          <p className="text-2xl font-black text-white">
            {isHealthy ? "Operational" : "Offline"}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            {data?.health?.service || "partner-api"} v{data?.health?.version || 1}
          </p>
        </div>

        {/* Card 2: Live Bot Balance */}
        <div className={card + " p-5 space-y-2"}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bot Wallet Balance</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isFunded ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
            }`}>
              {isFunded ? "FUNDED" : "LOW BALANCE"}
            </span>
          </div>
          <p className="text-2xl font-black text-[#baff00]">
            ${balanceUsd.toFixed(2)} <span className="text-xs font-normal text-slate-400">USD</span>
          </p>
          <p className="text-xs text-slate-400">
            {isFunded ? "Ready for instant purchases" : "Top up bot wallet via Telegram"}
          </p>
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
            <h3 className="text-lg font-black text-white">Partner API Credentials &amp; Margin Rules</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Securely authenticate with <code className="text-[#baff00] font-mono">https://ggsoma.store/api/partner/v1</code>. Saved directly to database settings.
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
                Partner API Secret Key
              </label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-[11px] text-[#baff00] hover:underline"
              >
                {showApiKey ? "Hide Key" : "Show Key"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk_live_..."
                className="w-full rounded-xl border border-white/10 bg-[#070e10] px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-[#baff00] placeholder-slate-600"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Generated from the official GGSoma Telegram Partner Bot portal.
            </p>
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
              className="w-full rounded-xl border border-white/10 bg-[#070e10] px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-[#baff00]"
            />
            <p className="text-[11px] text-slate-500">
              Standard endpoint: <code className="text-slate-400">https://ggsoma.store/api/partner/v1</code>
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
                  Test Bot Connection
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
            className="rounded-xl bg-[#baff00] px-6 py-2.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition disabled:opacity-50 shadow-[0_4px_14px_rgba(186,255,0,0.2)]"
          >
            {saveLoading ? "Saving..." : "Save Bot Configuration"}
          </button>
        </div>
      </section>

      {/* 4. Live Bot Catalog Table */}
      {Array.isArray(data?.sampleProducts) && data.sampleProducts.length > 0 && (
        <section className={card + " overflow-hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <h3 className="text-base font-black text-white">Live Products Synced from Bot API</h3>
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
                      <span className="text-[10px] text-slate-400">{sub.delivery_contact}</span>
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
