import { useState, useEffect } from "react";
import { useFinance, Transaction } from "@/lib/hooks/useFinance";
import { CATEGORIES, getCategoryColor } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function EditTransactionModal({
    transaction,
    onClose,
}: {
    transaction: Transaction;
    onClose: () => void;
}) {
    const { editTransaction } = useFinance();
    const [amountInput, setAmountInput] = useState("");
    const [category, setCategory] = useState(transaction.category);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    useEffect(() => {
        setAmountInput(transaction.amount.toLocaleString("id-ID"));
    }, [transaction]);

    const formatNumber = (val: string) => {
        const rawValue = val.replace(/\D/g, "");
        if (!rawValue) return "";
        return new Intl.NumberFormat("id-ID").format(parseInt(rawValue));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmountInput(formatNumber(e.target.value));
    };

    const handleSave = () => {
        const numericAmount = parseInt(amountInput.replace(/\D/g, ""), 10);
        if (!numericAmount || !category) {
            alert("Please enter a valid amount and select a category.");
            return;
        }

        editTransaction(transaction.id, {
            amount: numericAmount,
            category: category,
        });
        onClose();
    };

    const filteredCategories = category
        ? CATEGORIES.filter(c => c.toLowerCase().includes(category.toLowerCase()))
        : CATEGORIES;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0B0B0F] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white">Edit Transaction</h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-white/60" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Category */}
                        <div className="relative">
                            <label className="block text-xs font-medium text-white/40 tracking-[0.06em] uppercase mb-2">
                                Category
                            </label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => {
                                    setCategory(e.target.value);
                                    setShowCategoryDropdown(true);
                                }}
                                onFocus={() => setShowCategoryDropdown(true)}
                                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
                            />
                            <AnimatePresence>
                                {showCategoryDropdown && filteredCategories.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A24] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 max-h-48 overflow-y-auto"
                                    >
                                        {filteredCategories.map(cat => (
                                            <div
                                                key={cat}
                                                className="px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
                                                onClick={() => {
                                                    setCategory(cat);
                                                    setShowCategoryDropdown(false);
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
                        <div>
                            <label className="block text-xs font-medium text-white/40 tracking-[0.06em] uppercase mb-2">
                                Amount (Rp)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={amountInput}
                                onChange={handleAmountChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-medium text-white/40 tracking-[0.06em] uppercase mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                defaultValue={transaction.date.split("T")[0]}
                                onChange={(e) => {
                                    editTransaction(transaction.id, {
                                        date: new Date(e.target.value).toISOString(),
                                    });
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors tracking-tight"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-3 bg-gradient-to-br from-[#7C5CFF] to-[#B983FF] text-white border-none rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity tracking-tight"
                        >
                            Save Changes
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
