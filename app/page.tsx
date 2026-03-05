"use client";

import { useEffect, useState, useRef } from "react";

type Transaction = {
  id: number;
  date: string;
  category: string;
  amount: number;
};

type FinanceData = {
  balance: number;
  initialBalance: number;
  weeklyBudgetTarget: number;
  transactions: Transaction[];
};

const CATEGORY_ICONS: Record<string, string> = {
  Makan: "🍜",
  Jajan: "🧋",
  Transport: "🚌",
  Bensin: "⛽",
  "Kuota/Pulsa": "📱",
  "Kebutuhan Rumah": "🏠",
};

function getCategoryIcon(cat: string) {
  return CATEGORY_ICONS[cat] ?? "💸";
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<FinanceData | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [initBalance, setInitBalance] = useState("");
  const [initWeeklyBudget, setInitWeeklyBudget] = useState("");
  const [balanceAnim, setBalanceAnim] = useState(false);
  const prevBalance = useRef<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem("finance-data");
    if (stored) {
      const parsed = JSON.parse(stored);
      setData({
        balance: parsed.balance ?? 0,
        initialBalance: parsed.initialBalance ?? parsed.balance ?? 0,
        weeklyBudgetTarget: parsed.weeklyBudgetTarget ?? Math.floor((parsed.initialBalance ?? 0) / 4),
        transactions: parsed.transactions ?? [],
      });
    }
  }, [mounted]);

  useEffect(() => {
    if (data) {
      localStorage.setItem("finance-data", JSON.stringify(data));
      if (prevBalance.current !== null && prevBalance.current !== data.balance) {
        setBalanceAnim(true);
        setTimeout(() => setBalanceAnim(false), 400);
      }
      prevBalance.current = data.balance;
    }
  }, [data]);

  const handleSetSetup = () => {
    const balanceNum = Number(initBalance);
    if (!balanceNum || balanceNum <= 0) { alert("Masukkan saldo awal yang valid!"); return; }
    const weeklyNum = initWeeklyBudget ? Number(initWeeklyBudget) : Math.floor(balanceNum / 4);
    setData({ balance: balanceNum, initialBalance: balanceNum, weeklyBudgetTarget: weeklyNum, transactions: [] });
  };

  const handleAddTransaction = () => {
    if (!data || !amount || !category) { alert("Mohon isi nominal dan kategori!"); return; }
    const newAmount = parseInt(amount);
    if (newAmount > data.balance) { alert("Saldo total tidak cukup!"); return; }
    const newTx: Transaction = { id: Date.now(), date: new Date().toLocaleDateString("id-ID"), category, amount: newAmount };
    setData({ ...data, balance: data.balance - newAmount, transactions: [newTx, ...data.transactions] });
    setAmount(""); setCategory("");
  };

  const handleReset = () => {
    if (confirm("Yakin mau reset semua data? Ini tidak bisa dikembalikan.")) {
      localStorage.removeItem("finance-data");
      setData(null); setInitBalance(""); setInitWeeklyBudget("");
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [["Tanggal", "Kategori", "Jumlah"], ...data.transactions.map((tx) => [tx.date, tx.category, tx.amount])];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "transaksi.csv");
    document.body.appendChild(link);
    link.click();
  };

  // ---- LOADING ----
  if (!mounted) {
    return (
      <main style={styles.root}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, letterSpacing: "0.08em" }}>Loading...</span>
        </div>
      </main>
    );
  }

  // ---- SETUP SCREEN ----
  if (!data) {
    return (
      <>
        <style>{globalStyles}</style>
        <main style={styles.root}>
          <div style={styles.grain} />
          <div style={styles.radialOrb} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "24px", animation: "fadeIn 0.5s ease" }}>
            <div style={styles.setupCard}>
              <div style={{ marginBottom: 32 }}>
                <p style={styles.setupEyebrow}>Personal Finance</p>
                <h1 style={styles.setupTitle}>Set up your wallet.</h1>
                <p style={styles.setupSub}>A few details to get started.</p>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Monthly Balance</label>
                <input
                  type="number"
                  placeholder="e.g. 3,000,000"
                  value={initBalance}
                  onChange={(e) => setInitBalance(e.target.value)}
                  style={styles.input}
                  onFocus={e => Object.assign(e.currentTarget.style, styles.inputFocus)}
                  onBlur={e => Object.assign(e.currentTarget.style, styles.inputBlur)}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  Weekly Budget Target <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>— optional</span>
                </label>
                <input
                  type="number"
                  placeholder="Leave blank to auto-split ÷4"
                  value={initWeeklyBudget}
                  onChange={(e) => setInitWeeklyBudget(e.target.value)}
                  style={styles.input}
                  onFocus={e => Object.assign(e.currentTarget.style, styles.inputFocus)}
                  onBlur={e => Object.assign(e.currentTarget.style, styles.inputBlur)}
                />
              </div>

              <button
                onClick={handleSetSetup}
                style={styles.primaryBtn}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Get Started
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ---- WEEKLY LOGIC ----
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).setHours(0, 0, 0, 0);
  const weeklyBudget = data.weeklyBudgetTarget;
  const weeklySpent = data.transactions.filter((tx) => tx.id >= startOfWeek).reduce((sum, tx) => sum + tx.amount, 0);
  const weeklyLeft = weeklyBudget - weeklySpent;
  const weeklyPercentLeft = Math.max(0, Math.min(100, (weeklyLeft / weeklyBudget) * 100));
  const isOverBudget = weeklyLeft < 0;
  const isDanger = weeklyPercentLeft < 25;

  // ---- MAIN DASHBOARD ----
  return (
    <>
      <style>{globalStyles}</style>
      <main style={styles.root}>
        <div style={styles.grain} />
        <div style={styles.radialOrb} />

        <div style={styles.container}>
          {/* HEADER */}
          <div style={{ animation: "fadeSlideUp 0.5s ease both", animationDelay: "0s" }}>
            <div style={styles.headerRow}>
              <div>
                <p style={styles.eyebrow}>My Money</p>
                <h1 style={styles.mainTitle}>Wealth Overview</h1>
              </div>
              <div style={styles.liveChip}>
                <span style={styles.liveDot} />
                Live
              </div>
            </div>
          </div>

          {/* BALANCE CARD */}
          <div
            style={{ ...styles.card, animation: "fadeSlideUp 0.5s ease both", animationDelay: "0.07s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <div style={styles.balanceHeader}>
              <div>
                <p style={styles.cardEyebrow}>Available Balance</p>
                <p style={styles.cardMeta}>Updated just now</p>
              </div>
              <div style={styles.balancePill}>
                {((data.balance / data.initialBalance) * 100).toFixed(0)}% remaining
              </div>
            </div>

            <div style={{ ...styles.balanceNumber, ...(balanceAnim ? styles.balanceNumberAnim : {}) }}>
              <span style={styles.balanceCurrency}>Rp</span>
              {data.balance.toLocaleString("id-ID")}
            </div>

            <div style={styles.divider} />

            {/* WEEKLY BUDGET */}
            <div>
              <div style={styles.budgetRow}>
                <span style={styles.budgetLabel}>This Week</span>
                <span style={{ ...styles.budgetAmount, color: isOverBudget ? "#FF6B6B" : "rgba(255,255,255,0.9)" }}>
                  Rp {weeklyLeft.toLocaleString("id-ID")} left
                </span>
              </div>

              {/* PROGRESS TRACK */}
              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressFill,
                  width: `${isOverBudget ? 100 : weeklyPercentLeft}%`,
                  background: isOverBudget
                    ? "linear-gradient(90deg, #FF6B6B, #FF8E8E)"
                    : isDanger
                      ? "linear-gradient(90deg, #FF9A3C, #FFB574)"
                      : "linear-gradient(90deg, #7C5CFF, #B983FF)",
                  boxShadow: isOverBudget
                    ? "0 0 20px rgba(255,107,107,0.35)"
                    : isDanger
                      ? "0 0 20px rgba(255,154,60,0.35)"
                      : "0 0 20px rgba(124,92,255,0.35)",
                }} />
              </div>

              <div style={styles.budgetMeta}>
                <span>Spent: Rp {weeklySpent.toLocaleString("id-ID")}</span>
                <span>Limit: Rp {weeklyBudget.toLocaleString("id-ID")}</span>
              </div>

              {isOverBudget && (
                <div style={styles.overBudgetBanner}>
                  <span>⚠</span>
                  <span>You've exceeded your weekly limit</span>
                </div>
              )}
            </div>
          </div>

          {/* ADD EXPENSE */}
          <div
            style={{ ...styles.card, animation: "fadeSlideUp 0.5s ease both", animationDelay: "0.14s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <p style={styles.sectionTitle}>Add Expense</p>
            <div style={styles.inputRow}>
              <input
                type="text"
                list="category-options"
                placeholder="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                onFocus={e => Object.assign(e.currentTarget.style, styles.inputFocus)}
                onBlur={e => Object.assign(e.currentTarget.style, styles.inputBlur)}
              />
              <datalist id="category-options">
                <option value="Makan" /><option value="Jajan" /><option value="Transport" />
                <option value="Bensin" /><option value="Kuota/Pulsa" /><option value="Kebutuhan Rumah" />
              </datalist>

              <input
                type="number"
                placeholder="Amount (Rp)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                onFocus={e => Object.assign(e.currentTarget.style, styles.inputFocus)}
                onBlur={e => Object.assign(e.currentTarget.style, styles.inputBlur)}
              />

              <button
                onClick={handleAddTransaction}
                style={styles.addBtn}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Add
              </button>
            </div>
          </div>

          {/* TRANSACTIONS */}
          <div
            style={{ ...styles.card, animation: "fadeSlideUp 0.5s ease both", animationDelay: "0.21s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={styles.sectionTitle}>Activity</p>
              {data.transactions.length > 0 && (
                <span style={styles.txCount}>{data.transactions.length} entries</span>
              )}
            </div>

            {data.transactions.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: 28 }}>🪞</span>
                <p>No transactions yet.</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Add one above to get started.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.transactions.map((tx, i) => (
                  <div
                    key={tx.id}
                    style={{ ...styles.txItem, animationDelay: `${i * 0.04}s` }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  >
                    <div style={styles.txLeft}>
                      <div style={styles.txIcon}>{getCategoryIcon(tx.category)}</div>
                      <div>
                        <p style={styles.txCategory}>{tx.category}</p>
                        <p style={styles.txDate}>{tx.date}</p>
                      </div>
                    </div>
                    <p style={styles.txAmount}>− Rp {tx.amount.toLocaleString("id-ID")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{ ...styles.footerRow, animation: "fadeSlideUp 0.5s ease both", animationDelay: "0.28s" }}>
            <button
              onClick={exportCSV}
              style={styles.ghostBtn}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              Export CSV
            </button>
            <button
              onClick={handleReset}
              style={styles.dangerBtn}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,107,107,0.15)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,107,107,0.07)")}
            >
              Reset Data
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scalePop {
    0% { transform: scale(1); }
    50% { transform: scale(1.025); }
    100% { transform: scale(1); }
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input::placeholder { color: rgba(255,255,255,0.22); }
`;

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#0B0B0F",
    fontFamily: "'DM Sans', sans-serif",
    color: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
  },
  grain: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
    opacity: 0.5,
    pointerEvents: "none",
    zIndex: 0,
  },
  radialOrb: {
    position: "fixed",
    top: "-20%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "80vw",
    height: "60vh",
    background: "radial-gradient(ellipse at center, rgba(124,92,255,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: 600,
    margin: "0 auto",
    padding: "48px 20px 80px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 38,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
    color: "#FFFFFF",
  },
  liveChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 500,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: "0.04em",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#7C5CFF",
    animation: "pulseDot 2s ease infinite",
    display: "inline-block",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: "28px 28px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  balanceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardEyebrow: {
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.03em",
  },
  balancePill: {
    background: "rgba(124,92,255,0.12)",
    border: "1px solid rgba(124,92,255,0.2)",
    color: "#B983FF",
    borderRadius: 99,
    padding: "4px 12px",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  balanceNumber: {
    fontSize: 52,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1,
    marginBottom: 24,
    transition: "transform 0.3s ease",
  },
  balanceNumberAnim: {
    animation: "scalePop 0.35s ease",
  },
  balanceCurrency: {
    fontSize: 22,
    fontWeight: 500,
    marginRight: 6,
    color: "rgba(255,255,255,0.5)",
    verticalAlign: "middle",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    marginBottom: 24,
  },
  budgetRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  budgetLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.6)",
  },
  budgetAmount: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  progressTrack: {
    height: 8,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  budgetMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "rgba(255,255,255,0.28)",
    letterSpacing: "0.02em",
  },
  overBudgetBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    padding: "10px 14px",
    background: "rgba(255,107,107,0.08)",
    border: "1px solid rgba(255,107,107,0.18)",
    borderRadius: 12,
    fontSize: 12,
    color: "#FF9090",
    fontWeight: 500,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 500,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 16,
    letterSpacing: "-0.01em",
  },
  inputRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
    alignItems: "center",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 14,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
    padding: "12px 16px",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    width: "100%",
  },
  inputFocus: {
    borderColor: "rgba(124,92,255,0.6)",
    boxShadow: "0 0 0 4px rgba(124,92,255,0.12)",
    background: "rgba(124,92,255,0.06)",
  },
  inputBlur: {
    borderColor: "rgba(255,255,255,0.09)",
    boxShadow: "none",
    background: "rgba(255,255,255,0.05)",
  },
  addBtn: {
    background: "linear-gradient(135deg, #7C5CFF 0%, #B983FF 100%)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 14,
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap" as const,
  },
  primaryBtn: {
    width: "100%",
    background: "linear-gradient(135deg, #7C5CFF 0%, #B983FF 100%)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 14,
    padding: "15px 24px",
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
    letterSpacing: "-0.01em",
    marginTop: 8,
  },
  txItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 18,
    cursor: "default",
    transition: "background 0.15s ease",
    animation: "fadeSlideUp 0.4s ease both",
  },
  txLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
    flexShrink: 0,
  },
  txCategory: {
    fontSize: 14,
    fontWeight: 500,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: "-0.01em",
  },
  txDate: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: 2,
    letterSpacing: "0.02em",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: 600,
    color: "#FF8E8E",
    letterSpacing: "-0.01em",
  },
  txCount: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.04em",
    background: "rgba(255,255,255,0.05)",
    padding: "3px 10px",
    borderRadius: 99,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    padding: "32px 0",
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    textAlign: "center" as const,
  },
  footerRow: {
    display: "flex",
    gap: 10,
    paddingTop: 8,
  },
  ghostBtn: {
    flex: 1,
    padding: "12px 20px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    transition: "background 0.2s ease",
    letterSpacing: "-0.01em",
  },
  dangerBtn: {
    flex: 1,
    padding: "12px 20px",
    background: "rgba(255,107,107,0.07)",
    border: "1px solid rgba(255,107,107,0.12)",
    borderRadius: 14,
    color: "#FF8E8E",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    transition: "background 0.2s ease",
    letterSpacing: "-0.01em",
  },
  setupCard: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: "40px 36px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    width: "100%",
    maxWidth: 440,
  },
  setupEyebrow: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "#B983FF",
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
    marginBottom: 8,
  },
  setupSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.38)",
    fontWeight: 400,
  },
};