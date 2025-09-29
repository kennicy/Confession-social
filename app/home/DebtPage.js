// DebtPage.jsx
"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import Summary from "./Summary";
import TransactionModal from "./TransactionModal";

const members = ["Trans", "Khôi", "Dung", "Ski", "Wibu", "Chuppy"];

export default function DebtPage() {
  const [transactions, setTransactions] = useState([]);
  const [payer, setPayer] = useState(members[0]);
  const [showPaid, setShowPaid] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // ==== LOAD & SUBSCRIBE REALTIME ====
  useEffect(() => {
    const loadData = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false }); // hiện ngày mới đầu tiên
      if (!error && data) setTransactions(data);
    };
    loadData();

    const channel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTransactions((prev) => [payload.new, ...prev]);
          }
          if (payload.eventType === "UPDATE") {
            setTransactions((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t))
            );
          }
          if (payload.eventType === "DELETE") {
            setTransactions((prev) =>
              prev.filter((t) => t.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ==== ADD NEW TRANSACTION ====
  const addTransaction = async (date, mealName, items) => {
    const validItems = items.filter((i) => members.includes(i.eater));
    if (!validItems.length) return;

    const tempId = Date.now();
    const newTransaction = {
      id: tempId,
      date,
      meal_name: mealName,
      payer,
      items: validItems.map((i) => ({ ...i, ate: !!i.price })), // nếu có giá => đã ăn
      paid_off: false,
    };
    setTransactions((prev) => [newTransaction, ...prev]);

    const { error } = await supabase.from("transactions").insert([
      {
        date,
        meal_name: mealName,
        payer,
        items: newTransaction.items,
        paid_off: false,
      },
    ]);
    if (error) {
      console.error(error);
      setTransactions((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  // ==== TOGGLE PAID OFF ====
  const togglePaidOff = async (id, paidOff) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, paid_off: !paidOff } : t))
    );
    const { error } = await supabase
      .from("transactions")
      .update({ paid_off: !paidOff })
      .eq("id", id);
    if (error) console.error(error);
  };

  // ==== TOGGLE ATE CHO TỪNG NGƯỜI ====
  const toggleAte = async (transactionId, itemIndex) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== transactionId) return t;
        const newItems = [...t.items];
        newItems[itemIndex].ate = !newItems[itemIndex].ate;
        return { ...t, items: newItems };
      })
    );

    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction) return;
    const newItems = [...transaction.items];
    newItems[itemIndex].ate = !newItems[itemIndex].ate;

    const { error } = await supabase
      .from("transactions")
      .update({ items: newItems })
      .eq("id", transactionId);
    if (error) console.error(error);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold mb-6">📒 Ghi nợ ăn uống (Realtime)</h1>

      {/* Người trả */}
      <div>
        <span className="font-medium block mb-2">Người trả:</span>
        <div className="grid grid-cols-3 gap-3">
          {members.map((m) => (
            <label
              key={m}
              className={`cursor-pointer border rounded-lg p-3 text-center font-medium transition ${
                payer === m
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:border-blue-400"
              }`}
            >
              <input
                type="radio"
                name="payer"
                value={m}
                checked={payer === m}
                onChange={() => setPayer(m)}
                className="hidden"
              />
              {m}
            </label>
          ))}
        </div>
      </div>

      {/* Form thêm bữa */}
      <TransactionForm members={members} onAdd={addTransaction} />

      {/* Danh sách bữa ăn */}
      <TransactionList
        transactions={transactions}
        showPaid={showPaid}
        setShowPaid={setShowPaid}
        togglePaidOff={togglePaidOff}
        onEdit={(t) => setEditingTransaction(t)}
        toggleAte={toggleAte}
      />

      {/* Tổng kết */}
      <Summary transactions={transactions} members={members} />

      {/* Popup chỉnh sửa bữa ăn */}
      {editingTransaction && (
        <TransactionModal
          transaction={editingTransaction}
          members={members}
          onClose={() => setEditingTransaction(null)}
          onUpdateItems={updateTransactionItem}
        />
      )}
    </div>
  );
}
