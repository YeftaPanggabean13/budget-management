import { useState, useRef } from "react";
import { useFinance } from "@/lib/hooks/useFinance";
import { CATEGORIES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

export function QuickAddFAB() {
    const { addTransaction, data } = useFinance();
    const [isOpen, setIsOpen] = useState(false);
    const [amountInput, setAmountInput] = useState("");
    const [category, setCategory] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    if (!data) return null;

    const formatNumber = (val: string) => {
        const rawValue = val.replace(/\D/g, "");
        if (!rawValue) return "";
        return new Intl.NumberFormat("id-ID").format(parseInt(rawValue));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmountInput(formatNumber(e.target.value));
    };

    const handleSubmit = () => {
        const numericAmount = parseInt(amountInput.replace(/\D/g, ""), 10);
        if (!numericAmount || !category) {
            alert("Please enter amount and category");
            return;
        }

        if (numericAmount > data.balance) {
            if (!confirm("This exceeds your balance. Continue?")) {
                return;
            }
        }

        addTransaction(numericAmount, category);
        setAmountInput("");
        setCategory("");
        setIsOpen(false);
    };

    const filteredCategories = category
        ? CATEGORIES.filter(c => c.toLowerCase().includes(category.toLowerCase()))
        : CATEGORIES;

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-8 right-8 z-40 bg-gradient-to-br from-[#7C5CFF] to-[#B983FF] text-white border-none rounded-full w-14 h-14 shadow-[0_10px_30px_rgba(124,92,255,0.3)] flex items-center justify-center cursor-pointer transition-all hover:shadow-[0_15px_40px_rgba(124,92,255,0.5)]"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Plus size={24} strokeWidth={2.5} />
                </motion.div>
            </motion.button>

            {/* Quick Add Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-30"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed bottom-24 right-8 z-40 bg-[#0B0B0F] border border-white/10 rounded-3xl p-6 w-80 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm font-semibold text-white">Quick Add Expense</p>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                >
                                    <X size={16} className="text-white/60" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* Category */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Category"
                                        value={category}
                                        onChange={(e) => {
                                            setCategory(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
                                    />
                                    <AnimatePresence>
                                        {showSuggestions && filteredCategories.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A24] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 max-h-40 overflow-y-auto"
                                            >
                                                {filteredCategories.map(cat => (
                                                    <div
                                                        key={cat}
                                                        className="px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
                                                        onClick={() => {
                                                            setCategory(cat);
                                                            setShowSuggestions(false);
                                                            inputRef.current?.focus();
                                                        }}
                                                    >
                                                        {cat}
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Amount */}
                                <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Amount (Rp)"
                                    value={amountInput}
                                    onChange={handleAmountChange}
                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
                                />
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 px-4 py-2 bg-gradient-to-br from-[#7C5CFF] to-[#B983FF] text-white border-none rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Add
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
