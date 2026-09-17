import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#07100f] text-white flex items-center justify-center p-4 selection:bg-[#baff00]/20 selection:text-[#baff00]">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c1618]/90 p-8 sm:p-10 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#baff00]/10 text-2xl font-black text-[#baff00] ring-1 ring-[#baff00]/30 shadow-[0_0_30px_rgba(186,255,0,0.15)]">
          404
        </div>
        
        <h1 className="mt-6 text-2xl sm:text-3xl font-black text-white tracking-tight">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          The page or resource you are looking for does not exist, has been removed, or has moved to a new destination on VEXARO SMM.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto rounded-xl bg-[#baff00] px-6 py-3 text-sm font-black text-[#07100f] transition hover:bg-[#a6e600] shadow-[0_0_20px_rgba(186,255,0,0.2)]"
          >
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            Open Dashboard
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-4 text-xs text-slate-500">
          <Link href="/smm-panel" className="hover:text-slate-300 transition">SMM Panel</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-slate-300 transition">Terms</Link>
          <span>•</span>
          <a href="https://t.me/VexaroSMMAdmin" target="_blank" rel="noreferrer" className="hover:text-[#229ed9] transition">Support</a>
        </div>
      </div>
    </main>
  );
}
