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
 * @deprecated Use calculateDynamicDailyAllowance instead.
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
 * Calculates a dynamic daily allowance based on remaining weekly budget and
 * remaining days in the current calendar week (Mon–Sun).
 *
 * This is adaptive: early over-spending reduces future allowances automatically.
 * When weekdayWeights are provided (Smart Allocation), the allowance is scaled
 * by the historical pattern for today's day of the week.
 *
 * @param weeklyBudget   - Total weekly budget target
 * @param weeklySpent    - Total spent this week INCLUDING today
 * @param spentToday     - Amount spent today (used to compute "before today" baseline)
 * @param weekdayWeights - Optional 7-element array [Mon=0 … Sun=6], normalized so mean=1.0
 * @returns { allowance, daysLeft, isWeighted }
 */
export function calculateDynamicDailyAllowance(
    weeklyBudgetTarget: number,
    weeklySpent: number,
    spentToday: number,
    weekdayWeights?: number[]
): { allowance: number; daysLeft: number; isWeighted: boolean } {
    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Days remaining in the week INCLUDING today (week runs Mon–Sun)
    const daysLeftInWeek = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    // Remaining weekly budget: exclude today's spend to get a fresh daily target
    const spentBeforeToday = Math.max(0, weeklySpent - spentToday);
    const remainingWeeklyBudget = Math.max(0, weeklyBudgetTarget - spentBeforeToday);

    // Base allowance = remaining weekly budget ÷ days left in the week
    const baseAllowance = daysLeftInWeek > 0 ? Math.floor(remainingWeeklyBudget / daysLeftInWeek) : 0;

    if (weekdayWeights && weekdayWeights.length === 7) {
        const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weight = Math.min(2.0, Math.max(0.5, weekdayWeights[todayIdx] ?? 1.0));
        return {
            allowance: Math.floor(baseAllowance * weight),
            daysLeft: daysLeftInWeek,
            isWeighted: true,
        };
    }

    return { allowance: baseAllowance, daysLeft: daysLeftInWeek, isWeighted: false };
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

/**
 * Calculates a "Safe Daily Limit" to reach a target buffer balance at the end of the cycle.
 */
export function calculateSafeDailyLimit(
    currentBalance: number,
    targetEndBalance: number,
    cycleEndDate: Date
) {
    const today = startOfDay(new Date());
    const daysRemaining = Math.max(1, differenceInDays(cycleEndDate, today));
    const availableForSpending = Math.max(0, currentBalance - targetEndBalance);
    return Math.floor(availableForSpending / daysRemaining);
}

/**
 * Primary daily allowance formula: remaining_balance / remaining_days_in_cycle.
 * This is the intelligent, adaptive version that automatically corrects for
 * overspending or underspending in previous days.
 *
 * @param currentBalance  - Current balance
 * @param cycleEndDate    - End date of the current pay cycle
 * @param weekdayWeights  - Optional [Mon=0 … Sun=6] weights for Smart Allocation
 */
export function calculateCycleDailyAllowance(
    currentBalance: number,
    cycleEndDate: Date,
    weekdayWeights?: number[]
): { allowance: number; daysLeft: number; isWeighted: boolean } {
    const today = startOfDay(new Date());
    const daysLeft = Math.max(1, differenceInDays(cycleEndDate, today));
    const base = Math.floor(Math.max(0, currentBalance) / daysLeft);

    if (weekdayWeights && weekdayWeights.length === 7) {
        const dayOfWeek = new Date().getDay();
        const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const w = Math.min(2.0, Math.max(0.5, weekdayWeights[idx] ?? 1.0));
        return { allowance: Math.floor(base * w), daysLeft, isWeighted: true };
    }
    return { allowance: base, daysLeft, isWeighted: false };
}
