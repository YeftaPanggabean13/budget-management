import { useFinance } from "@/lib/hooks/useFinance";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function WeeklyBudget() {
    const { data } = useFinance();

    if (!data) return null;

    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).setHours(0, 0, 0, 0);

    const weeklyBudget = data.weeklyBudgetTarget;
    const weeklySpent = data.transactions
        .filter((tx) => new Date(tx.date).getTime() >= startOfWeek)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const weeklyLeft = weeklyBudget - weeklySpent;
    const weeklyPercentLeft = Math.max(0, Math.min(100, (weeklyLeft / weeklyBudget) * 100));
    const isOverBudget = weeklyLeft < 0;
    const isDanger = weeklyPercentLeft < 25;

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all"
        >
            <div className="flex justify-between items-center mb-3">
                <span className="text-[13px] font-medium text-white/60">This Week's Budget</span>
                <span className={`text-[14px] font-semibold tracking-tight ${isOverBudget ? "text-[#FF6B6B]" : "text-white/90"}`}>
                    Rp {weeklyLeft.toLocaleString("id-ID")} left
                </span>
            </div>

            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${isOverBudget ? 100 : weeklyPercentLeft}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${isOverBudget
                            ? "bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] shadow-[0_0_20px_rgba(255,107,107,0.35)]"
                            : isDanger
                                ? "bg-gradient-to-r from-[#FF9A3C] to-[#FFB574] shadow-[0_0_20px_rgba(255,154,60,0.35)]"
                                : "bg-gradient-to-r from-[#7C5CFF] to-[#B983FF] shadow-[0_0_20px_rgba(124,92,255,0.35)]"
                        }`}
                />
            </div>

            <div className="flex justify-between text-[11px] text-white/30 tracking-wide">
                <span>Spent: Rp {weeklySpent.toLocaleString("id-ID")}</span>
                <span>Limit: Rp {weeklyBudget.toLocaleString("id-ID")}</span>
            </div>

            {isOverBudget && (
                <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-xl text-xs text-[#FF9090] font-medium">
                    <AlertTriangle size={14} />
                    <span>You've exceeded your weekly limit</span>
                </div>
            )}
        </motion.div>
    );
}
