import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { startOfMonth, endOfMonth, addMonths, subMonths, setDate, differenceInDays, startOfDay, isSameDay, parseISO, addWeeks, subWeeks } from "date-fns";

export const PAYDAY_DATE = 3;

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Gets the start date of the current budget cycle (based on payday).
 */
export function getCycleStartDate(date: Date = new Date()) {
    const d = startOfDay(date);
    if (d.getDate() >= PAYDAY_DATE) {
        return setDate(startOfMonth(d), PAYDAY_DATE);
    } else {
        return setDate(startOfMonth(subMonths(d, 1)), PAYDAY_DATE);
    }
}

/**
 * Gets the end date of the current budget cycle.
 */
export function getCycleEndDate(date: Date = new Date()) {
    const start = getCycleStartDate(date);
    return setDate(startOfMonth(addMonths(start, 1)), PAYDAY_DATE - 1);
}

/**
 * Gets the start of the current week within the budget cycle.
 * A week starts every 7 days from the payday.
 */
export function getWeeklyCycleStartDate(date: Date = new Date()) {
    const cycleStart = getCycleStartDate(date);
    const diff = differenceInDays(startOfDay(date), cycleStart);
    const weekIndex = Math.floor(diff / 7);
    return addWeeks(cycleStart, weekIndex);
}

/**
 * Calculates the remaining daily allowance based on weekly or monthly budget.
 */
export function calculateDailyAllowance(
    remainingBudget: number,
    period: 'week' | 'month'
) {
    const now = new Date();
    const today = startOfDay(now);

    let daysRemaining = 1;
    const cycleEnd = getCycleEndDate(now);

    if (period === 'week') {
        const weekStart = getWeeklyCycleStartDate(now);
        const weekEnd = addWeeks(weekStart, 1);
        const actualEnd = weekEnd.getTime() > cycleEnd.getTime() ? cycleEnd : weekEnd;
        daysRemaining = Math.max(1, differenceInDays(actualEnd, today));
    } else {
        daysRemaining = Math.max(1, differenceInDays(cycleEnd, today) + 1);
    }

    return Math.max(0, Math.floor(remainingBudget / daysRemaining));
}

/**
 * Gets total spent today from transactions.
 */
export function getSpentToday(transactions: { date: string; amount: number }[]) {
    const today = startOfDay(new Date());
    return transactions
        .filter(tx => isSameDay(parseISO(tx.date), today))
        .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Calculates current spending velocity (average spent per day in current cycle).
 */
export function calculateSpendingVelocity(transactions: { date: string; amount: number }[]) {
    const cycleStart = getCycleStartDate();
    const today = startOfDay(new Date());
    const daysPassed = Math.max(1, differenceInDays(today, cycleStart) + 1);

    const cycleSpent = transactions
        .filter(tx => {
            const txDate = parseISO(tx.date);
            return txDate >= cycleStart && txDate <= today;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

    return cycleSpent / daysPassed;
}

/**
 * Predicts balance at the end of the current cycle based on current velocity.
 * Formula: Current Balance - (Daily Velocity * Days Remaining)
 */
export function predictEndOfCycleBalance(
    currentBalance: number,
    velocity: number,
    cycleEndDate: Date
) {
    const today = startOfDay(new Date());
    const daysRemaining = Math.max(0, differenceInDays(cycleEndDate, today));
    return Math.max(0, currentBalance - (velocity * daysRemaining));
}
