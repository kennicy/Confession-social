"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import dayjs from "dayjs";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Percent } from "lucide-react";

export default function BankPage({ user }) {
  const [loading, setLoading] = useState(true);
  const [coin, setCoin] = useState(0);
  const [bank, setBank] = useState(null);
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [interestPreview, setInterestPreview] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [recentInterest, setRecentInterest] = useState(0);
  const interestRef = useRef(0);

  const RATE_PER_TICK = 0.0002;
  const TICK_DURATION = 300;

  const fmt = (num) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num || 0);

  // Load data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("coin")
        .eq("id", user.id)
        .single();
      if (profile) setCoin(profile.coin);

      const { data: bankData } = await supabase
        .from("bank")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (bankData) {
        const lastDateVN = dayjs(bankData.last_interest_date).add(7, "hour");
        const nowVN = dayjs().add(7, "hour");
        const secondsPassed = nowVN.diff(lastDateVN, "second");

        const ticks = Math.floor(secondsPassed / TICK_DURATION);
        const interestSinceLast = Math.floor(bankData.balance * RATE_PER_TICK * ticks);

        const accruedInterest = (bankData.accrued_interest || 0) + interestSinceLast;

        setBank({ ...bankData, accrued_interest: accruedInterest });
        setInterestPreview(accruedInterest);
        setDisplayTotal((bankData.balance || 0) + accruedInterest);

        await supabase
          .from("bank")
          .update({
            accrued_interest: accruedInterest,
            last_interest_date: dayjs().toISOString(),
          })
          .eq("user_id", user.id);
      }

      const { data: txs } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      setTransactions(txs || []);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Realtime subs
  useEffect(() => {
    if (!user) return;

    const subProfiles = supabase
      .channel("profiles-change")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => setCoin(payload.new.coin)
      )
      .subscribe();

    const subBank = supabase
      .channel("bank-change")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bank", filter: `user_id=eq.${user.id}` },
        (payload) => setBank(payload.new)
      )
      .subscribe();

    const subTx = supabase
      .channel("bank-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bank_transactions", filter: `user_id=eq.${user.id}` },
        (payload) => setTransactions((prev) => [payload.new, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subProfiles);
      supabase.removeChannel(subBank);
      supabase.removeChannel(subTx);
    };
  }, [user]);

  // Lãi realtime
  useEffect(() => {
    if (!bank) return;

    interestRef.current = 0;
    setInterestPreview(bank.accrued_interest || 0);
    setDisplayTotal((bank.balance || 0) + (bank.accrued_interest || 0));

    const timer = setInterval(async () => {
      if (!bank || bank.balance <= 0) return;

      const interestThisTick = Math.floor(bank.balance * RATE_PER_TICK);
      interestRef.current += interestThisTick;

      const newAccrued = (bank.accrued_interest || 0) + interestRef.current;
      setInterestPreview(newAccrued);
      setDisplayTotal((bank.balance || 0) + newAccrued);

      if (interestThisTick > 0) {
        setRecentInterest(interestThisTick);
        setTimeout(() => setRecentInterest(0), 1000);
      }

      await supabase
        .from("bank")
        .update({
          accrued_interest: newAccrued,
          last_interest_date: dayjs().toISOString(),
        })
        .eq("user_id", user.id);

      interestRef.current = 0;
    }, TICK_DURATION * 1000);

    return () => clearInterval(timer);
  }, [bank]);

  // Deposit
  const handleDeposit = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < 300000 || amt > coin) return alert("Invalid amount. Min = 300,000");

    await supabase.from("profiles").update({ coin: coin - amt }).eq("id", user.id);

    if (bank) {
      await supabase
        .from("bank")
        .update({
          balance: bank.balance + amt,
          total_deposited: (bank.total_deposited || 0) + amt,
        })
        .eq("user_id", user.id);
    } else {
      await supabase.from("bank").insert({
        user_id: user.id,
        balance: amt,
        total_deposited: amt,
        accrued_interest: 0,
        total_interest: 0,
        last_interest_date: dayjs().toISOString(),
      });
    }

    await supabase.from("bank_transactions").insert({
      user_id: user.id,
      type: "deposit",
      amount: amt,
      date: new Date(),
    });

    setAmount("");
  };

  // Withdraw
  const handleWithdraw = async () => {
    if (!bank || bank.balance <= 0) return alert("No funds");

    const total = (bank.balance || 0) + (bank.accrued_interest || 0);

    await supabase.from("profiles").update({ coin: coin + total }).eq("id", user.id);

    await supabase
      .from("bank")
      .update({
        balance: 0,
        accrued_interest: 0,
        total_interest: (bank.total_interest || 0) + (bank.accrued_interest || 0),
        last_interest_date: dayjs().toISOString(),
      })
      .eq("user_id", user.id);

    await supabase.from("bank_transactions").insert([
      { user_id: user.id, type: "withdraw", amount: bank.balance, date: new Date() },
      { user_id: user.id, type: "interest", amount: bank.accrued_interest || 0, date: new Date() },
    ]);

    interestRef.current = 0;
    setInterestPreview(0);
  };

  if (!user) return <p className="p-4 text-gray-300">Please log in</p>;
  if (loading) return <p className="p-4 text-gray-300">Loading...</p>;

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg text-gray-200">
      <h2 className="text-3xl font-bold mb-4 flex items-center gap-3 text-purple-400">
        <PiggyBank /> Bank
      </h2>

      <div className="text-sm mb-3 flex items-center gap-2 text-gray-400">
        <Percent size={16} /> Interest rate: 0.02% / 5min
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow text-center">
          <p className="text-gray-400">Current Coins</p>
          <p className="text-2xl font-bold text-blue-400">{fmt(coin)}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl shadow text-center relative">
          <p className="text-gray-400">Deposit</p>
          <p className="text-2xl font-bold text-purple-400">{fmt(bank?.balance)}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl shadow text-center relative">
          <p className="text-gray-400">Accumulated Interest</p>
          <p className="text-2xl font-bold text-green-400">{fmt(interestPreview)}</p>
          {recentInterest > 0 && (
            <span className="absolute top-2 right-2 text-green-500 font-bold animate-bounce">
              +{fmt(recentInterest)}
            </span>
          )}
        </div>
        <div className="bg-gray-800 p-6 rounded-xl shadow text-center">
          <p className="text-gray-400">Total Received</p>
          <p className="text-2xl font-bold text-emerald-400">
            {fmt((bank?.total_interest || 0) + interestPreview)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Enter deposit amount"
          value={amount.toLocaleString?.() || amount}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, "").replace(/\D/g, "");
            setAmount(raw ? parseInt(raw) : "");
          }}
          className="border border-gray-600 bg-gray-900 text-gray-200 px-3 py-2 rounded w-48 focus:outline-purple-400"
        />
        <button
          onClick={handleDeposit}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition"
        >
          <ArrowUpCircle size={20} /> Deposit
        </button>
        <button
          onClick={handleWithdraw}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition"
        >
          <ArrowDownCircle size={20} /> Withdraw + Interest
        </button>
      </div>

      <h3 className="font-semibold mb-3 text-lg text-gray-300">📜 Transaction History</h3>
      <ul className="space-y-1 max-h-72 overflow-y-auto bg-gray-800 p-4 rounded-xl shadow">
        {transactions.length === 0 ? (
          <li className="text-gray-500 text-center py-2">No transactions yet</li>
        ) : (
          transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex justify-between border-b border-gray-700 py-2 text-sm items-center"
            >
              <span
                className={`font-medium ${
                  tx.type === "deposit"
                    ? "text-blue-400"
                    : tx.type === "withdraw"
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {tx.type === "deposit"
                  ? "💰 Deposit"
                  : tx.type === "withdraw"
                  ? "🏧 Withdraw"
                  : "📈 Interest"}
              </span>
              <span className="font-semibold">{fmt(tx.amount)}</span>
              <span className="text-gray-500 text-xs">
                {dayjs(tx.date).format("HH:mm:ss DD/MM/YYYY")}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
