/**
 * analytics.ts — Intelligence Engine v3
 *
 * Core principles:
 * - Stable Guidance: daily_allowance based on weekly budget (guidance).
 * - Safety Constraint: cycle-based ceiling (safety).
 * - Priority-based insight suppression — no contradictions ever.
 * - Proactive Saving Guidance: Encourages saving over spending the remainder.
 */

import { parseISO, subDays, isSameDay, differenceInDays, startOfDay, format } from "date-fns";
import { getCycleStartDate, getCycleEndDate } from "@/lib/utils";
import type { Transaction, FinanceData } from "@/lib/hooks/useFinance";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PreprocessedData = {
    all: Transaction[];
    cycleTransactions: Transaction[];
    last14d: Transaction[];
    cycleDays: number;
    daysElapsed: number;
    daysRemaining: number;
    cycleStart: Date;
    cycleEnd: Date;
    totalSpentInCycle: number;
};

export type WeekdayProfile = {
    weights: number[];       // [Mon=0 … Sun=6], mean-normalized to 1.0
    averages: number[];
    weekendRatio: number;
    hasSufficientData: boolean;
};

export type UserProfile = "conservative" | "balanced" | "aggressive";

export type Anomaly = {
    transaction: Transaction;
    zScore: number;
    medianRatio: number;
};

export type TrendResult = {
    direction: "increasing" | "decreasing" | "stable";
    trendFactor: number;   // clamped [-0.3, +0.3]
    ema7d: number;
    emaPrior7d: number;
    slopePercent: number;
};

export type Forecast = {
    predicted: number;
    low: number;
    high: number;
    velocity: number;
    riskAdjustedVelocity: number;
    volatility: number;
    daysRemaining: number;
    confidenceBand: number;
    isFallback: boolean;
};

export type BurnRate = {
    ratio: number;
    label: "ahead" | "on_track" | "behind";
};

export type SavingGuidance = {
    isApplicable: boolean;
    remainingBudgetToday: number;
    suggestedSpendToday: number;
    reductionAmount: number;
    projectedExtraSaving: number;
    currentProjectedEnd: number;
    improvedProjectedEnd: number;
};

export type InsightType = "danger" | "warning" | "info" | "success";

export type Insight = {
    id: string;
    type: InsightType;
    /** Used for mutual-exclusion grouping */
    context: "daily" | "weekly" | "cycle" | "profile";
    title: string;
    body: string;
    color: string;
    priority: number;
};

export type RecoveryPlan = {
    safeDailyLimit: number;
    reductionRequired: number;
    topCategoryToReduce: string;
    daysRemaining: number;
};

export type FinanceReport = {
    preprocessed: PreprocessedData;
    /** Stable daily target: remaining weekly budget / days left in week */
    weeklyDailyAllowance: number;
    /** Safety ceiling: remaining cycle balance / days left in cycle */
    cycleDailyAllowance: number;
    weekdayProfile: WeekdayProfile;
    userProfile: UserProfile;
    anomalies: Anomaly[];
    trend: TrendResult;
    forecast: Forecast;
    burnRate: BurnRate;
    savingGuidance: SavingGuidance;
    insights: Insight[];
    recoveryPlan: RecoveryPlan | null;
    generatedAt: number;
};

