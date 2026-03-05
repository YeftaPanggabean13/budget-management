"use client";

import { useState } from "react";
import { FinanceProvider, useFinance } from "@/lib/hooks/useFinance";
import { Dashboard } from "@/components/Dashboard";

function SetupScreen() {
  const { setSetup } = useFinance();
  const [initBalance, setInitBalance] = useState("");
  const [initWeeklyBudget, setInitWeeklyBudget] = useState("");

  const handleSetSetup = () => {
    const balanceNum = Number(initBalance.replace(/\D/g, ""));
    if (!balanceNum || balanceNum <= 0) {
      alert("Masukkan saldo awal yang valid!");
      return;
    }
    const weeklyNum = initWeeklyBudget
      ? Number(initWeeklyBudget.replace(/\D/g, ""))
      : Math.floor(balanceNum / 4);

    setSetup(balanceNum, weeklyNum);
  };

  const formatNumber = (val: string) => {
    const rawValue = val.replace(/\D/g, "");
    if (!rawValue) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(rawValue));
  };

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-white relative flex items-center justify-center p-6 overflow-hidden animate-[fadeIn_0.5s_ease]">
      {/* Background Effects */}
      <div
        className="fixed inset-0 opacity-50 pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")` }}
      />
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.07)_0%,transparent_70%)] pointer-events-none z-0" />

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-[440px] relative z-10">
        <div className="mb-8">
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#B983FF] mb-2.5">Personal Finance</p>
          <h1 className="text-[34px] font-bold tracking-tight leading-tight mb-2">Set up your wallet.</h1>
          <p className="text-[15px] text-white/50 tracking-wide">A few details to get started.</p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-white/40 tracking-[0.06em] uppercase mb-2">Monthly Balance</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 3.000.000"
            value={initBalance}
            onChange={(e) => setInitBalance(formatNumber(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-medium text-white/40 tracking-[0.06em] uppercase mb-2">
            Weekly Budget Target <span className="text-white/30 truncate ml-1 font-normal lowercase tracking-normal">— optional</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Leave blank to auto-split ÷4"
            value={initWeeklyBudget}
            onChange={(e) => setInitWeeklyBudget(formatNumber(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
          />
        </div>

        <button
          onClick={handleSetSetup}
          className="w-full bg-gradient-to-br from-[#7C5CFF] to-[#B983FF] text-white border-none rounded-2xl py-4 text-[15px] font-semibold tracking-tight cursor-pointer transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Get Started
        </button>
      </div>
    </main>
  );
}

function MainApp() {
  const { data, mounted } = useFinance();

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <span className="text-white/30 text-sm tracking-wide">Loading...</span>
      </main>
    );
  }

  if (!data) {
    return <SetupScreen />;
  }

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-white relative overflow-x-hidden">
      {/* Global Background Effects */}
      <div
        className="fixed inset-0 opacity-50 pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")` }}
      />
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.07)_0%,transparent_70%)] pointer-events-none z-0" />

      <Dashboard />
    </main>
  );
}

export default function Page() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}