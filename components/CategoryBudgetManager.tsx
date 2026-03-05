import { useState } from "react";
import { useFinance } from "@/lib/hooks/useFinance";
import { CATEGORIES, getCategoryIcon, getCategoryColor } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";

export function CategoryBudgetManager({
    onClose,
}: {
    onClose: () => void;
}) {
    const { data, setCategoryBudget } = useFinance();
    const [newCategory, setNewCategory] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    if (!data) return null;

    const formatNumber = (val: string) => {
        const rawValue = val.replace(/\D/g, "");
        if (!rawValue) return "";
        return new Intl.NumberFormat("id-ID").format(parseInt(rawValue));
    };

    const handleAddBudget = () => {
        const numericAmount = parseInt(newAmount.replace(/\D/g, ""), 10);
        if (!numericAmount || !newCategory) {
            alert("Please enter a valid category and amount");
            return;
        }
        setCategoryBudget(newCategory, numericAmount);
        setNewCategory("");
        setNewAmount("");
    };

    const filteredCategories = newCategory
        ? CATEGORIES.filter(c => c.toLowerCase().includes(newCategory.toLowerCase()))
        : CATEGORIES;

    const categorySpending: Record<string, number> = {};
    data.transactions.forEach(tx => {
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + tx.amount;
    });

    return (
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
                className="bg-[#0B0B0F] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#0B0B0F] pb-4">
                    <h2 className="text-xl font-semibold text-white">Category Budgets</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Add New Budget */}
                <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                    <label className="block text-xs font-medium text-white/40 tracking-[0.06em] uppercase">
                        Add Category Budget
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Select category"
                            value={newCategory}
                            onChange={(e) => {
                                setNewCategory(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
                        />
                        <AnimatePresence>
                            {showDropdown && filteredCategories.length > 0 && (
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
                                                setNewCategory(cat);
                                                setShowDropdown(false);
                                            }}
                                        >
                                            {cat}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Budget amount (Rp)"
                        value={newAmount}
                        onChange={(e) => setNewAmount(formatNumber(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
                    />

                    <button
                        onClick={handleAddBudget}
                        className="w-full px-4 py-3 bg-gradient-to-br from-[#7C5CFF] to-[#B983FF] text-white border-none rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity tracking-tight flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add Budget
                    </button>
                </div>

                {/* Existing Budgets */}
                <div className="space-y-3">
                    <p className="text-xs font-medium text-white/40 tracking-[0.06em] uppercase">Your Budgets</p>
                    {data.categoryBudgets.length === 0 ? (
                        <p className="text-xs text-white/30 py-4">No category budgets set. Add one above!</p>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {data.categoryBudgets.map((budget, i) => {
                                const spent = categorySpending[budget.category] || 0;
                                const percentage = Math.min(100, Math.round((spent / budget.amount) * 100));
                                const categoryColor = getCategoryColor(budget.category);

                                return (
                                    <motion.div
                                        key={budget.category}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="bg-white/5 border border-white/10 rounded-2xl p-3"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getCategoryIcon(budget.category)}</span>
                                                <div>
                                                    <p className="text-sm font-medium text-white/90">{budget.category}</p>
                                                    <p className="text-xs text-white/40">
                                                        Rp {spent.toLocaleString("id-ID")} / Rp {budget.amount.toLocaleString("id-ID")}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    // Delete functionality would go here
                                                }}
                                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                            >
                                                <Trash2 size={14} className="text-white/40 hover:text-[#FF8E8E]" />
                                            </button>
                                        </div>

                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                                className={`h-full rounded-full ${
                                                    percentage > 100
                                                        ? "bg-[#FF6B6B]"
                                                        : percentage > 80
                                                        ? "bg-[#FFB043]"
                                                        : "bg-[#7C5CFF]"
                                                }`}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