export type PipelineParams = {
    weeklyBudget: number;
    weeklySpent: number;
    spentToday: number;
    currentBalance: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_BUFFER = 500_000;
const EWMA_VELOCITY_ALPHA = 0.25;
const EWMA_TREND_ALPHA = 0.3;

/** Insight IDs that belong to the same exclusive group (only highest-priority shown) */
const EXCLUSIVE_GROUPS: Record<string, string[]> = {
    daily:    ["daily_over_limit", "daily_near_limit", "daily_okay", "daily_clean"],
    forecast: ["forecast_danger",  "forecast_tight",   "forecast_safe"],
    profile:  ["profile_aggressive", "profile_conservative"],
};

// ─── Cache ────────────────────────────────────────────────────────────────────

const _cache = new Map<string, FinanceReport>();

function buildCacheKey(data: FinanceData, params: PipelineParams): string {
    const lastTxId = data.transactions[0]?.id ?? 0;
    return [data.transactions.length, data.balance, lastTxId, params.spentToday,
            Math.floor(Date.now() / 60_000)].join(":");
}

// ─── Step 1: Preprocess ───────────────────────────────────────────────────────

function preprocessTransactions(data: FinanceData): PreprocessedData {
    const now = new Date();
    const cycleStart = getCycleStartDate(now);
    const cycleEnd = getCycleEndDate(now);
    const today = startOfDay(now);

    const cycleDays    = Math.max(1, differenceInDays(cycleEnd, cycleStart) + 1);
    const daysElapsed  = Math.max(1, differenceInDays(today, cycleStart) + 1);
    const daysRemaining = Math.max(0, differenceInDays(cycleEnd, today));

    const all = [...data.transactions]
        .filter(tx => tx.amount > 0)
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const cycleTransactions = all.filter(tx => {
        const d = parseISO(tx.date);
        return d >= cycleStart && d <= cycleEnd;
    });

    const last14d = all.filter(tx => parseISO(tx.date) >= subDays(today, 13));
    const totalSpentInCycle = cycleTransactions.reduce((s, tx) => s + tx.amount, 0);

    return { all, cycleTransactions, last14d, cycleDays, daysElapsed,
             daysRemaining, cycleStart, cycleEnd, totalSpentInCycle };
}

// ─── Step 2: Weekday Profile ──────────────────────────────────────────────────

function buildWeekdayProfile(transactions: Transaction[]): WeekdayProfile {
    const sums: number[]   = new Array(7).fill(0);
    const counts: number[] = new Array(7).fill(0);

    transactions.forEach(tx => {
        const raw = parseISO(tx.date).getDay();
        const idx = raw === 0 ? 6 : raw - 1; // Mon=0, Sun=6
        sums[idx] += tx.amount;
        counts[idx]++;
    });

    const averages = sums.map((s, i) => counts[i] > 0 ? s / counts[i] : 0);
    const nonZero = averages.filter(v => v > 0);
    const mean = nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
    const weights = mean > 0 ? averages.map(a => a > 0 ? a / mean : 1.0) : new Array(7).fill(1.0);

    const weekdayAvg = averages.slice(0, 5).filter(v => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0);
    const weekendAvg = (averages[5] + averages[6]) / 2;
    const weekendRatio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 1;
    const hasSufficientData = counts.reduce((a, b) => a + b, 0) >= 7
        && counts.filter(c => c > 0).length >= 4;

    return { weights, averages, weekendRatio, hasSufficientData };
}

// ─── Step 3: User Profile ─────────────────────────────────────────────────────

function classifyUserProfile(
    totalSpentInCycle: number, initialBalance: number,
    daysElapsed: number, cycleDays: number,
    spentToday: number, cycleDailyAllowance: number
): UserProfile {
    const expectedSpent = (initialBalance / Math.max(1, cycleDays)) * daysElapsed;
    if (expectedSpent <= 0) return "balanced";
    const cycleRatio = totalSpentInCycle / expectedSpent;
    const todayOverfactor = cycleDailyAllowance > 0
        ? Math.max(0, (spentToday - cycleDailyAllowance) / cycleDailyAllowance) : 0;
    // Blend: 80% cycle behaviour, 20% today's behaviour
    const blended = cycleRatio * 0.8 + (1 + todayOverfactor) * 0.2;
    if (blended > 1.15) return "aggressive";
    if (blended < 0.80) return "conservative";
    return "balanced";
}

// ─── Step 4: Hybrid Anomaly Detection ────────────────────────────────────────

function detectAnomalies(transactions: Transaction[]): Anomaly[] {
    if (transactions.length < 3) return [];
    const amounts = transactions.map(tx => tx.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length);
    const sorted = [...amounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    return transactions
        .filter(tx => {
            const z = stdDev > 0 ? (tx.amount - mean) / stdDev : 0;
            return z > 2.0 && (median > 0 ? tx.amount / median : 0) > 2.5;
        })
        .map(tx => ({
            transaction: tx,
            zScore: stdDev > 0 ? (tx.amount - mean) / stdDev : 0,
            medianRatio: median > 0 ? tx.amount / median : 0,
        }))
        .sort((a, b) => b.zScore - a.zScore);
}

// ─── Step 5: Trend Detection ──────────────────────────────────────────────────

function computeEWMA(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    return values.reduce((ema, v, i) => i === 0 ? v : alpha * v + (1 - alpha) * ema, values[0]);
}

function getDailyTotals(transactions: Transaction[], from: Date, days: number): number[] {
    return Array.from({ length: days }, (_, i) => {
        const d = subDays(from, days - 1 - i);
        return transactions.filter(tx => isSameDay(parseISO(tx.date), d)).reduce((s, tx) => s + tx.amount, 0);
    });
}

function detectTrend(last14d: Transaction[]): TrendResult {
    const today = startOfDay(new Date());
    const ema7d      = computeEWMA(getDailyTotals(last14d, today, 7), EWMA_TREND_ALPHA);
    const emaPrior7d = computeEWMA(getDailyTotals(last14d, subDays(today, 7), 7), EWMA_TREND_ALPHA);
    const slope = emaPrior7d > 0 ? (ema7d - emaPrior7d) / emaPrior7d : 0;
    const trendFactor = Math.min(0.3, Math.max(-0.3, slope));
    const slopePercent = Math.round(slope * 100);
    const direction = Math.abs(slope) < 0.05 ? "stable" : slope > 0 ? "increasing" : "decreasing";
    return { direction, trendFactor, ema7d, emaPrior7d, slopePercent };
}

// ─── Step 6: Forecast ─────────────────────────────────────────────────────────

function forecastEndOfCycle(
    currentBalance: number, last14d: Transaction[],
    trend: TrendResult, daysRemaining: number, cycleDailyAllowance: number
): Forecast {
    // Fallback: insufficient data → use cycle daily allowance as velocity estimate
    if (last14d.length < 3) {
        const v = cycleDailyAllowance;
        const predicted = Math.max(0, currentBalance - v * daysRemaining);
        return { predicted, low: Math.max(0, predicted * 0.8), high: predicted * 1.25,
                 velocity: v, riskAdjustedVelocity: v, volatility: 0,
                 daysRemaining, confidenceBand: predicted * 0.2, isFallback: true };
    }

    const today = startOfDay(new Date());
    const dailyTotals = getDailyTotals(last14d, today, 14);
    const velocity = computeEWMA(dailyTotals, EWMA_VELOCITY_ALPHA);
    const mean14 = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
    const volatility = Math.sqrt(dailyTotals.reduce((s, v) => s + Math.pow(v - mean14, 2), 0) / dailyTotals.length);
    const riskAdjustedVelocity = velocity * (1 + trend.trendFactor) + volatility * 0.5;
    const predicted = Math.max(0, currentBalance - riskAdjustedVelocity * daysRemaining);
    const confidenceBand = volatility * Math.sqrt(Math.max(1, daysRemaining));

    return { predicted, low: Math.max(0, predicted - confidenceBand), high: predicted + confidenceBand,
             velocity, riskAdjustedVelocity, volatility, daysRemaining, confidenceBand, isFallback: false };
}

// ─── Step 7: Burn Rate ────────────────────────────────────────────────────────

function calculateBurnRate(totalSpent: number, initialBalance: number, daysElapsed: number, cycleDays: number): BurnRate {
    const expected = cycleDays > 0 ? (initialBalance / cycleDays) * daysElapsed : 1;
    const ratio = expected > 0 ? totalSpent / expected : 1;
    return { ratio, label: ratio < 0.85 ? "ahead" : ratio > 1.15 ? "behind" : "on_track" };
}

// ─── Step 8: Saving Guidance ──────────────────────────────────────────────────

function generateSavingGuidance(
    cycleDailyAllowance: number, spentToday: number,
    daysRemaining: number, forecast: Forecast
): SavingGuidance {
    const remainingBudgetToday = Math.max(0, cycleDailyAllowance - spentToday);
    if (remainingBudgetToday < 20_000 || daysRemaining < 2) {
        return { isApplicable: false, remainingBudgetToday, suggestedSpendToday: remainingBudgetToday,
                 reductionAmount: 0, projectedExtraSaving: 0,
                 currentProjectedEnd: forecast.predicted, improvedProjectedEnd: forecast.predicted };
    }
    // Suggest a 20% reduction in remaining daily spend
    const reductionAmount = Math.floor(remainingBudgetToday * 0.20);
    const suggestedSpendToday = remainingBudgetToday - reductionAmount;
    // Saving carried over multiplied by days remaining (today + future)
    const projectedExtraSaving = reductionAmount * daysRemaining;
    return {
        isApplicable: true, remainingBudgetToday, suggestedSpendToday,
        reductionAmount, projectedExtraSaving,
        currentProjectedEnd: forecast.predicted,
        improvedProjectedEnd: forecast.predicted + projectedExtraSaving,
    };
}

// ─── Step 9: Recovery Plan ────────────────────────────────────────────────────

function buildRecoveryPlan(currentBalance: number, daysRemaining: number, velocity: number, cycleTransactions: Transaction[]): RecoveryPlan {
    const available = Math.max(0, currentBalance - SAFE_BUFFER);
    const safeDailyLimit = daysRemaining > 0 ? Math.floor(available / daysRemaining) : 0;
    const reductionRequired = Math.max(0, Math.floor(velocity - safeDailyLimit));
    const cats: Record<string, number> = {};
    cycleTransactions.forEach(tx => { cats[tx.category] = (cats[tx.category] ?? 0) + tx.amount; });
    const topCategory = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Lainnya";
    return { safeDailyLimit, reductionRequired, topCategoryToReduce: topCategory, daysRemaining };
}

// ─── Step 10: Insight Generation (priority-based, no contradictions) ──────────

function generateInsights(
    preprocessed: PreprocessedData, cycleDailyAllowance: number,
    weekdayProfile: WeekdayProfile, userProfile: UserProfile,
    anomalies: Anomaly[], trend: TrendResult,
    forecast: Forecast, burnRate: BurnRate,
    params: PipelineParams
): { insights: Insight[]; recoveryPlan: RecoveryPlan | null } {

    const { spentToday, weeklyBudget, weeklySpent, currentBalance } = params;
    const { daysRemaining, cycleTransactions } = preprocessed;
    const pool: Insight[] = [];
    let recoveryPlan: RecoveryPlan | null = null;

    // ── Daily context ──────────────────────────────────────────────────────
    if (cycleDailyAllowance > 0 && spentToday > cycleDailyAllowance) {
        const over = spentToday - cycleDailyAllowance;
        const newLimit = daysRemaining > 1 ? Math.floor((currentBalance - spentToday) / (daysRemaining - 1)) : 0;
        pool.push({ id: "daily_over_limit", type: "warning", context: "daily", priority: 88,
            title: "Pengeluaran Melewati Rencana Hari Ini",
            body: `Kamu belanja Rp ${spentToday.toLocaleString("id-ID")} hari ini, Rp ${over.toLocaleString("id-ID")} di atas rencana. Tidak apa-apa — limit harianmu otomatis menyesuaikan ke Rp ${newLimit.toLocaleString("id-ID")} mulai besok.`,
            color: "#FFB043" });
    } else if (cycleDailyAllowance > 0 && spentToday > cycleDailyAllowance * 0.8) {
        pool.push({ id: "daily_near_limit", type: "warning", context: "daily", priority: 65,
            title: "Mendekati Batas Rencana Hari Ini",
            body: `Tersisa Rp ${(cycleDailyAllowance - spentToday).toLocaleString("id-ID")} dari jatah hari ini. Sedikit lagi hemat bisa membantu menjaga lebih banyak ruang besok.`,
            color: "#FFB043" });
    } else if (spentToday > 0) {
        pool.push({ id: "daily_okay", type: "info", context: "daily", priority: 30,
            title: "Pengeluaran Hari Ini dalam Rencana",
            body: `Sudah belanja Rp ${spentToday.toLocaleString("id-ID")} dari jatah Rp ${cycleDailyAllowance.toLocaleString("id-ID")}. Masih aman!`,
            color: "#45B7D1" });
    } else if (cycleDailyAllowance > 0) {
        pool.push({ id: "daily_clean", type: "success", context: "daily", priority: 5,
            title: "Hari yang Bersih!",
            body: `Belum ada pengeluaran hari ini. Jatah harian tersedia: Rp ${cycleDailyAllowance.toLocaleString("id-ID")}.`,
            color: "#4ECDC4" });
    }

    // ── Cycle forecast context ─────────────────────────────────────────────
    if (forecast.predicted <= 0) {
        pool.push({ id: "forecast_danger", type: "danger", context: "cycle", priority: 90,
            title: "Perhatian: Saldo Perlu Dijaga",
            body: `Dengan pola saat ini, saldo bisa sangat tipis menjelang tanggal 3. Coba kurangi Rp ${Math.floor(forecast.riskAdjustedVelocity - cycleDailyAllowance).toLocaleString("id-ID")}/hari untuk menjaga buffer aman.`,
            color: "#FF6B6B" });
    } else if (forecast.predicted < SAFE_BUFFER) {
        pool.push({ id: "forecast_tight", type: "warning", context: "cycle", priority: 78,
            title: "Prediksi Saldo Akhir Bulan Tipis",
            body: `Saldo akhir diprediksi sekitar Rp ${Math.floor(forecast.predicted).toLocaleString("id-ID")} (kisaran Rp ${Math.floor(forecast.low).toLocaleString("id-ID")} – Rp ${Math.floor(forecast.high).toLocaleString("id-ID")}). Sedikit penghematan bisa membuat perbedaan besar.`,
            color: "#FFB043" });
    } else {
        pool.push({ id: "forecast_safe", type: "success", context: "cycle", priority: 18,
            title: "Saldo Akhir Bulan Diprediksi Aman",
            body: `Diperkirakan Rp ${Math.floor(forecast.predicted).toLocaleString("id-ID")} tersisa (kisaran Rp ${Math.floor(forecast.low).toLocaleString("id-ID")} – Rp ${Math.floor(forecast.high).toLocaleString("id-ID")}). Tetap jaga pola baikmu!`,
            color: "#4ECDC4" });
    }

    // Recovery plan (shown alongside forecast_danger/tight)
    if (forecast.predicted < SAFE_BUFFER && daysRemaining > 0) {
        recoveryPlan = buildRecoveryPlan(currentBalance, daysRemaining, forecast.riskAdjustedVelocity, cycleTransactions);
    }

    // ── Weekly context ─────────────────────────────────────────────────────
    if (burnRate.ratio > 1.15) {
        pool.push({ id: "burn_rate_high", type: "warning", context: "weekly", priority: 68,
            title: "Kecepatan Belanja Lebih Tinggi dari Rencana",
            body: `Pengeluaranmu ${((burnRate.ratio - 1) * 100).toFixed(0)}% lebih cepat dari yang diharapkan (burn rate ${burnRate.ratio.toFixed(2)}×). Kamu masih bisa menyesuaikan.`,
            color: "#FFB043" });
    } else if (burnRate.ratio < 0.8) {
        pool.push({ id: "burn_rate_good", type: "success", context: "weekly", priority: 12,
            title: "Keuangan Terkendali dengan Baik",
            body: `Kamu berhemat ${(100 - burnRate.ratio * 100).toFixed(0)}% di bawah rencana (burn rate ${burnRate.ratio.toFixed(2)}×). Ini hasil yang bagus!`,
            color: "#4ECDC4" });
    }

    if (anomalies.length > 0) {
        const top = anomalies[0];
        pool.push({ id: "anomaly_detected", type: "warning", context: "weekly", priority: 72,
            title: "Transaksi di Luar Kebiasaan",
            body: `Rp ${top.transaction.amount.toLocaleString("id-ID")} pada ${format(parseISO(top.transaction.date), "EEE dd MMM")} (${top.medianRatio.toFixed(1)}× dari biasanya — kategori: ${top.transaction.category}).`,
            color: "#FFB043" });
    }

    if (trend.direction === "increasing" && Math.abs(trend.slopePercent) >= 10) {
        pool.push({ id: "trend_up", type: "warning", context: "weekly", priority: 55,
            title: "Tren Belanja Meningkat",
            body: `Rata-rata belanja naik ${Math.abs(trend.slopePercent)}% dibanding 7 hari sebelumnya. Ini momen yang baik untuk sedikit memperlambat.`,
            color: "#FFB043" });
    } else if (trend.direction === "decreasing" && Math.abs(trend.slopePercent) >= 10) {
        pool.push({ id: "trend_down", type: "success", context: "weekly", priority: 15,
            title: "Tren Penghematan Terdeteksi!",
            body: `Rata-rata belanja turun ${Math.abs(trend.slopePercent)}% dibanding minggu lalu. Pertahankan momentum ini!`,
            color: "#4ECDC4" });
    }

    if (weekdayProfile.hasSufficientData && weekdayProfile.weekendRatio > 1.3) {
        pool.push({ id: "weekend_premium", type: "info", context: "weekly", priority: 38,
            title: "Pola Belanja Akhir Pekan Terdeteksi",
            body: `Pengeluaranmu di akhir pekan rata-rata ${((weekdayProfile.weekendRatio - 1) * 100).toFixed(0)}% lebih tinggi dari hari kerja — ini wajar, tapi bisa dipertimbangkan saat merencanakan minggu.`,
            color: "#45B7D1" });
    }

    // ── Profile context ────────────────────────────────────────────────────
    if (userProfile === "aggressive") {
        pool.push({ id: "profile_aggressive", type: "warning", context: "profile", priority: 60,
            title: "Kecepatan Belanja Perlu Perhatian",
            body: `Pengeluaran bulan ini berjalan lebih cepat dari biasanya. Ini bukan masalah besar, tapi memperhatikannya sekarang bisa membantu menjaga saldo akhir.`,
            color: "#FFB043" });
    } else if (userProfile === "conservative") {
        pool.push({ id: "profile_conservative", type: "success", context: "profile", priority: 8,
            title: "Profil Belanja: Efisien",
            body: `Pengeluaranmu secara keseluruhan terkendali dengan baik. Peluang bagus untuk menabung lebih atau mengalokasikan ke dana darurat.`,
            color: "#4ECDC4" });
    }

    // Savings opportunity (low priority, only when healthy)
    const weeklyRemaining = weeklyBudget - weeklySpent;
    if (weeklyRemaining > 200_000) {
        pool.push({ id: "savings_opportunity", type: "success", context: "weekly", priority: 22,
            title: "Peluang Menabung Minggu Ini",
            body: `Sisa budget mingguan Rp ${weeklyRemaining.toLocaleString("id-ID")}. Pertimbangkan sisihkan 30% (Rp ${Math.floor(weeklyRemaining * 0.3).toLocaleString("id-ID")}) ke dana darurat.`,
            color: "#96CEB4" });
    }

    // ── Apply priority-based suppression rules ─────────────────────────────
    const insights = applyInsightRules(pool);
    return { insights, recoveryPlan };
}

/** Removes contradictory insights using exclusive-group and priority-threshold rules */
function applyInsightRules(pool: Insight[]): Insight[] {
    const sorted = [...pool].sort((a, b) => b.priority - a.priority);
    const maxPriority = sorted[0]?.priority ?? 0;
    const hasCritical = maxPriority >= 85;
    const hasHigh     = maxPriority >= 65;

    const seenGroups = new Set<string>();
    const result: Insight[] = [];

    for (const insight of sorted) {
        // Exclusive group: only the highest-priority insight per group
        let groupKey: string | null = null;
        for (const [group, ids] of Object.entries(EXCLUSIVE_GROUPS)) {
            if (ids.includes(insight.id)) { groupKey = group; break; }
        }
        if (groupKey) {
            if (seenGroups.has(groupKey)) continue;
            seenGroups.add(groupKey);
        }

        // Suppress info-level when critical issues exist
        if (hasCritical && insight.priority < 20) continue;
        // Suppress savings when high-priority issues exist
        if (hasHigh && insight.id === "savings_opportunity") continue;

        result.push(insight);
    }

    return result;
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

function _computePipeline(data: FinanceData, params: PipelineParams): FinanceReport {
    const preprocessed = preprocessTransactions(data);
    const { daysRemaining, totalSpentInCycle, daysElapsed, cycleDays, cycleTransactions, last14d } = preprocessed;

    // 1. Stable weekly-rooted allowance
    const dayOfWeek = new Date().getDay();
    const daysLeftInWeek = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const weeklyDailyAllowance = Math.floor(params.weeklyBudget / 7); // Base target

    // 2. Adaptive cycle-rooted allowance (Safety limit)
    const cycleDailyAllowance = daysRemaining > 0
        ? Math.floor(Math.max(0, params.currentBalance) / daysRemaining) : 0;

    const weekdayProfile = buildWeekdayProfile(preprocessed.all);

    const userProfile = classifyUserProfile(
        totalSpentInCycle, data.initialBalance, daysElapsed, cycleDays,
        params.spentToday, cycleDailyAllowance
    );

    const anomalies = detectAnomalies(cycleTransactions);
    const trend = detectTrend(last14d);
    const forecast = forecastEndOfCycle(params.currentBalance, last14d, trend, daysRemaining, cycleDailyAllowance);
    const burnRate = calculateBurnRate(totalSpentInCycle, data.initialBalance, daysElapsed, cycleDays);
    const savingGuidance = generateSavingGuidance(cycleDailyAllowance, params.spentToday, daysRemaining, forecast);

    const { insights, recoveryPlan } = generateInsights(
        preprocessed, cycleDailyAllowance, weekdayProfile, userProfile,
        anomalies, trend, forecast, burnRate, params
    );

    return { preprocessed, weeklyDailyAllowance, cycleDailyAllowance, weekdayProfile, userProfile,
             anomalies, trend, forecast, burnRate, savingGuidance,
             insights, recoveryPlan, generatedAt: Date.now() };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function runAnalyticsPipeline(data: FinanceData, params: PipelineParams): FinanceReport {
    if (data.transactions.length === 0) return _computePipeline(data, params);
    const key = buildCacheKey(data, params);
    const cached = _cache.get(key);
    if (cached) return cached;
    const result = _computePipeline(data, params);
    _cache.set(key, result);
    if (_cache.size > 10) { const k = _cache.keys().next().value; if (k) _cache.delete(k); }
    return result;
}

/** Lightweight helper: weekday weights only, no full pipeline */
export function getWeekdayWeights(transactions: Transaction[]): number[] | null {
    const p = buildWeekdayProfile(transactions.filter(tx => tx.amount > 0));
    return p.hasSufficientData ? p.weights : null;
}
