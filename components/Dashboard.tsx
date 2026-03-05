"use client";

import { useFinance } from "@/lib/hooks/useFinance";
import { BalanceCard } from "./BalanceCard";
import { WeeklyBudget } from "./WeeklyBudget";
import { AddExpenseForm } from "./AddExpenseForm";
import { TransactionList } from "./TransactionList";
import { InsightsPanel } from "./InsightsPanel";
import { MonthlyHistory } from "./MonthlyHistory";
import { QuickAddFAB } from "./QuickAddFAB";
import { CategoryBudgetManager } from "./CategoryBudgetManager";
import { RecurringExpenseManager } from "./RecurringExpenseManager";
import { motion } from "framer-motion";
import { useState } from "react";
import { Settings } from "lucide-react";

export function Dashboard() {
    const { data, resetData } = useFinance();
    const [showCategoryBudgets, setShowCategoryBudgets] = useState(false);
    const [showRecurring, setShowRecurring] = useState(false);

    const exportCSV = () => {
        if (!data) return;
        const rows = [["Tanggal", "Kategori", "Jumlah"], ...data.transactions.map((tx) => [tx.date, tx.category, tx.amount])];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "transaksi.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <>
            <div className="relative z-10 max-w-[1400px] w-full mx-auto px-4 py-8 md:py-16 md:px-8 flex flex-col gap-6">

                {/* HEADER SECTION */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-end mb-4"
                >
                    <div>
                        <p className="text-xs font-medium tracking-[0.12em] uppercase text-white/35 mb-1.5">My Money</p>
                        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight text-white/95">
                            Wealth Overview
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/50 tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF] animate-pulse" />
                        Live
                    </div>
                </motion.div>

                {/* TOP ROW: Balance + Budget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <BalanceCard />
                    <div className="flex flex-col gap-6">
                        <WeeklyBudget />
                        <AddExpenseForm />
                    </div>
                </div>

                {/* MIDDLE ROW: Insights + Activity + Monthly */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                    <div className="md:col-span-7">
                        <InsightsPanel />
                    </div>
                    <div className="md:col-span-5 h-[500px] md:h-auto">
                        <TransactionList />
                    </div>
                </div>

                {/* BOTTOM ROW: Monthly History */}
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative z-10"
                >
                    <MonthlyHistory />
                </motion.div>

                {/* FOOTER ACTIONS */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap justify-end gap-3 mt-4"
                >
                    <button
                        onClick={() => setShowCategoryBudgets(true)}
                        className="px-5 py-3 bg-white/5 border border-white/10 rounded-[14px] text-white/60 text-[13px] font-medium hover:bg-white/10 hover:text-white transition-colors tracking-tight flex items-center gap-2"
                    >
                        <Settings size={14} /> Category Budgets
                    </button>
                    <button
                        onClick={() => setShowRecurring(true)}
                        className="px-5 py-3 bg-white/5 border border-white/10 rounded-[14px] text-white/60 text-[13px] font-medium hover:bg-white/10 hover:text-white transition-colors tracking-tight flex items-center gap-2"
                    >
                        <Settings size={14} /> Subscriptions
                    </button>
                    <button
                        onClick={exportCSV}
                        className="px-5 py-3 bg-white/5 border border-white/10 rounded-[14px] text-white/60 text-[13px] font-medium hover:bg-white/10 hover:text-white transition-colors tracking-tight"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={() => {
                            if (confirm("Reset all data? This cannot be undone.")) resetData();
                        }}
                        className="px-5 py-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-[14px] text-[#FF8E8E] text-[13px] font-medium hover:bg-[#FF6B6B]/20 transition-colors tracking-tight"
                    >
                        Reset Data
                    </button>
                </motion.div>
            </div>

            {/* Floating Action Button */}
            <QuickAddFAB />

            {/* Modals */}
            {showCategoryBudgets && (
                <CategoryBudgetManager onClose={() => setShowCategoryBudgets(false)} />
            )}
            {showRecurring && (
                <RecurringExpenseManager onClose={() => setShowRecurring(false)} />
            )}
        </>
    );
}
