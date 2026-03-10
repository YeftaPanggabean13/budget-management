"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCycleStartDate } from "@/lib/utils";

export type Transaction = {
    id: number;
    date: string; // ISO string for better parsing
    category: string;
    amount: number;
};

export type CategoryBudget = {
    category: string;
    amount: number;
};

export type RecurringExpense = {
    id: number;
    name: string;
    category: string;
    amount: number;
    dayOfMonth: number;
};

export type FinanceData = {
    balance: number;
    initialBalance: number;
    weeklyBudgetTarget: number;
    transactions: Transaction[];
    categoryBudgets: CategoryBudget[];
    recurringExpenses: RecurringExpense[];
    lastResetDate: string;
};

export type FinanceContextType = {
    data: FinanceData | null;
    mounted: boolean;
    setSetup: (balance: number, weeklyBudget: number) => void;
    addTransaction: (amount: number, category: string, date?: string) => void;
    deleteTransaction: (id: number) => void;
    editTransaction: (id: number, updates: Partial<Transaction>) => void;
    addRecurringExpense: (expense: Omit<RecurringExpense, "id">) => void;
    deleteRecurringExpense: (id: number) => void;
    setCategoryBudget: (category: string, amount: number) => void;
    resetData: () => void;
    triggerMonthlyReset: () => void;
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<FinanceData | null>(null);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("finance-data");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);

                // Migration matching logic for old data schema -> new data schema
                const transactions = (parsed.transactions ?? []).map((t: any) => ({
                    ...t,
                    date: t.date.includes("/")
                        ? new Date(t.date.split("/").reverse().join("-")).toISOString() // roughly handle old locale date string fallback
                        : new Date(t.id).toISOString() // fallback to timestamp if missing
                }));

                setData({
                    balance: parsed.balance ?? 0,
                    initialBalance: parsed.initialBalance ?? parsed.balance ?? 0,
                    weeklyBudgetTarget: parsed.weeklyBudgetTarget ?? Math.floor((parsed.initialBalance ?? 0) / 4),
                    transactions: transactions,
                    categoryBudgets: parsed.categoryBudgets ?? [],
                    recurringExpenses: parsed.recurringExpenses ?? [],
                    lastResetDate: parsed.lastResetDate ?? new Date().toISOString(),
                });
            } catch (e) {
                console.error("Failed to parse finance data", e);
            }
        }
    }, []);

    useEffect(() => {
        if (data && mounted) {
            localStorage.setItem("finance-data", JSON.stringify(data));
            checkMonthlyReset(data);
        }
    }, [data, mounted]);

    const checkMonthlyReset = (currentData: FinanceData) => {
        const lastReset = new Date(currentData.lastResetDate);
        const now = new Date();
        const currentCycleStart = getCycleStartDate(now);

        // Check if we entered a new cycle (month starting on the 3rd)
        if (lastReset < currentCycleStart) {
            // Auto run monthly reset
            triggerMonthlyReset();
        }
    };

    const triggerMonthlyReset = () => {
        setData((prev) => {
            if (!prev) return prev;
            let newBalance = prev.initialBalance;
            const newTransactions = [...prev.transactions];
            const now = new Date();

            // Deduct recurring expenses
            prev.recurringExpenses.forEach((exp) => {
                if (newBalance >= exp.amount) {
                    newBalance -= exp.amount;
                    newTransactions.unshift({
                        id: Date.now() + Math.random(),
                        date: new Date(now.getFullYear(), now.getMonth(), exp.dayOfMonth).toISOString(),
                        category: exp.category,
                        amount: exp.amount,
                    });
                }
            });

            return {
                ...prev,
                balance: newBalance,
                transactions: newTransactions,
                lastResetDate: new Date().toISOString()
            };
        });
    };

    const setSetup = (balance: number, weeklyBudget: number) => {
        setData({
            balance,
            initialBalance: balance,
            weeklyBudgetTarget: weeklyBudget,
            transactions: [],
            categoryBudgets: [],
            recurringExpenses: [],
            lastResetDate: new Date().toISOString(),
        });
    };

    const addTransaction = (amount: number, category: string, date?: string) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                balance: prev.balance - amount,
                transactions: [
                    {
                        id: Date.now(),
                        date: date || new Date().toISOString(),
                        category,
                        amount,
                    },
                    ...prev.transactions,
                ],
            };
        });
    };

    const deleteTransaction = (id: number) => {
        setData((prev) => {
            if (!prev) return prev;
            const tx = prev.transactions.find((t) => t.id === id);
            if (!tx) return prev;
            return {
                ...prev,
                balance: prev.balance + tx.amount,
                transactions: prev.transactions.filter((t) => t.id !== id),
            };
        });
    };

    const editTransaction = (id: number, updates: Partial<Transaction>) => {
        setData((prev) => {
            if (!prev) return prev;
            const txIndex = prev.transactions.findIndex((t) => t.id === id);
            if (txIndex === -1) return prev;

            const tx = prev.transactions[txIndex];
            const amountDiff = (updates.amount ?? tx.amount) - tx.amount;

            const newTransactions = [...prev.transactions];
            newTransactions[txIndex] = { ...tx, ...updates };

            return {
                ...prev,
                balance: prev.balance - amountDiff,
                transactions: newTransactions,
            };
        });
    };

    const addRecurringExpense = (expense: Omit<RecurringExpense, "id">) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                recurringExpenses: [...prev.recurringExpenses, { ...expense, id: Date.now() }],
            };
        });
    };

    const deleteRecurringExpense = (id: number) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                recurringExpenses: prev.recurringExpenses.filter((e) => e.id !== id),
            };
        });
    };

    const setCategoryBudget = (category: string, amount: number) => {
        setData((prev) => {
            if (!prev) return prev;
            const existing = prev.categoryBudgets.find((c) => c.category === category);
            const newBudgets = existing
                ? prev.categoryBudgets.map((c) => (c.category === category ? { ...c, amount } : c))
                : [...prev.categoryBudgets, { category, amount }];
            return {
                ...prev,
                categoryBudgets: newBudgets,
            };
        });
    };

    const resetData = () => {
        localStorage.removeItem("finance-data");
        setData(null);
    };

    return (
        <FinanceContext.Provider
            value={{
                data,
                mounted,
                setSetup,
                addTransaction,
                deleteTransaction,
                editTransaction,
                addRecurringExpense,
                deleteRecurringExpense,
                setCategoryBudget,
                resetData,
                triggerMonthlyReset,
            }}
        >
            {children}
        </FinanceContext.Provider>
    );
}

export function useFinance() {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error("useFinance must be used within a FinanceProvider");
    }
    return context;
}
