"use client";

import { useEffect, useState } from "react";

type Deposit = {
  id: string;
  userId: number;
  name: string;
  email: string;
  method: string;
  amount: number;
  transactionId: string;
  screenshot?: string | null;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
};

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  async function loadDeposits() {
    setError("");
    try {
      const response = await fetch("/api/admin/deposits", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to load deposits.");
      setDeposits(data.deposits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load deposits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success || !data?.user?.is_admin) {
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/login";
      });
    loadDeposits();
  }, []);

  async function updateDeposit(depositId: string, action: "approve" | "reject") {
    if (busyId) return;

    let rejectionReason = "";
    if (action === "reject") {
      rejectionReason = window.prompt("Reason for rejection:", "Payment could not be verified.")?.trim() || "Payment could not be verified.";
    }

    setBusyId(depositId);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId, action, rejectionReason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to update deposit.");
      setMessage(data.message || "Deposit updated.");
      await loadDeposits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update deposit.");
    } finally {
      setBusyId("");
    }
  }

  const pending = deposits.filter((d) => d.status === "Pending");

  return (
    <main className="min-h-screen bg-[#07100f] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#baff00]">VEXARO Admin</p>
            <h1 className="mt-2 text-3xl font-black">Deposit Requests</h1>
            <p className="mt-2 text-sm text-slate-500">Review payments and approve verified deposits to credit user wallets.</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-300 hover:border-[#baff00]/30 hover:text-white transition"
            >
              ← Admin Panel
            </a>
            <button onClick={loadDeposits} className="rounded-xl border border-white/10 bg-[#baff00] px-4 py-3 text-sm font-black text-[#07100f] hover:bg-[#d2ff5a] transition">
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-5"><p className="text-xs uppercase tracking-wide text-slate-500">Pending</p><p className="mt-2 text-3xl font-black text-amber-300">{pending.length}</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-5"><p className="text-xs uppercase tracking-wide text-slate-500">Approved</p><p className="mt-2 text-3xl font-black text-emerald-300">{deposits.filter((d) => d.status === "Approved").length}</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-5"><p className="text-xs uppercase tracking-wide text-slate-500">Total requests</p><p className="mt-2 text-3xl font-black">{deposits.length}</p></div>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {message && <div className="mt-5 rounded-xl border border-[#baff00]/20 bg-[#baff00]/10 px-4 py-3 text-sm text-[#d8ff86]">{message}</div>}

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#111a1d]">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">Loading deposit requests...</div>
          ) : deposits.length === 0 ? (
            <div className="px-6 py-16 text-center"><p className="font-bold">No deposit requests</p><p className="mt-1 text-sm text-slate-500">New funding requests will appear here.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left">
                <thead className="border-b border-white/10 bg-[#0b1418] text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Method</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Transaction ID</th><th className="px-5 py-4">Receipt</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4"><p className="font-bold">{deposit.name}</p><p className="mt-1 text-xs text-slate-600">{deposit.email}</p></td>
                      <td className="px-5 py-4 text-sm font-semibold">{deposit.method}</td>
                      <td className="px-5 py-4 text-sm font-black">₨{deposit.amount.toLocaleString()}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-300">{deposit.transactionId}</td>
                      <td className="px-5 py-4">
                        {deposit.screenshot ? (
                          <button
                            type="button"
                            onClick={() => setPreviewScreenshot(deposit.screenshot!)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#baff00]/30 bg-[#baff00]/10 px-2.5 py-1 text-xs font-bold text-[#baff00] transition hover:bg-[#baff00] hover:text-[#07100f]"
                          >
                            <span>🖼️</span>
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">
                            {deposit.status === "Pending" ? "No image" : "Purged ✓"}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(deposit.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${deposit.status === "Approved" ? "bg-emerald-400/10 text-emerald-300" : deposit.status === "Rejected" ? "bg-red-400/10 text-red-300" : "bg-amber-400/10 text-amber-300"}`}>{deposit.status}</span></td>
                      <td className="px-5 py-4">
                        {deposit.status === "Pending" ? (
                          <div className="flex gap-2">
                            <button disabled={!!busyId} onClick={() => updateDeposit(deposit.id, "approve")} className="rounded-lg bg-[#baff00] px-3 py-2 text-xs font-black text-[#07100f] disabled:opacity-50">{busyId === deposit.id ? "..." : "Approve"}</button>
                            <button disabled={!!busyId} onClick={() => updateDeposit(deposit.id, "reject")} className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50">Reject</button>
                          </div>
                        ) : <span className="text-xs text-slate-600">Reviewed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Screenshot Modal Viewer */}
        {previewScreenshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#111a1d] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white">Payment Receipt Proof</h3>
                <button
                  type="button"
                  onClick={() => setPreviewScreenshot(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
              <div className="max-h-[75vh] overflow-auto rounded-2xl border border-white/5 bg-black/40 p-2 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewScreenshot}
                  alt="Payment Receipt Screenshot"
                  className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain"
                />
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">
                💡 Note: Once approved or rejected, this screenshot is automatically deleted from the database.
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-[#baff00]/20 bg-[#baff00]/5 p-4 text-xs leading-5 text-slate-400">
          <span className="font-bold text-[#baff00]">Security:</span> approving a request uses a database transaction and locks the deposit. A pending deposit can only be approved once, and the wallet credit happens in the same transaction. Screenshots are permanently purged upon review.
        </div>
      </div>
    </main>
  );
}
