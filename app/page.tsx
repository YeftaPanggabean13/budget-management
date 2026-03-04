"use client";

import { useEffect, useState } from "react";

type Transaction = {
  id: number;
  date: string;
  category: string;
  amount: number;
};

type Investment = {
  id: number;
  name: string;
  amount: number;
};

type FinanceData = {
  balance: number;
  initialBalance: number;
  transactions: Transaction[];
  investments: Investment[];
};

export default function Page() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Makan");
  const [investmentName, setInvestmentName] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");

  // LOAD DATA SAFE
  useEffect(() => {
    const stored = localStorage.getItem("finance-data");

    if (stored) {
      const parsed = JSON.parse(stored);

      setData({
        balance: parsed.balance ?? 0,
        initialBalance: parsed.initialBalance ?? parsed.balance ?? 0,
        transactions: parsed.transactions ?? [],
        investments: parsed.investments ?? [],
      });
    }
  }, []);

  // SAVE DATA
  useEffect(() => {
    if (data) {
      localStorage.setItem("finance-data", JSON.stringify(data));
    }
  }, [data]);

  const handleSetBalance = (value: number) => {
    setData({
      balance: value,
      initialBalance: value,
      transactions: [],
      investments: [],
    });
  };

  const handleAddTransaction = () => {
    if (!data || !amount) return;

    const newAmount = parseInt(amount);
    if (newAmount > data.balance) {
      alert("Saldo tidak cukup!");
      return;
    }

    const newTx: Transaction = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      category,
      amount: newAmount,
    };

    setData({
      ...data,
      balance: data.balance - newAmount,
      transactions: [newTx, ...data.transactions],
    });

    setAmount("");
  };

  const handleAddInvestment = () => {
    if (!data || !investmentAmount || !investmentName) return;

    const amt = parseInt(investmentAmount);
    if (amt > data.balance) {
      alert("Saldo tidak cukup!");
      return;
    }

    const newInv: Investment = {
      id: Date.now(),
      name: investmentName,
      amount: amt,
    };

    setData({
      ...data,
      balance: data.balance - amt,
      investments: [...data.investments, newInv],
    });

    setInvestmentAmount("");
    setInvestmentName("");
  };

  const handleReset = () => {
    const confirmReset = confirm(
      "Yakin mau reset semua data? Ini tidak bisa dikembalikan."
    );

    if (confirmReset) {
      localStorage.removeItem("finance-data");
      setData(null);
    }
  };

  const exportCSV = () => {
    if (!data) return;

    const rows = [
      ["Tanggal", "Kategori", "Jumlah"],
      ...data.transactions.map((tx) => [
        tx.date,
        tx.category,
        tx.amount,
      ]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "transaksi.csv");
    document.body.appendChild(link);
    link.click();
  };

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="p-8 bg-white/5 rounded-2xl border border-white/10">
          <h1 className="mb-4 text-lg">Masukkan Saldo Awal</h1>
          <input
            type="number"
            placeholder="Contoh: 1300000"
            className="p-3 bg-black border border-white/20 rounded-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSetBalance(
                  Number((e.target as HTMLInputElement).value)
                );
              }
            }}
          />
        </div>
      </main>
    );
  }

  const weeklyBudget = Math.floor(data.initialBalance / 4);
  const totalSpent = data.initialBalance - data.balance;
  const percentLeft =
    (data.balance / data.initialBalance) * 100;

  const weeklySpent = totalSpent % weeklyBudget;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        <h1 className="text-3xl font-bold">Smart Finance Dashboard</h1>

        {/* BALANCE */}
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-gray-400">Saldo Tersisa</p>
          <h2 className="text-2xl font-semibold">
            Rp {data.balance.toLocaleString()}
          </h2>

          {/* PROGRESS BAR */}
          <div className="mt-4 h-3 bg-white/10 rounded-full">
            <div
              className="h-3 rounded-full bg-green-500"
              style={{ width: `${percentLeft}%` }}
            />
          </div>

          {percentLeft < 20 && (
            <p className="text-red-400 mt-2 text-sm">
              ⚠ Saldo hampir habis!
            </p>
          )}

          <p className="mt-3 text-sm text-gray-400">
            Budget Mingguan: Rp {weeklyBudget.toLocaleString()}
          </p>

          {weeklySpent > weeklyBudget && (
            <p className="text-red-400 text-sm mt-2">
              ⚠ Over budget minggu ini!
            </p>
          )}
        </div>

        {/* ADD TRANSACTION */}
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
          <h2 className="font-semibold">Tambah Pengeluaran</h2>
          <div className="flex gap-3 flex-wrap">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-2 bg-black border border-white/20 rounded"
            >
              <option>Makan</option>
              <option>Jajan</option>
              <option>Kuota</option>
              <option>Sabun</option>
              <option>Lainnya</option>
            </select>

            <input
              type="number"
              placeholder="Nominal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="p-2 bg-black border border-white/20 rounded"
            />

            <button
              onClick={handleAddTransaction}
              className="px-4 py-2 bg-white text-black rounded"
            >
              Tambah
            </button>
          </div>
        </div>

        {/* HISTORY */}
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
          <h2 className="font-semibold mb-4">Riwayat Transaksi</h2>

          {data.transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Belum ada transaksi
            </p>
          ) : (
            <div className="space-y-3">
              {data.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between bg-black/40 p-3 rounded-lg"
                >
                  <div>
                    <p>{tx.category}</p>
                    <p className="text-xs text-gray-500">
                      {tx.date}
                    </p>
                  </div>
                  <p className="text-red-400">
                    - Rp {tx.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* INVESTMENT */}
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
          <h2 className="font-semibold">Investasi</h2>

          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Nama investasi"
              value={investmentName}
              onChange={(e) =>
                setInvestmentName(e.target.value)
              }
              className="p-2 bg-black border border-white/20 rounded"
            />

            <input
              type="number"
              placeholder="Nominal"
              value={investmentAmount}
              onChange={(e) =>
                setInvestmentAmount(e.target.value)
              }
              className="p-2 bg-black border border-white/20 rounded"
            />

            <button
              onClick={handleAddInvestment}
              className="px-4 py-2 bg-green-500 text-black rounded"
            >
              Tambah
            </button>
          </div>

          {data.investments.map((inv) => (
            <div key={inv.id}>
              {inv.name} - Rp {inv.amount.toLocaleString()}
            </div>
          ))}
        </div>

        {/* EXPORT & RESET */}
        <div className="flex gap-4">
          <button
            onClick={exportCSV}
            className="px-6 py-3 bg-blue-500 rounded"
          >
            Export CSV
          </button>

          <button
            onClick={handleReset}
            className="px-6 py-3 bg-red-600 rounded"
          >
            Reset
          </button>
        </div>

      </div>
    </main>
  );
}