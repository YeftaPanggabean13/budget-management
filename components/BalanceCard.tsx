import { useFinance } from "@/lib/hooks/useFinance";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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
        </motion.div>
    );
}
