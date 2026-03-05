import { useState } from "react";
import { useFinance } from "@/lib/hooks/useFinance";
import { getCategoryIcon, getCategoryColor } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Edit2, Calendar } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { EditTransactionModal } from "./EditTransactionModal";

export function TransactionList() {
    const { data, deleteTransaction } = useFinance();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [editingTransaction, setEditingTransaction] = useState<number | null>(null);

    if (!data) return null;

    const filteredTransactions = data.transactions.filter(tx => {
        const matchesSearch = tx.category.toLowerCase().includes(searchTerm.toLowerCase());
        if (filterDate) {
            return matchesSearch && isSameDay(parseISO(tx.date), parseISO(filterDate));
        }
        return matchesSearch;
    });

    const editingTx = editingTransaction ? data.transactions.find(t => t.id === editingTransaction) : null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all flex flex-col h-full min-h-[400px]"
            >
                <div className="flex justify-between items-center mb-6">
                    <p className="text-[16px] font-medium text-white/85 tracking-tight">Activity</p>
                    {data.transactions.length > 0 && (
                        <span className="text-[11px] text-white/30 tracking-wide bg-white/5 px-3 py-1 rounded-full">
                            {filteredTransactions.length} entries
                        </span>
                    )}
                </div>

                {data.transactions.length > 0 && (
                    <div className="flex gap-2 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                            <input
                                type="text"
                                placeholder="Search category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#7C5CFF]/60 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-2 text-xs text-white outline-none focus:border-[#7C5CFF]/60 transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
                            />
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                    {filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center text-white/35">
                            <span className="text-3xl mb-3 grayscale opacity-50">🪞</span>
                            <p className="text-sm font-medium">No transactions found</p>
                            {data.transactions.length === 0 ? (
                                <p className="text-xs text-white/20 mt-1">Add your first expense above</p>
                            ) : (
                                <p className="text-xs text-white/20 mt-1">Try a different search term</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <AnimatePresence mode="popLayout">
                                {filteredTransactions.map((tx, i) => {
                                    const categoryColor = getCategoryColor(tx.category);
                                    return (
                                        <motion.div
                                            key={tx.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                            transition={{ duration: 0.2, delay: i * 0.03 }}
                                            className="group relative overflow-hidden rounded-[18px]"
                                        >
                                            <div className="absolute right-0 top-0 bottom-0 w-24 bg-[#FF6B6B]/20 flex items-center justify-end pr-5 z-0">
                                                <Trash2 size={16} className="text-[#FF8E8E]" />
                                            </div>

                                            <motion.div
                                                drag="x"
                                                dragConstraints={{ left: -80, right: 0 }}
                                                dragElastic={0.1}
                                                onDragEnd={(e, info) => {
                                                    if (info.offset.x < -50) {
                                                        deleteTransaction(tx.id);
                                                    }
                                                }}
                                                className="relative z-10 flex justify-between items-center py-3.5 px-4 bg-[#1E1E26] border border-white/5 rounded-[18px] transition-colors hover:bg-white/[0.04]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[17px] shrink-0 border shadow-inner"
                                                        style={{
                                                            backgroundColor: `${categoryColor.bg}20`,
                                                            borderColor: categoryColor.border,
                                                        }}
                                                    >
                                                        {getCategoryIcon(tx.category)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-medium text-white/85 tracking-tight group-hover:text-white transition-colors">{tx.category}</p>
                                                        <p className="text-[11px] text-white/30 tracking-wide mt-0.5">
                                                            {format(parseISO(tx.date), "MMM dd, yyyy")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingTransaction(tx.id)}
                                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={14} className="text-white/60" />
                                                    </button>
                                                    <div className="flex flex-col items-end">
                                                        <p className="text-[15px] font-semibold text-[#FF8E8E] tracking-tight">
                                                            − Rp {tx.amount.toLocaleString("id-ID")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </motion.div>

            {editingTx && (
                <EditTransactionModal
                    transaction={editingTx}
                    onClose={() => setEditingTransaction(null)}
                />
            )}
        </>
    );
}
