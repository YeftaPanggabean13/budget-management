import { useState } from "react";
import { useFinance } from "@/lib/hooks/useFinance";
import { CATEGORIES, getCategoryIcon } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";

export function RecurringExpenseManager({
    onClose,
}: {
    onClose: () => void;
}) {
    const { data, addRecurringExpense, deleteRecurringExpense } = useFinance();
    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [newDay, setNewDay] = useState("1");
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    if (!data) return null;

    const formatNumber = (val: string) => {
        const rawValue = val.replace(/\D/g, "");
        if (!rawValue) return "";
        return new Intl.NumberFormat("id-ID").format(parseInt(rawValue));
    };

    const handleAddRecurring = () => {
        const numericAmount = parseInt(newAmount.replace(/\D/g, ""), 10);
        const day = parseInt(newDay);

        if (!numericAmount || !newCategory || !newName || day < 1 || day > 31) {
            alert("Please enter valid details");
            return;
        }

        addRecurringExpense({
            name: newName,
            category: newCategory,
            amount: numericAmount,
            dayOfMonth: day,
        });

        setNewName("");
        setNewCategory("");
        setNewAmount("");
        setNewDay("1");
    };

    const filteredCategories = newCategory
        ? CATEGORIES.filter(c => c.toLowerCase().includes(newCategory.toLowerCase()))
        : CATEGORIES;

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
                    <h2 className="text-xl font-semibold text-white">Recurring Expenses</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Add New Recurring */}
                <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                    <label className="block text-xs font-medium text-white/40 tracking-[0.06em] uppercase">
                        Add Recurring Expense
                    </label>

                    <input
                        type="text"
                        placeholder="Name (e.g. Netflix)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
                    />

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Category"
                            value={newCategory}
                            onChange={(e) => {
                                setNewCategory(e.target.value);
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
                                    className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A24] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 max-h-40 overflow-y-auto"
                                >
                                    {filteredCategories.map(cat => (
                                        <div
                                            key={cat}
                                            className="px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
                                            onClick={() => {
                                                setNewCategory(cat);
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

                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Amount (Rp)"
                        value={newAmount}
                        onChange={(e) => setNewAmount(formatNumber(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all placeholder:text-white/20"
                    />

                    <div>
                        <label className="block text-xs text-white/40 mb-2">Day of month</label>
                        <select
                            value={newDay}
                            onChange={(e) => setNewDay(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-4 py-3 outline-none focus:border-[#7C5CFF]/60 focus:bg-[#7C5CFF]/10 focus:ring-4 focus:ring-[#7C5CFF]/10 transition-all"
                        >
                            {Array.from({ length: 31 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {i + 1}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleAddRecurring}
                        className="w-full px-4 py-3 bg-gradient-to-br from-[#7C5CFF] to-[#B983FF] text-white border-none rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity tracking-tight flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add Recurring
                    </button>
                </div>

                {/* Existing Recurring */}
                <div className="space-y-3">
                    <p className="text-xs font-medium text-white/40 tracking-[0.06em] uppercase">Subscriptions</p>
                    {data.recurringExpenses.length === 0 ? (
                        <p className="text-xs text-white/30 py-4">No recurring expenses. Add one above!</p>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {data.recurringExpenses.map((expense) => (
                                <motion.div
                                    key={expense.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-between items-start"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm">{getCategoryIcon(expense.category)}</span>
                                            <p className="text-sm font-medium text-white/90">{expense.name}</p>
                                        </div>
                                        <p className="text-xs text-white/40">
                                            Rp {expense.amount.toLocaleString("id-ID")} on day {expense.dayOfMonth}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => deleteRecurringExpense(expense.id)}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                    >
                                        <Trash2 size={14} className="text-white/40 hover:text-[#FF8E8E]" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
