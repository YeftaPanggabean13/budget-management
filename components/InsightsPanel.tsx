"use client";

import { useFinance } from "@/lib/hooks/useFinance";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis } from "recharts";
import { getCategoryColor } from "@/lib/constants";
import { format, subDays, isSameDay, parseISO, addWeeks, differenceInDays } from "date-fns";
import { TrendingUp, TrendingDown, AlertCircle, Zap, ChevronRight, ChevronDown, Landmark, Brain, Activity, Flame, Lightbulb } from "lucide-react";
import { useState } from "react";
import { getCycleStartDate, getCycleEndDate, getWeeklyCycleStartDate, getSpentToday } from "@/lib/utils";
import { runAnalyticsPipeline, type UserProfile, type InsightType } from "@/lib/analytics";

const PIE_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEEAD","#D4A5A5","#9B59B6","#3498DB","#E67E22","#95A5A6"];

const INSIGHT_ICON: Record<InsightType, typeof AlertCircle> = {
    danger: AlertCircle, warning: Zap, info: Activity, success: Zap,
};

const PROFILE_META: Record<UserProfile, { label: string; color: string; bg: string; Icon: typeof Brain }> = {
    conservative: { label: "Hemat & Efisien",   color: "#4ECDC4", bg: "rgba(78,205,196,0.12)",  Icon: Brain  },
    balanced:     { label: "Seimbang",       color: "#B983FF", bg: "rgba(185,131,255,0.12)", Icon: Brain  },
    aggressive:   { label: "Agresif (Waspada)",   color: "#FFB043", bg: "rgba(255,176,67,0.12)",  Icon: Flame  },
};

const DAY_LABELS = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];

