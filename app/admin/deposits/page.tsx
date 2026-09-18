"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDepositsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin?tab=Deposits");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07100f] text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#baff00] border-t-transparent" />
        <p className="text-sm font-medium">Opening Deposits in Admin Panel...</p>
      </div>
    </main>
  );
}
