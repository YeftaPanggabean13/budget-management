import { useState, useRef, useEffect } from "react";
import { useFinance } from "@/lib/hooks/useFinance";
import { CATEGORIES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

export function AddExpenseForm() {
    const { addTransaction, data } = useFinance();
    const [amountInput, setAmountInput] = useState("");
    const [category, setCategory] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const categoryRef = useRef<HTMLInputElement>(null);

    // Get category suggestions based on frequency
    const getFrequentCategories = () => {
        if (!data) return CATEGORIES;
        
        const categoryFreq: Record<string, number> = {};
        data.transactions.forEach(tx => {
            categoryFreq[tx.category] = (categoryFreq[tx.category] || 0) + 1;
        });

        return CATEGORIES.sort((a, b) => (categoryFreq[b] || 0) - (categoryFreq[a] || 0));
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to focus category
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                categoryRef.current?.focus();
            }
            // Cmd/Ctrl + Enter to submit
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [amountInput, category, data]);

    const formatNumber = (val: string) => {
        const rawValue = val.replace(/\D/g, "");
        if (!rawValue) return "";
        return new Intl.NumberFormat("id-ID").format(parseInt(rawValue));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmountInput(formatNumber(e.target.value));
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCategory(e.target.value);
        setHighlightedIndex(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || filteredCategories.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < filteredCategories.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case "Enter":
                e.preventDefault();
                selectCategory(filteredCategories[highlightedIndex]);
                break;
            case "Escape":
                e.preventDefault();
                setShowSuggestions(false);
                break;
        }
    };

    const selectCategory = (cat: string) => {
        setCategory(cat);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!data) return;

        const numericAmount = parseInt(amountInput.replace(/\D/g, ""), 10);
        if (!numericAmount || !category) {
            alert("Please enter a valid amount and select a category.");
            return;
        }

        if (numericAmount > data.balance) {
            if (!confirm("This expense exceeds your available balance. Proceed anyway?")) {
                return;
            }
        }

        addTransaction(numericAmount, category);
        setAmountInput("");
        setCategory("");
        setShowSuggestions(false);
        setHighlightedIndex(0);
    };

    const frequentCategories = getFrequentCategories();
    const filteredCategories = category
        ? frequentCategories.filter(c => c.toLowerCase().includes(category.toLowerCase()))
        : frequentCategories.slice(0, 5); // Show top 5 frequent on initial focus

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            whileHover={{ y: -2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all relative z-20"
        >
            <p className="text-[16px] font-medium text-white/85 mb-4 tracking-tight">Add Expense</p>

            <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap items-center relative">
                <div className="flex-1 min-w-[120px] relative">
                    <input
                        ref={categoryRef}
                        type="text"
                        placeholder="Category (⌘K)"
                        value={category}
                        onChange={handleCategoryChange}
                        onKeyDown={handleKeyDown}
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
                                className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A24] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 max-h-48 overflow-y-auto"
                            >
                                {filteredCategories.map((cat, idx) => (
                                    <div
                                        key={cat}
                                        className={`px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                            idx === highlightedIndex
                                                ? "bg-[#7C5CFF]/30 text-white"
                                                : "text-white/70 hover:bg-white/5 hover:text-white"
                                        }`}
                                        onClick={() => selectCategory(cat)}
                                    >
                                        {cat}
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 min-w-[140px]">
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

                <button
                    type="submit"
                    className="bg-gradient-to-br from-[#7C5CFF] to-[#B983FF] hover:opacity-90 active:scale-95 text-white border-none rounded-2xl px-6 py-3 text-sm font-semibold tracking-tight transition-all flex items-center gap-2 whitespace-nowrap"
                    title="Ctrl+Enter to submit"
                >
                    <Plus size={16} strokeWidth={2.5} /> Add
                </button>
            </form>

            {/* Keyboard hints */}
            <div className="flex gap-2 mt-3 text-[10px] text-white/30">
                <span>↑↓ Navigate</span>
                <span>•</span>
                <span>Enter Submit</span>
                <span>•</span>
                <span>⌘K Focus</span>
            </div>
        </motion.div>
    );
}
