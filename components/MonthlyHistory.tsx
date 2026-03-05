import { useFinance } from "@/lib/hooks/useFinance";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";

export function MonthlyHistory() {
    const { data } = useFinance();

    if (!data) return null;

    // Get last 4 months
    const months = Array.from({ length: 4 }, (_, i) => {
        const date = subMonths(new Date(), 3 - i);
        return {
            date,
            startDate: startOfMonth(date),
            endDate: endOfMonth(date),
            displayMonth: format(date, "MMM yyyy"),
        };
    });

    const monthlyData = months.map(month => {
        const spent = data.transactions
            .filter(tx => {
                const txDate = parseISO(tx.date);
                return txDate >= month.startDate && txDate <= month.endDate;
            })
            .reduce((sum, tx) => sum + tx.amount, 0);

        const percentage = Math.round((spent / data.initialBalance) * 100);
        return {
            ...month,
            spent,
            percentage,
        };
    });

    const currentMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];
    const spentTrend = currentMonth && previousMonth 
        ? Math.round(((currentMonth.spent - previousMonth.spent) / previousMonth.spent) * 100)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            whileHover={{ y: -2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all"
        >
            <div className="mb-6">
                <p className="text-[16px] font-medium text-white/85 tracking-tight mb-1">Monthly Overview</p>
                <p className="text-xs text-white/40">Spending trends over time</p>
            </div>

            <div className="space-y-3">
                {monthlyData.map((month, i) => {
                    const isCurrentMonth = i === monthlyData.length - 1;
                    return (
                        <motion.div
                            key={month.displayMonth}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.05 }}
                            className={`${isCurrentMonth ? "bg-[#7C5CFF]/15 border-[#7C5CFF]/30" : "bg-white/5 border-white/10"} border rounded-2xl p-4 transition-colors`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className={`text-sm font-medium ${isCurrentMonth ? "text-white" : "text-white/85"}`}>
                                        {month.displayMonth}
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">
                                        Rp {month.spent.toLocaleString("id-ID")}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-semibold ${month.percentage > 100 ? "text-[#FF6B6B]" : "text-white/90"}`}>
                                        {month.percentage}%
                                    </p>
                                    {i === monthlyData.length - 1 && spentTrend !== 0 && (
                                        <p className={`text-xs mt-1 ${spentTrend > 0 ? "text-[#FFB043]" : "text-green-400"}`}>
                                            {spentTrend > 0 ? "↑" : "↓"} {Math.abs(spentTrend)}% vs last
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, month.percentage)}%` }}
                                    transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                                    className={`h-full rounded-full ${
                                        month.percentage > 100
                                            ? "bg-[#FF6B6B]"
                                            : month.percentage > 80
                                            ? "bg-[#FFB043]"
                                            : "bg-[#7C5CFF]"
                                    }`}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Budget Summary */}
            <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs font-medium text-white/40 tracking-[0.06em] uppercase mb-3">Summary</p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Avg Monthly</p>
                        <p className="text-sm font-semibold text-white/90">
                            Rp {Math.round(monthlyData.reduce((sum, m) => sum + m.spent, 0) / monthlyData.length).toLocaleString("id-ID")}
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Total (4mo)</p>
                        <p className="text-sm font-semibold text-white/90">
                            Rp {monthlyData.reduce((sum, m) => sum + m.spent, 0).toLocaleString("id-ID")}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
