"use client";

import { useFinance } from "@/lib/hooks/useFinance";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getCycleEndDate, getWeeklyCycleStartDate, getSpentToday } from "@/lib/utils";
import { getWeekdayWeights, runAnalyticsPipeline } from "@/lib/analytics";
import { Zap, AlertCircle, Landmark, Sparkles, Info, Lightbulb, TrendingDown } from "lucide-react";

/** Shared Storage Key for Smart Allocation preference */
const SMART_ALLOC_KEY = "smart-allocation-enabled";

export function BalanceCard() {
    const { data } = useFinance();
    const [displayBalance, setDisplayBalance] = useState(0);
    const [smartAllocation, setSmartAllocation] = useState(false);
    const [showSmartInfo, setShowSmartInfo] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SMART_ALLOC_KEY);
            if (stored !== null) setSmartAllocation(stored === "true");
        } catch { /* ignore */ }
    }, []);

    const toggleSmartAllocation = () => {
        const next = !smartAllocation;
        setSmartAllocation(next);
        try { localStorage.setItem(SMART_ALLOC_KEY, String(next)); } catch { /* ignore */ }
    };

    // Animated balance counter
    useEffect(() => {
        if (!data) return;
        const start = displayBalance, end = data.balance;
        const steps = 60, duration = 1000;
        let step = 0;
        const id = setInterval(() => {
            step++;
            const p = Math.min(step / steps, 1);
            setDisplayBalance(Math.floor(start + (end - start) * (1 - Math.pow(1 - p, 3))));
            if (step >= steps) { clearInterval(id); setDisplayBalance(end); }
        }, duration / steps);
        return () => clearInterval(id);
    }, [data?.balance]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!data) return null;

    const percentage   = ((data.balance / data.initialBalance) * 100).toFixed(0);
    const spent        = data.initialBalance - data.balance;
    const spentPct     = ((spent / data.initialBalance) * 100).toFixed(1);

    // ── Get Analytics ───────────────────────────────────────────────────────
    const weekStart  = getWeeklyCycleStartDate().getTime();
    const weeklySpent = data.transactions
        .filter(tx => new Date(tx.date).getTime() >= weekStart)
        .reduce((s, tx) => s + tx.amount, 0);
    const spentToday = getSpentToday(data.transactions);

    const report = runAnalyticsPipeline(data, {
        weeklyBudget: data.weeklyBudgetTarget,
        weeklySpent, spentToday,
        currentBalance: data.balance,
    });

    const { weeklyDailyAllowance, cycleDailyAllowance, preprocessed, savingGuidance } = report;
    const daysLeftInCycle = preprocessed.daysRemaining;

    // ── Today's Plan Logic ──────────────────────────────────────────────────
    // We use the Weekly-based allowance as the primary "Mindful" goal.
    // If Smart Allocation is on, we apply weights.
    let dailyAllowance = weeklyDailyAllowance;
    let isWeighted = false;

    if (smartAllocation) {
        const weights = getWeekdayWeights(data.transactions);
        if (weights) {
            const dayOfWeek = new Date().getDay();
            const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const w = Math.min(2.0, Math.max(0.5, weights[idx] ?? 1.0));
            dailyAllowance = Math.floor(dailyAllowance * w);
            isWeighted = true;
        }
    }

    const remainingToday = dailyAllowance - spentToday;
    const isOverspent    = remainingToday < 0;
    const progress       = dailyAllowance > 0 ? Math.min(100, (spentToday / dailyAllowance) * 100) : 0;
    const dayLabels      = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const todayLabel     = dayLabels[new Date().getDay()];

    // Cycle Status: Are we near the end with a lot of money?
    const isCycleClosing = daysLeftInCycle <= 2 && data.balance > (data.weeklyBudgetTarget * 0.5);

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }} whileHover={{ y: -4 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[13px] font-medium text-white/45 mb-1">Available Balance</p>
                    <p className="text-[11px] text-white/25 tracking-wide">Updated just now</p>
                </div>
                <div className="bg-[#7C5CFF]/15 border border-[#7C5CFF]/20 text-[#B983FF] rounded-full px-3 py-1 text-[11px] font-medium">
                    {percentage}% remaining
                </div>
            </div>

            {/* Balance */}
            <div className="text-5xl font-bold tracking-tight leading-none mb-2">
                <span className="text-2xl font-medium text-white/50 mr-2 align-middle">Rp</span>
                {displayBalance.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-white/30 mb-6 font-medium">Spent {spentPct}% of total budget this month</p>

            {/* ── Daily Plan Card ───────────────────────────────────────── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.1em] flex items-center gap-2">
                            <Zap size={12} className="text-[#B983FF]" />
                            Rencana Hari Ini ({todayLabel}) · mingguan / 7
                        </p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowSmartInfo(!showSmartInfo)}
                                className="text-white/20 hover:text-white/40 transition-colors">
                                <Info size={12} />
                            </button>
                            <button onClick={toggleSmartAllocation}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                                    smartAllocation
                                        ? "bg-[#7C5CFF]/20 border-[#7C5CFF]/30 text-[#B983FF]"
                                        : "bg-white/5 border-white/10 text-white/30 hover:text-white/50"
                                }`}>
                                <Sparkles size={10} />Smart
                            </button>
                        </div>
                    </div>

                    <div className="flex items-end justify-between">
                        <div>
                            <div className="flex items-baseline gap-2">
                                <p className={`text-2xl font-bold tracking-tight ${isOverspent ? "text-[#FF8E8E]" : "text-white/90"}`}>
                                    Rp {Math.abs(remainingToday).toLocaleString("id-ID")}
                                </p>
                                <span className="text-[11px] text-white/30">/ {dailyAllowance.toLocaleString("id-ID")}</span>
                            </div>
                            <p className={`text-[11px] mt-1.5 font-medium ${isOverspent ? "text-[#FF8E8E]/80" : "text-white/40"}`}>
                                {isOverspent
                                    ? `Rp ${Math.abs(remainingToday).toLocaleString("id-ID")} di atas rencana hari ini`
                                    : `Rp ${remainingToday.toLocaleString("id-ID")} sisa jatah hari ini`}
                            </p>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border shrink-0 ${
                            isWeighted
                                ? "bg-[#7C5CFF]/15 border-[#7C5CFF]/20 text-[#B983FF]"
                                : "bg-white/5 border-white/10 text-white/25"
                        }`}>
                            {isWeighted ? "⚡ Weighted" : "Static"}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {!isOverspent && dailyAllowance > 0 && (
                    <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
                        <motion.div
                            initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full ${progress > 80
                                ? "bg-gradient-to-r from-[#FF9A3C] to-[#FFB574]"
                                : "bg-gradient-to-r from-[#7C5CFF] to-[#B983FF]"}`}
                        />
                    </div>
                )}
            </div>

            {/* ── Contextual Guidance ────────────────────────────────────── */}
            <AnimatePresence>
                {/* 1. Cycle Closing Guidance (The fix for the user's scenario) */}
                {isCycleClosing && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        className="mb-4 bg-[#7C5CFF]/10 border border-[#7C5CFF]/30 rounded-2xl p-4 overflow-hidden">
                        <div className="flex items-start gap-3">
                            <TrendingDown size={14} className="text-[#B983FF] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-[#B983FF] uppercase tracking-wider mb-1">
                                    Siklus Segera Berakhir
                                </p>
                                <p className="text-[11px] text-white/70 leading-relaxed">
                                    Tersisa <span className="text-white font-semibold">{daysLeftInCycle} hari</span> lagi. Kamu punya saldo sisa yang besar (Rp {data.balance.toLocaleString("id-ID")}).
                                    <br />
                                    <span className="text-[#B983FF] font-medium">Saran:</span> Sebaiknya simpan sisa ini sebagai tabungan untuk bulan depan daripada dihabiskan sekarang.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 2. Smart Saving Tip (Only if not closing cycle, to avoid noise) */}
                {!isCycleClosing && savingGuidance.isApplicable && !isOverspent && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        className="mb-4 bg-emerald-500/6 border border-emerald-500/15 rounded-2xl p-4 overflow-hidden"
                    >
                        <div className="flex items-start gap-3">
                            <Lightbulb size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider mb-1">
                                    Saran Cerdas (Opsional)
                                </p>
                                <p className="text-[11px] text-white/60 leading-relaxed">
                                    Jika hari ini kamu belanja maksimal <span className="text-white font-semibold">Rp {savingGuidance.suggestedSpendToday.toLocaleString("id-ID")}</span> saja (hemat Rp {savingGuidance.reductionAmount.toLocaleString("id-ID")}), saldo akhir bulanmu bisa naik sekitar <span className="text-emerald-400 font-semibold">Rp {savingGuidance.projectedExtraSaving.toLocaleString("id-ID")}</span>.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="h-px bg-white/5 mb-6" />

            {/* Emergency Info */}
            <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10 flex justify-between items-center">
                <div>
                    <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-bold mb-0.5">Dana Darurat / Tabungan</p>
                    <p className="text-xl font-bold text-white/90">Rp {(data.savingsBalance || 0).toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl">
                    <Landmark className="text-emerald-400" size={20} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Initial</p>
                    <p className="text-[13px] font-semibold">Rp {data.initialBalance.toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Spent</p>
                    <p className="text-[13px] font-semibold text-[#FF8E8E]">Rp {spent.toLocaleString("id-ID")}</p>
                </div>
            </div>
        </motion.div>
    );
}
