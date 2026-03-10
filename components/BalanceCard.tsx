import { useFinance } from "@/lib/hooks/useFinance";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { calculateDailyAllowance, getSpentToday, getWeeklyCycleStartDate } from "@/lib/utils";
import { Zap, AlertCircle, Landmark } from "lucide-react";

export function BalanceCard() {
    const { data } = useFinance();
    const [displayBalance, setDisplayBalance] = useState(0);

    useEffect(() => {
        if (!data) return;

        const start = displayBalance;
        const end = data.balance;
        const duration = 1000;
        const steps = 60;
        const stepDuration = duration / steps;
        const difference = end - start;

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            const progress = Math.min(currentStep / steps, 1);
            const easeOutValue = 1 - Math.pow(1 - progress, 3);
            setDisplayBalance(Math.floor(start + difference * easeOutValue));

            if (currentStep >= steps) {
                clearInterval(interval);
                setDisplayBalance(end);
            }
        }, stepDuration);

        return () => clearInterval(interval);
    }, [data?.balance]);

    if (!data) return null;

    const percentage = ((data.balance / data.initialBalance) * 100).toFixed(0);
    const spent = data.initialBalance - data.balance;
    const spentPercentage = ((spent / data.initialBalance) * 100).toFixed(1);

    // Daily Allowance Logic
    const startOfCurrentWeek = getWeeklyCycleStartDate().getTime();

    const weeklySpent = data.transactions
        .filter((tx) => new Date(tx.date).getTime() >= startOfCurrentWeek)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const spentToday = getSpentToday(data.transactions);
    const weeklySpentExcludingToday = weeklySpent - spentToday;
    const remainingWeeklyBudgetBeforeToday = Math.max(0, data.weeklyBudgetTarget - weeklySpentExcludingToday);
    const dailyAllowance = calculateDailyAllowance(remainingWeeklyBudgetBeforeToday, 'week');
    const remainingToday = dailyAllowance - spentToday;
    const isOverspentToday = remainingToday < 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all"
        >
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[13px] font-medium text-white/45 mb-1">Available Balance</p>
                    <p className="text-[11px] text-white/25 tracking-wide">Updated just now</p>
                </div>
                <div className="bg-[#7C5CFF]/15 border border-[#7C5CFF]/20 text-[#B983FF] rounded-full px-3 py-1 text-[11px] font-medium tracking-wide">
                    {percentage}% remaining
                </div>
            </div>

            <div className="text-5xl font-bold tracking-tight leading-none mb-2">
                <span className="text-2xl font-medium text-white/50 mr-2 align-middle">Rp</span>
                {displayBalance.toLocaleString("id-ID")}
            </div>

            <p className="text-xs text-white/30 mb-6 tracking-wide">
                Spent {spentPercentage}% of total budget
            </p>

            {/* Daily Allowance Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 relative overflow-hidden group">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.1em] mb-1.5 flex items-center gap-2">
                            <Zap size={12} className="text-[#B983FF]" />
                            Jatah Hari Ini
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-2xl font-bold tracking-tight ${isOverspentToday ? 'text-[#FF8E8E]' : 'text-white/90'}`}>
                                Rp {Math.abs(remainingToday).toLocaleString("id-ID")}
                            </p>
                            <span className="text-[11px] text-white/30 font-medium">/{dailyAllowance.toLocaleString("id-ID")}</span>
                        </div>
                        <p className={`text-[11px] mt-1.5 font-medium ${isOverspentToday ? 'text-[#FF8E8E]/80' : 'text-white/40'}`}>
                            {isOverspentToday
                                ? "Kamu overspend hari ini!"
                                : `Rp ${remainingToday.toLocaleString("id-ID")} sisa jatah aman hari ini`}
                        </p>
                    </div>
                    {isOverspentToday && (
                        <div className="bg-[#FF6B6B]/20 p-2 rounded-xl border border-[#FF6B6B]/30 animate-pulse">
                            <AlertCircle size={20} className="text-[#FF8E8E]" />
                        </div>
                    )}
                </div>

                {/* Progress bar for today */}
                {!isOverspentToday && dailyAllowance > 0 && (
                    <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (spentToday / dailyAllowance) * 100)}%` }}
                            className="h-full bg-gradient-to-r from-[#7C5CFF] to-[#B983FF]"
                        />
                    </div>
                )}
            </div>

            <div className="h-px bg-white/5 mb-6" />

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-xs text-white/40 mb-1">Initial Budget</p>
                    <p className="text-sm font-medium">Rp {data.initialBalance.toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-[#FF6B6B]/10 rounded-2xl p-4 border border-[#FF6B6B]/20">
                    <p className="text-xs text-white/40 mb-1">Total Spent</p>
                    <p className="text-sm font-medium text-[#FF8E8E]">Rp {spent.toLocaleString("id-ID")}</p>
                </div>
            </div>

            <div className="mt-3 bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10 flex justify-between items-center group/savings">
                <div>
                    <p className="text-[11px] text-emerald-400/60 uppercase tracking-widest font-semibold mb-0.5">Dana Darurat / Tabungan</p>
                    <p className="text-lg font-bold text-white/90">Rp {(data.savingsBalance || 0).toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-xl group-hover/savings:scale-110 transition-transform">
                    <Landmark className="text-emerald-400" size={18} />
                </div>
            </div>
        </motion.div>
    );
}
