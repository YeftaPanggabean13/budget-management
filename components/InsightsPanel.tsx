import { useFinance } from "@/lib/hooks/useFinance";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line } from "recharts";
import { CATEGORIES, getCategoryColor } from "@/lib/constants";
import { format, subDays, isSameDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { TrendingUp, AlertCircle, Zap } from "lucide-react";

// Apple-like vibrant category colors
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD", "#D4A5A5", "#9B59B6", "#3498DB", "#E67E22", "#95A5A6"];

export function InsightsPanel() {
    const { data } = useFinance();

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

    // 7. Top category
    const topCategory = pieData.length > 0 ? pieData[0] : null;

    // Calculate smart insights
    const insights = [];
    
    if (weeklyPercentage > 100) {
        insights.push({
            icon: AlertCircle,
            type: "danger",
            text: `You exceeded your weekly budget by ${Math.round(weeklyPercentage - 100)}%`,
            color: "#FF6B6B"
        });
    } else if (weeklyPercentage >= 80) {
        insights.push({
            icon: AlertCircle,
            type: "warning",
            text: `You've spent ${weeklyPercentage}% of weekly budget`,
            color: "#FFB043"
        });
    } else {
        insights.push({
            icon: Zap,
            type: "normal",
            text: `${100 - weeklyPercentage}% of weekly budget remaining`,
            color: "#7C5CFF"
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

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">This Week</p>
                    <p className="text-sm font-semibold text-white/90">Rp {weeklySpent.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] text-white/30 mt-1">{weeklyPercentage}% of budget</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">This Month</p>
                    <p className="text-sm font-semibold text-white/90">Rp {monthlySpent.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] text-white/30 mt-1">{monthlyPercentage}% of budget</p>
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
