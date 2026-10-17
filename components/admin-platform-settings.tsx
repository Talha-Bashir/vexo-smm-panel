"use client";

import { useEffect, useState } from "react";
import { AdminApiTogglesCard } from "@/components/admin-api-toggles";

export function PlatformSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [liveForexRate, setLiveForexRate] = useState<number>(278.0);

  // Site Operations & Controls
  const [maintenanceMode, setMaintenanceMode] = useState("false");
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [noticeEnabled, setNoticeEnabled] = useState("false");
  const [noticeText, setNoticeText] = useState("");
  const [noticeType, setNoticeType] = useState("info");

  // Official Support Handles
  const [whatsappNumber, setWhatsappNumber] = useState("923197008275");
  const [telegramUsername, setTelegramUsername] = useState("VexaroSMMAdmin");
  const [supportEmail, setSupportEmail] = useState("support@vexarosmm.com");

  // Profit Margins & Currency
  const [profitMargin, setProfitMargin] = useState("8");
  const [dollarOrderMarkup, setDollarOrderMarkup] = useState("8");
  const [dollarRateMode, setDollarRateMode] = useState<"manual" | "auto">("manual");
  const [manualDollarRate, setManualDollarRate] = useState("285.00");

  // Local Accounts
  const [sadaPayNum, setSadaPayNum] = useState("03197008275");
  const [sadaPayTitle, setSadaPayTitle] = useState("Saeed Bashir");
  const [easypaisaNum, setEasypaisaNum] = useState("03197008275");
  const [easypaisaTitle, setEasypaisaTitle] = useState("Saeed Bashir");
  const [jazzcashNum, setJazzcashNum] = useState("03197008275");
  const [jazzcashTitle, setJazzcashTitle] = useState("Saeed Bashir");

  // Binance & Crypto
  const [binanceUid, setBinanceUid] = useState("1069021883");
  const [binanceName, setBinanceName] = useState("Talha Bashir Bhatti");
  const [binanceUsdtAddress, setBinanceUsdtAddress] = useState("0xaa3037450e112ef10406df821803522bc589821c");
  const [binanceNetwork, setBinanceNetwork] = useState("BSC BNB Smart Chain (BEP20)");

  // Deposit Bonus
  const [depositBonusSetting, setDepositBonusSetting] = useState("tiered");

  useEffect(() => {
    fetchSettings();
    fetch("/api/rates")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.rates?.USD) {
          setLiveForexRate(Math.round(Number(d.rates.USD) * 100) / 100);
        }
      })
      .catch(() => {});
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.site_maintenance_mode !== undefined) setMaintenanceMode(s.site_maintenance_mode);
        if (s.site_maintenance_message !== undefined) setMaintenanceMsg(s.site_maintenance_message);
        if (s.site_notice_enabled !== undefined) setNoticeEnabled(s.site_notice_enabled);
        if (s.site_notice_text !== undefined) setNoticeText(s.site_notice_text);
        if (s.site_notice_type !== undefined) setNoticeType(s.site_notice_type);

        if (s.support_whatsapp_number !== undefined) setWhatsappNumber(s.support_whatsapp_number);
        if (s.support_telegram_username !== undefined) setTelegramUsername(s.support_telegram_username);
        if (s.support_email !== undefined) setSupportEmail(s.support_email);

        if (s.global_profit_margin !== undefined) setProfitMargin(s.global_profit_margin);
        if (s.dollar_order_markup !== undefined) setDollarOrderMarkup(s.dollar_order_markup);
        if (s.dollar_rate_mode !== undefined) setDollarRateMode(s.dollar_rate_mode === "auto" ? "auto" : "manual");
        if (s.manual_dollar_rate !== undefined && s.manual_dollar_rate) setManualDollarRate(s.manual_dollar_rate);
        else if (s.usd_to_pkr !== undefined && s.usd_to_pkr) setManualDollarRate(s.usd_to_pkr);

        if (s.sadapay_number !== undefined) setSadaPayNum(s.sadapay_number);
        if (s.sadapay_title !== undefined) setSadaPayTitle(s.sadapay_title);
        if (s.easypaisa_number !== undefined) setEasypaisaNum(s.easypaisa_number);
        if (s.easypaisa_title !== undefined) setEasypaisaTitle(s.easypaisa_title);
        if (s.jazzcash_number !== undefined) setJazzcashNum(s.jazzcash_number);
        if (s.jazzcash_title !== undefined) setJazzcashTitle(s.jazzcash_title);

        if (s.binance_uid !== undefined) setBinanceUid(s.binance_uid);
        if (s.binance_name !== undefined) setBinanceName(s.binance_name);
        if (s.binance_usdt_address !== undefined) setBinanceUsdtAddress(s.binance_usdt_address);
        if (s.binance_network !== undefined) setBinanceNetwork(s.binance_network);

        if (s.deposit_bonus_percentage !== undefined) setDepositBonusSetting(s.deposit_bonus_percentage);
      }
    } catch (e: any) {
      setErr(e.message || "Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const payload: Record<string, string> = {
        site_maintenance_mode: maintenanceMode,
        site_maintenance_message: maintenanceMsg,
        site_notice_enabled: noticeEnabled,
        site_notice_text: noticeText,
        site_notice_type: noticeType,

        support_whatsapp_number: whatsappNumber,
        support_telegram_username: telegramUsername,
        support_email: supportEmail,

        global_profit_margin: profitMargin,
        dollar_order_markup: dollarOrderMarkup,
        dollar_rate_mode: dollarRateMode,
        manual_dollar_rate: manualDollarRate,
        usd_to_pkr: manualDollarRate,

        sadapay_number: sadaPayNum,
        sadapay_title: sadaPayTitle,
        easypaisa_number: easypaisaNum,
        easypaisa_title: easypaisaTitle,
        jazzcash_number: jazzcashNum,
        jazzcash_title: jazzcashTitle,

        binance_uid: binanceUid,
        binance_name: binanceName,
        binance_usdt_address: binanceUsdtAddress,
        binance_network: binanceNetwork,

        deposit_bonus_percentage: depositBonusSetting,
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update platform settings");
      }

      setMsg("✓ All platform operations, support channels, and payment settings saved successfully!");
      setTimeout(() => setMsg(""), 5000);
    } catch (e: any) {
      setErr(e.message || "Failed to save platform settings");
    } finally {
      setSaving(false);
    }
  }

  const [instantToggling, setInstantToggling] = useState(false);

  async function handleToggleMaintenance(desiredState: "true" | "false") {
    setInstantToggling(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          site_maintenance_mode: desiredState,
          site_maintenance_message: maintenanceMsg,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update maintenance mode");
      }
      setMaintenanceMode(desiredState);
      setMsg(
        desiredState === "true"
          ? "⚠️ Maintenance Mode is now ACTIVE. Public visitors see the full-screen Maintenance screen."
          : "✓ Maintenance Mode is now OFF. Platform is online and accessible to all visitors."
      );
      setTimeout(() => setMsg(""), 6000);
    } catch (e: any) {
      setErr(e.message || "Failed to toggle maintenance mode");
    } finally {
      setInstantToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 mb-2">
              <span>⚙️ Full Platform Operations &amp; Gateway Controls</span>
            </div>
            <h2 className="text-2xl font-black text-white">Platform Settings &amp; Payment Accounts</h2>
            <p className="mt-1 text-xs text-slate-400 max-w-2xl">
              Control maintenance mode, broadcast alert banners, official support handles, deposit accounts, and wholesale margins.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-[#baff00] px-6 py-3 text-xs sm:text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition shadow-[0_4px_20px_rgba(186,255,0,0.3)] cursor-pointer"
          >
            <span>{saving ? "Saving Changes..." : "💾 Save All Platform Settings"}</span>
          </button>
        </div>

        {msg && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-400">{msg}</div>}
        {err && <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-400">{err}</div>}
      </div>

      {/* External API Services Killswitch Manager */}
      <AdminApiTogglesCard />

      {/* 2. Operations & Broadcast Announcement */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Maintenance Mode */}
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 text-base">
                ⚠️
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">Maintenance Mode</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      maintenanceMode === "true"
                        ? "border border-amber-500/40 bg-amber-500/20 text-amber-300 animate-pulse"
                        : "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {maintenanceMode === "true" ? "ACTIVE (LOCKED)" : "OFF (ONLINE)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Locks down public and customer pages with a full-screen Maintenance screen. Only admins can access the site.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={instantToggling || loading}
                onClick={() => handleToggleMaintenance(maintenanceMode === "true" ? "false" : "true")}
                className={`rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer disabled:opacity-50 shadow-md ${
                  maintenanceMode === "true"
                    ? "bg-emerald-400 text-[#07100f] hover:bg-emerald-300"
                    : "bg-amber-400 text-[#07100f] hover:bg-amber-300"
                }`}
              >
                {instantToggling
                  ? "Updating..."
                  : maintenanceMode === "true"
                  ? "🟢 Turn OFF Maintenance (Go Online)"
                  : "⚠️ Turn ON Maintenance (Lock Site)"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Custom Maintenance Message
            </label>
            <input
              type="text"
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              placeholder="We are upgrading our servers and provider networks. We will be back online shortly!"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white focus:border-[#baff00] outline-none"
            />
          </div>
        </div>

        {/* Global Broadcast Announcement */}
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#baff00]/15 text-[#baff00] text-sm">
                📢
              </span>
              <div>
                <h3 className="text-sm font-black text-white">Top Notice / Broadcast Banner</h3>
                <p className="text-[11px] text-slate-400">Display an eye-catching announcement bar at the top of every page.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNoticeEnabled(noticeEnabled === "true" ? "false" : "true")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                noticeEnabled === "true" ? "bg-[#baff00]" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[#07100f] transition ${
                  noticeEnabled === "true" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Announcement Message
            </label>
            <input
              type="text"
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              placeholder="e.g. ⚡ Flash Promo: +10% Auto Bonus applied to all deposits today!"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white focus:border-[#baff00] outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Official Support Handles */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 text-sm">
            💬
          </span>
          <div>
            <h3 className="text-base font-black text-white">Official Support Handles &amp; Contact Channels</h3>
            <p className="text-xs text-slate-400">
              These channels power the 24/7 Global Support Widget, deposit payment receipts, and customer contact buttons.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              WhatsApp Support (International Format)
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5">
              <span className="text-xs text-emerald-400 font-bold">+</span>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="923197008275"
                className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Links to: https://wa.me/{whatsappNumber || "923197008275"}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Telegram Official Username
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5">
              <span className="text-xs text-cyan-400 font-bold">@</span>
              <input
                type="text"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ""))}
                placeholder="VexaroSMMAdmin"
                className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Links to: https://t.me/{telegramUsername || "VexaroSMMAdmin"}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Official Support Email
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value.trim())}
              placeholder="support@vexarosmm.com"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white focus:border-[#baff00] outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Local Pakistani Banking & Payment Gateways */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#baff00]/15 text-[#baff00] text-sm">
            💳
          </span>
          <div>
            <h3 className="text-base font-black text-white">Local Pakistani Payment Gateways</h3>
            <p className="text-xs text-slate-400">
              Account numbers and titles presented to users on the Add Funds page for SadaPay, Easypaisa, and JazzCash.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          {/* SadaPay */}
          <div className="rounded-xl border border-cyan-500/20 bg-[#070d0d] p-4 space-y-3">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">SadaPay Account</span>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Account Number</label>
              <input
                type="text"
                value={sadaPayNum}
                onChange={(e) => setSadaPayNum(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono font-bold text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Account Title</label>
              <input
                type="text"
                value={sadaPayTitle}
                onChange={(e) => setSadaPayTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none"
              />
            </div>
          </div>

          {/* Easypaisa */}
          <div className="rounded-xl border border-emerald-500/20 bg-[#070d0d] p-4 space-y-3">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Easypaisa Account</span>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Account Number</label>
              <input
                type="text"
                value={easypaisaNum}
                onChange={(e) => setEasypaisaNum(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono font-bold text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Account Title</label>
              <input
                type="text"
                value={easypaisaTitle}
                onChange={(e) => setEasypaisaTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none"
              />
            </div>
          </div>

          {/* JazzCash */}
          <div className="rounded-xl border border-rose-500/20 bg-[#070d0d] p-4 space-y-3">
            <span className="text-xs font-black text-rose-400 uppercase tracking-wider">JazzCash Account</span>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Account Number</label>
              <input
                type="text"
                value={jazzcashNum}
                onChange={(e) => setJazzcashNum(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono font-bold text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Account Title</label>
              <input
                type="text"
                value={jazzcashTitle}
                onChange={(e) => setJazzcashTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Binance & Global Crypto Receiver */}
      <div className="rounded-2xl border border-[#F0B90B]/30 bg-[#111a1d] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0B90B]/15 text-[#F0B90B] text-sm">
              🟡
            </span>
            <div>
              <h3 className="text-base font-black text-white">Binance Pay &amp; USDT Crypto Receiver</h3>
              <p className="text-xs text-slate-400">Deposit parameters shown for international cryptocurrency payments.</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            0% Fee • Spot Wallet
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
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

      {/* 6. Pricing, Margins & Deposit Bonus */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6">
          <h3 className="text-base font-black text-white">Global Profit Margin</h3>
          <p className="mt-1 text-xs text-slate-400">
            Set the baseline percentage profit margin applied over upstream provider wholesale rates.
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

        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-white">Dollar Exchange Rate ($ to PKR)</h3>
              <p className="mt-1 text-xs text-slate-400">
                Applied to all service prices &amp; orders. Eliminates exchange-rate loss.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>1 USD = ₨{dollarRateMode === "manual" ? Number(manualDollarRate || 285).toFixed(2) : (liveForexRate * (1 + (Number(dollarOrderMarkup) || 0) / 100)).toFixed(2)} (Active on Site)</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-[#070d0d] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setDollarRateMode("manual")}
              className={`flex-1 rounded-lg py-2 text-xs font-black transition ${
                dollarRateMode === "manual"
                  ? "bg-[#baff00] text-[#07100f] shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📌 Manual Fixed Rate (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setDollarRateMode("auto")}
              className={`flex-1 rounded-lg py-2 text-xs font-black transition ${
                dollarRateMode === "auto"
                  ? "bg-[#baff00] text-[#07100f] shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Auto Forex + Markup
            </button>
          </div>

          {dollarRateMode === "manual" ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Real Dollar Rate in Pakistan (₨ per $1 USD)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Set the actual open market or Binance USDT dollar price you pay to suppliers.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-black text-[#baff00]">₨</span>
                  <input
                    type="number"
                    step="0.5"
                    min="200"
                    max="600"
                    value={manualDollarRate}
                    onChange={(e) => setManualDollarRate(e.target.value)}
                    className="w-32 rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-sm font-black text-white focus:border-[#baff00] outline-none"
                  />
                  <span className="text-xs text-slate-400">PKR per 1 USD</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Presets:</span>
                {["282.00", "285.00", "288.00", "290.00", "295.00"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setManualDollarRate(preset)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition border ${
                      manualDollarRate === preset
                        ? "border-[#baff00] bg-[#baff00]/20 text-[#baff00]"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    ₨{preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="rounded-xl border border-white/5 bg-[#070d0d] p-3 text-xs flex justify-between items-center">
                <span className="text-slate-400">Live Forex Interbank Feed:</span>
                <span className="font-mono font-bold text-white">1 USD = ~₨{liveForexRate}</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dollar Order Markup (%)
                </label>
                <div className="mt-1.5 flex items-center gap-3">
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
                    Effective Order Rate: <strong className="text-white">₨{(liveForexRate * (1 + (Number(dollarOrderMarkup) || 0) / 100)).toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#baff00]/15 bg-[#baff00]/5 p-2.5 text-[11px] text-[#cfff62] flex items-center gap-2">
            <span>🛡️</span>
            <span>Zero-Loss Guarantee: Platform enforces automatic 5% profit margin above wholesale provider costs.</span>
          </div>
        </div>

        {/* Bonus Policy */}
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6">
          <h3 className="text-base font-black text-white">Deposit Bonus Policy</h3>
          <p className="mt-1 text-xs text-slate-400">Default bonus tier applied upon manual deposit approval.</p>

          <div className="mt-4">
            <select
              value={depositBonusSetting}
              onChange={(e) => setDepositBonusSetting(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#baff00] outline-none"
            >
              <option value="tiered">Tiered (5% for ₨500+, 10% for ₨5k+)</option>
              <option value="5">Flat 5% Bonus on all deposits</option>
              <option value="7">Flat 7% Bonus on all deposits</option>
              <option value="10">Flat 10% Bonus on all deposits</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