export function InsightsPanel() {
    const { data } = useFinance();
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

    if (!data || data.transactions.length === 0) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center justify-center min-h-[300px]">
                <p className="text-white/40 text-sm">Tambahkan transaksi untuk mendapatkan insight cerdas</p>
            </motion.div>
        );
    }

    const now = new Date();
    const cycleStart = getCycleStartDate(now);
    const cycleEnd   = getCycleEndDate(now);
    const weekStart  = getWeeklyCycleStartDate(now);

    const weeklySpent = data.transactions
        .filter(tx => parseISO(tx.date) >= weekStart)
        .reduce((s, tx) => s + tx.amount, 0);
    const spentToday = getSpentToday(data.transactions);

    const report = runAnalyticsPipeline(data, {
        weeklyBudget: data.weeklyBudgetTarget,
        weeklySpent, spentToday,
        currentBalance: data.balance,
    });

    const { forecast, burnRate, weekdayProfile, userProfile, anomalies, recoveryPlan, insights, savingGuidance, trend, preprocessed } = report;
    const { label: profileLabel, color: profileColor, bg: profileBg, Icon: ProfileIcon } = PROFILE_META[userProfile];

    // Pie data
    const catTotals: Record<string, number> = {};
    data.transactions.forEach(tx => { catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount; });
    const pieData = Object.entries(catTotals).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 5);

    // Last 7 days bar
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return { displayDate: format(d, "EEE"), amount: data.transactions.filter(tx => isSameDay(parseISO(tx.date), d)).reduce((s, tx) => s + tx.amount, 0) };
    });

    // Weekly breakdown
    const weeks = [0, 1, 2, 3].map(wi => {
        const wStart = addWeeks(cycleStart, wi);
        const wEnd   = addWeeks(wStart, 1);
        const actualEnd = wEnd > cycleEnd ? cycleEnd : wEnd;
        const txs = data.transactions.filter(tx => { const d = parseISO(tx.date); return d >= wStart && d < actualEnd; });
        const total = txs.reduce((s, tx) => s + tx.amount, 0);
        const cats: Record<string, number> = {};
        txs.forEach(tx => { cats[tx.category] = (cats[tx.category] || 0) + tx.amount; });
        return {
            label: `Minggu ${wi + 1}`, start: wStart, end: actualEnd, total,
            categories: Object.entries(cats).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
            isCurrent: now >= wStart && now < actualEnd,
        };
    });

    // Heatmap color logic
    const maxAvg = Math.max(...weekdayProfile.averages, 1);
    const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    function getHeatColor(idx: number) {
        if (!weekdayProfile.hasSufficientData) return "rgba(255,255,255,0.05)";
        const ratio = weekdayProfile.averages[idx] / maxAvg;
        if (ratio > 0.8) return "rgba(255,107,107,0.4)";
        if (ratio > 0.5) return "rgba(255,176,67,0.3)";
        if (ratio > 0.2) return "rgba(78,205,196,0.2)";
        return "rgba(255,255,255,0.05)";
    }

    return (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6">

            {/* Profile & Recovery Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Profile Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/40">
                            <Brain size={14} />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Behavioral Profile</p>
                        </div>
                        <div className="px-2 py-1 rounded-full text-[9px] font-bold uppercase"
                            style={{ backgroundColor: profileBg, color: profileColor, border: `1px solid ${profileColor}40` }}>
                            {profileLabel}
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                            Berdasarkan pola spending 14 hari terakhir, profilmu adalah <span style={{ color: profileColor }} className="font-bold">{profileLabel}</span>.
                            {userProfile === "aggressive" ? " Ada baiknya mulai mengerem sedikit agar saldo akhir bulan tetap terjaga." : " Pertahankan kedisiplinan ini!"}
                        </p>
                    </div>
                </div>

                {/* 2. Forecast / Recovery Card */}
                <div className={`bg-white/5 border rounded-3xl p-5 flex flex-col gap-3 ${forecast.predicted < 500_000 ? "border-orange-500/20" : "border-white/10"}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/40">
                            <Activity size={14} />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Forecast Akhir Bulan</p>
                        </div>
                        <TrendingUp size={14} className={forecast.predicted < 500_000 ? "text-orange-400" : "text-emerald-400"} />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-white tracking-tight">Rp {Math.floor(forecast.predicted).toLocaleString("id-ID")}</p>
                        <p className="text-[10px] text-white/30 mt-1">
                            Sisa saldo diprediksi di tanggal 3 (pola spending Rp {Math.floor(forecast.riskAdjustedVelocity).toLocaleString("id-ID")}/hari).
                        </p>
                    </div>
                </div>
            </div>

            {/* Insights Stack */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-[#B983FF]" /> Smart Analysis
                </p>
                <div className="space-y-3">
                    {insights.map((ins, i) => {
                        const Icon = INSIGHT_ICON[ins.type];
                        return (
                            <motion.div key={ins.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="shrink-0 mt-0.5"><Icon size={16} style={{ color: ins.color }} /></div>
                                <div className="space-y-1">
                                    <p className="text-[12px] font-bold text-white/90">{ins.title}</p>
                                    <p className="text-[11px] text-white/50 leading-relaxed">{ins.body}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Burn Rate & Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Velocity & Trends</p>
                        {trend.direction === "increasing" ? <TrendingUp size={14} className="text-orange-400" /> : <TrendingDown size={14} className="text-emerald-400" />}
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-baseline mb-1.5">
                                <p className="text-[11px] text-white/60">Burn Rate (Pace Spending)</p>
                                <p className={`text-xs font-bold ${burnRate.ratio > 1.1 ? "text-orange-400" : "text-emerald-400"}`}>{burnRate.ratio.toFixed(2)}×</p>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, burnRate.ratio * 50)}%` }}
                                    className={`h-full ${burnRate.ratio > 1.1 ? "bg-orange-400" : "bg-emerald-400"}`} />
                            </div>
                        </div>
                        <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                            <div className="text-center flex-1">
                                <p className="text-[9px] text-white/30 uppercase mb-1">Rata-rata 7h</p>
                                <p className="text-[11px] font-bold text-white">Rp {Math.floor(trend.ema7d).toLocaleString("id-ID")}</p>
                            </div>
                            <div className="w-px bg-white/10 mx-2" />
                            <div className="text-center flex-1">
                                <p className="text-[9px] text-white/30 uppercase mb-1">Trend</p>
                                <p className={`text-[11px] font-bold ${trend.slopePercent > 0 ? "text-orange-400" : "text-emerald-400"}`}>
                                    {trend.slopePercent > 0 ? "+" : ""}{trend.slopePercent}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Weekly Pacing</p>
                    <div className="h-[120px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeks.map(w => ({ name: w.label, amount: w.total }))}>
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                    {weeks.map((w, index) => (
                                        <Cell key={`cell-${index}`} fill={w.isCurrent ? "#7C5CFF" : "rgba(255,255,255,0.1)"} />
                                    ))}
                                </Bar>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} stroke="rgba(255,255,255,0.3)" />
                                <Tooltip
                                    cursor={{ fill: "transparent" }}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-[#1A1A2E] border border-white/10 p-2 rounded-xl shadow-xl">
                                                    <p className="text-[10px] font-bold text-white">Rp {payload[0].value.toLocaleString("id-ID")}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Heatmap Section */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Pola Belanja Harian</p>
                    <p className="text-[10px] text-white/20">Berdasarkan data historismu</p>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {DAY_LABELS.map((label, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2">
                            <div className={`w-full aspect-square rounded-xl border flex items-center justify-center transition-all ${idx === todayIdx ? "border-[#7C5CFF]" : "border-transparent"}`}
                                style={{ backgroundColor: getHeatColor(idx) }}>
                                {idx === todayIdx && <div className="w-1.5 h-1.5 rounded-full bg-[#B983FF] shadow-[0_0_8px_#B983FF]" />}
                            </div>
                            <p className={`text-[10px] font-bold ${idx === todayIdx ? "text-[#B983FF]" : "text-white/20"}`}>{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recovery Plan (Conditional) */}
            {recoveryPlan && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-orange-400">
                        <AlertCircle size={16} />
                        <p className="text-sm font-bold uppercase tracking-wider">Adjustment Suggestion (Recovery Plan)</p>
                    </div>
                    <p className="text-[12px] text-white/70 leading-relaxed">
                        Untuk menjaga saldo tetap aman hingga akhir bulan (buffer Rp 500rb), sistem menyarankan penyesuaian gaya belanja:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-black/20 rounded-2xl p-4 flex flex-col gap-1 border border-white/5">
                            <p className="text-[9px] text-white/30 uppercase font-bold">Target Baru</p>
                            <p className="text-sm font-bold text-white">Rp {recoveryPlan.safeDailyLimit.toLocaleString("id-ID")}/hr</p>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-4 flex flex-col gap-1 border border-white/5">
                            <p className="text-[10px] text-white/30 uppercase font-bold">Kurangi Kategori</p>
                            <p className="text-[12px] font-bold text-orange-400">{recoveryPlan.topCategoryToReduce}</p>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-4 flex flex-col gap-1 border border-white/5 hidden md:flex">
                            <p className="text-[10px] text-white/30 uppercase font-bold">Sisa Hari</p>
                            <p className="text-[12px] font-bold text-white">{recoveryPlan.daysRemaining} Hari</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Recent Anomalies */}
            {anomalies.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Anomali Terdeteksi ({anomalies.length})</p>
                    <div className="space-y-2">
                        {anomalies.slice(0, 3).map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div className="space-y-0.5">
                                    <p className="text-[11px] font-bold text-white/90">{a.transaction.category}</p>
                                    <p className="text-[10px] text-white/30">{format(parseISO(a.transaction.date), "dd MMM yyyy")}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold text-orange-400">Rp {a.transaction.amount.toLocaleString("id-ID")}</p>
                                    <p className="text-[9px] text-white/20">{a.medianRatio.toFixed(1)}x dari biasanya</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
