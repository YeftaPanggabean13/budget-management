import { useFinance } from "@/lib/hooks/useFinance";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line } from "recharts";
import { CATEGORIES, getCategoryColor } from "@/lib/constants";
import { format, subDays, isSameDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, differenceInDays, startOfDay } from "date-fns";
import { TrendingUp, AlertCircle, Zap, ChevronRight, ChevronDown, Coins, TrendingDown, Landmark } from "lucide-react";

import { useState } from "react";
import { getCycleStartDate, getCycleEndDate, calculateSpendingVelocity, predictEndOfCycleBalance } from "@/lib/utils";

// Apple-like vibrant category colors
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD", "#D4A5A5", "#9B59B6", "#3498DB", "#E67E22", "#95A5A6"];

export function InsightsPanel() {
    const { data } = useFinance();
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

    if (!data || data.transactions.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center justify-center min-h-[300px]"
            >
                <p className="text-white/40 text-sm">Add transactions to see insights</p>
            </motion.div>
        );
    }

    // 1. Prepare Category Data for Pie Chart
    const categoryTotals: Record<string, number> = {};
    data.transactions.forEach(tx => {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });

    const pieData = Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 categories

    // 2. Prepare Last 7 Days Data for Bar Chart
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        return {
            date: d,
            displayDate: format(d, "EEE"),
            amount: 0
        };
    });

    data.transactions.forEach(tx => {
        const txDate = parseISO(tx.date);
        const day = last7Days.find(d => isSameDay(d.date, txDate));
        if (day) {
            day.amount += tx.amount;
        }
    });

    // 3. Weekly budget analysis
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).setHours(0, 0, 0, 0);
    const weeklyBudget = data.weeklyBudgetTarget;
    const weeklySpent = data.transactions
        .filter((tx) => new Date(tx.date).getTime() >= startOfCurrentWeek)
        .reduce((sum, tx) => sum + tx.amount, 0);
    const weeklyPercentage = Math.round((weeklySpent / weeklyBudget) * 100);

    // 4. Spending velocity (early week warning)
    const daysIntoWeek = dayOfWeek + 1;
    const expectedDailyAverage = weeklyBudget / 7;
    const expectedSpentByNow = expectedDailyAverage * daysIntoWeek;
    const spendingPace = weeklySpent / expectedSpentByNow;

    // 5. Category trend (compare this week vs last week)
    const lastWeekStart = new Date(startOfCurrentWeek - 7 * 24 * 60 * 60 * 1000);
    const lastWeekSpent = data.transactions
        .filter((tx) => {
            const txTime = new Date(tx.date).getTime();
            return txTime >= lastWeekStart.getTime() && txTime < startOfCurrentWeek;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

    // 6. Monthly analysis
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthlySpent = data.transactions
        .filter((tx) => {
            const txDate = parseISO(tx.date);
            return txDate >= monthStart && txDate <= monthEnd;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
    const monthlyBudget = data.initialBalance;
    const monthlyPercentage = Math.round((monthlySpent / monthlyBudget) * 100);

    // 7. Money Forecasting (Professional Feature)
    const cycleStart = getCycleStartDate(now);
    const cycleEnd = getCycleEndDate(now);
    const velocity = calculateSpendingVelocity(data.transactions);
    const predictedBalance = predictEndOfCycleBalance(data.balance, velocity, cycleEnd);
    const diffFromInitial = predictedBalance - data.initialBalance;
    const isForecastPositive = predictedBalance >= 0;

    // 8. Savings & Emergency Fund Recommendation
    const currentWeekSurplus = weeklyBudget - weeklySpent;
    const savingsRecommendation = currentWeekSurplus > 0 ? Math.floor(currentWeekSurplus * 0.5) : 0;

    // 9. Top category
    const topCategory = pieData.length > 0 ? pieData[0] : null;

    // 10. Weekly Cycle Breakdown (Specific requirement)

    const weeks = [0, 1, 2, 3].map(weekIdx => {
        const weekStart = addWeeks(cycleStart, weekIdx);
        const weekEnd = addWeeks(weekStart, 1);
        const actualEnd = weekEnd > cycleEnd ? cycleEnd : weekEnd;

        // Group transactions for this specific week
        const weekTransactions = data.transactions.filter(tx => {
            const txDate = parseISO(tx.date);
            return txDate >= weekStart && txDate < actualEnd;
        });

        const totalSpent = weekTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        // Calculate category breakdown for this week
        const categoryBreakdown: Record<string, number> = {};
        weekTransactions.forEach(tx => {
            categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
        });

        const sortedCategories = Object.entries(categoryBreakdown)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

        return {
            index: weekIdx + 1,
            label: `Week ${weekIdx + 1}`,
            start: weekStart,
            end: actualEnd,
            total: totalSpent,
            categories: sortedCategories,
            isCurrent: now >= weekStart && now < actualEnd
        };
    });

    const weeklyBreakdownData = weeks.map(w => ({
        name: w.label,
        amount: w.total,
        isCurrent: w.isCurrent
    }));

    // Calculate smart insights
    const insights = [];

    if (weeklyPercentage > 100) {
        insights.push({
            icon: AlertCircle,
            type: "danger",
            text: `You exceeded your weekly budget by ${Math.round(weeklyPercentage - 100)}%`,
            color: "#FF6B6B"
        });
    }

    if (predictedBalance < 500000 && predictedBalance > 0) {
        insights.push({
            icon: TrendingDown,
            type: "warning",
            text: `Waspada! Saldo akhir bulan diprediksi menipis (Rp ${Math.floor(predictedBalance).toLocaleString("id-ID")})`,
            color: "#FFB043"
        });
    } else if (predictedBalance <= 0) {
        insights.push({
            icon: AlertCircle,
            type: "danger",
            text: `Peringatan: Saldo diprediksi HABIS sebelum tanggal 3!`,
            color: "#FF6B6B"
        });
    }

    if (savingsRecommendation > 200000) {
        insights.push({
            icon: Landmark,
            type: "success",
            text: `Hebat! Kamu bisa menyisihkan Rp ${savingsRecommendation.toLocaleString("id-ID")} ke Dana Darurat minggu ini.`,
            color: "#4ECDC4"
        });
    }

    if (spendingPace > 1.1) {
        insights.push({
            icon: TrendingUp,
            type: "warning",
            text: `Spending ${Math.round((spendingPace - 1) * 100)}% faster than planned`,
            color: "#FFB043"
        });
    }

    if (weeklySpent > lastWeekSpent && lastWeekSpent > 0) {
        const increase = Math.round(((weeklySpent - lastWeekSpent) / lastWeekSpent) * 100);
        insights.push({
            icon: TrendingUp,
            type: "info",
            text: `Spending up ${increase}% vs last week`,
            color: "#4ECDC4"
        });
    }

    if (topCategory) {
        const topCategoryPercentage = Math.round((topCategory.value / weeklySpent) * 100);
        insights.push({
            icon: Zap,
            type: "info",
            text: `${topCategory.name} is ${topCategoryPercentage}% of spending`,
            color: getCategoryColor(topCategory.name).bg
        });
    }

    // Daily Allowance Insights
    const dailyAllowance = Math.floor(data.weeklyBudgetTarget / 7);
    const spentToday = data.transactions
        .filter(tx => isSameDay(parseISO(tx.date), new Date()))
        .reduce((sum, tx) => sum + tx.amount, 0);

    if (spentToday > dailyAllowance && dailyAllowance > 0) {
        insights.unshift({
            icon: AlertCircle,
            type: "danger",
            text: `Kamu sudah melewati jatah harian (Over Rp ${(spentToday - dailyAllowance).toLocaleString("id-ID")})`,
            color: "#FF6B6B"
        });
    } else if (spentToday > dailyAllowance * 0.8 && dailyAllowance > 0) {
        insights.unshift({
            icon: Zap,
            type: "warning",
            text: "Hampir mencapai batas jatah harian. Hemat sisa hari ini!",
            color: "#FFB043"
        });
    } else if (spentToday === 0 && dailyAllowance > 0) {
        insights.unshift({
            icon: Zap,
            type: "success",
            text: `Belum ada pengeluaran hari ini. Jatah aman: Rp ${dailyAllowance.toLocaleString("id-ID")}`,
            color: "#4ECDC4"
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ y: -2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all flex flex-col gap-6"
        >
            <div className="flex justify-between items-center">
                <p className="text-[16px] font-medium text-white/85 tracking-tight">Smart Insights</p>
            </div>

            {/* Smart Insights Cards */}
            <div className="space-y-2">
                {insights.map((insight, i) => {
                    const IconComponent = insight.icon;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.05 }}
                            className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3"
                        >
                            <div className="shrink-0 mt-1">
                                <IconComponent size={16} style={{ color: insight.color }} />
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed">{insight.text}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Professional Forecasting & Savings Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-white/40 mb-1">
                        <TrendingUp size={14} />
                        <p className="text-[10px] uppercase tracking-wider font-semibold">Forecast Akhir Bulan</p>
                    </div>
                    <p className={`text-xl font-bold ${isForecastPositive ? 'text-white/90' : 'text-red-400'}`}>
                        Rp {Math.floor(predictedBalance).toLocaleString("id-ID")}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${isForecastPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isForecastPositive ? 'Aman' : 'Overbudget'}
                        </div>
                        <p className="text-[10px] text-white/30">Hingga Tgl 3</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-white/40 mb-1">
                        <Landmark size={14} />
                        <p className="text-[10px] uppercase tracking-wider font-semibold">Tabungan (Dana Darurat)</p>
                    </div>
                    <p className="text-xl font-bold text-white/90">
                        Rp {(data.savingsBalance || 0).toLocaleString("id-ID")}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400">
                            Professional Goal
                        </div>
                        <p className="text-[10px] text-white/30">Pemisahan Dana</p>
                    </div>
                </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Weekly Breakdown Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Weekly Spending Breakdown</p>
                </div>

                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyBreakdownData}>
                            <XAxis
                                dataKey="name"
                                stroke="rgba(255,255,255,0.2)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const weekIdx = weeklyBreakdownData.findIndex(d => d.name === payload[0].payload.name);
                                        const week = weeks[weekIdx];
                                        return (
                                            <div className="bg-[#1A1A24] border border-white/10 p-3 rounded-xl shadow-xl">
                                                <p className="text-[10px] text-white/40 mb-1">{format(week.start, "MMM d")} - {format(week.end, "MMM d")}</p>
                                                <p className="text-sm font-bold text-white">Rp {payload[0].value?.toLocaleString("id-ID")}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="amount"
                                radius={[6, 6, 0, 0]}
                                onClick={(data: any, index: number) => setExpandedWeek(expandedWeek === index ? null : index)}
                            >
                                {weeklyBreakdownData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.isCurrent ? "#7C5CFF" : "rgba(124, 92, 255, 0.3)"}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    {weeks.map((week, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all">
                            <button
                                onClick={() => setExpandedWeek(expandedWeek === idx ? null : idx)}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${week.isCurrent ? 'bg-[#7C5CFF] shadow-[0_0_8px_#7C5CFF]' : 'bg-white/20'}`} />
                                    <div className="text-left">
                                        <p className="text-xs font-medium text-white/90">{week.label}</p>
                                        <p className="text-[10px] text-white/40">{format(week.start, "d MMM")} - {format(week.end, "d MMM")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-xs font-semibold text-white/80">Rp {week.total.toLocaleString("id-ID")}</p>
                                    {expandedWeek === idx ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
                                </div>
                            </button>

                            {expandedWeek === idx && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2"
                                >
                                    {week.categories.length > 0 ? (
                                        week.categories.map((cat, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(cat.name).bg }} />
                                                    <p className="text-[10px] text-white/60">{cat.name}</p>
                                                </div>
                                                <p className="text-[10px] font-medium text-white/80">Rp {cat.amount.toLocaleString("id-ID")}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-white/30 text-center py-1">No transactions this week</p>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="h-[200px] relative">
                    <p className="text-xs text-white/50 text-center mb-2">Spending by Category</p>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number | undefined) => value ? `Rp ${value.toLocaleString("id-ID")}` : ""}
                                contentStyle={{ backgroundColor: "#1A1A24", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px" }}
                                itemStyle={{ color: "#fff" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div className="h-[200px] relative">
                    <p className="text-xs text-white/50 text-center mb-2">Last 7 Days</p>
                    <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={last7Days}>
                            <XAxis dataKey="displayDate" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                formatter={(value: number | undefined) => value ? `Rp ${value.toLocaleString("id-ID")}` : ""}
                                contentStyle={{ backgroundColor: "#1A1A24", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px" }}
                                itemStyle={{ color: "#fff" }}
                            />
                            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                {last7Days.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.amount > 0 ? "url(#colorUv)" : "transparent"} />
                                ))}
                            </Bar>
                            <defs>
                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#B983FF" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </motion.div>
    );
}
