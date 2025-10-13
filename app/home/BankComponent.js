"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { X } from "lucide-react";
import TransactionHistoryPage from "./TransactionHistoryPage";

export default function BankComponent({ currentUser, onClose }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Fetch danh sách user
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, coin, avatar_url")
        .neq("id", currentUser.id);

      if (!error && data) {
        setUsers(
          data.map((u) => ({
            ...u,
            coin: Number(u.coin ?? 0),
          }))
        );
      }
    }
    fetchUsers();
  }, [currentUser.id]);

  const handleTransfer = async () => {
    if (!selectedUser || !amount) {
      setMessage("⚠️ Vui lòng chọn user và nhập số coin");
      return;
    }

    const coinAmount = parseInt(amount.replace(/,/g, "").replace(/\./g, ""), 10);
    if (isNaN(coinAmount) || coinAmount <= 0) {
      setMessage("⚠️ Số tiền không hợp lệ");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: senderData, error: senderError } = await supabase
        .from("profiles")
        .select("coin")
        .eq("id", currentUser.id)
        .single();

      if (senderError) throw senderError;
      const senderCoin = Number(senderData?.coin ?? 0);

      if (senderCoin < coinAmount) {
        setMessage("❌ Bạn không đủ coin để chuyển");
        setLoading(false);
        return;
      }

      const { data: receiverData, error: receiverError } = await supabase
        .from("profiles")
        .select("coin")
        .eq("id", selectedUser.id)
        .single();

      if (receiverError) throw receiverError;
      const receiverCoin = Number(receiverData?.coin ?? 0);

      // Cập nhật coin
      await supabase
        .from("profiles")
        .update({ coin: senderCoin - coinAmount })
        .eq("id", currentUser.id);

      await supabase
        .from("profiles")
        .update({ coin: receiverCoin + coinAmount })
        .eq("id", selectedUser.id);

      // Lưu lịch sử giao dịch
      await supabase.from("transaction_history").insert([
        {
          sender_id: currentUser.id,
          receiver_id: selectedUser.id,
          amount: coinAmount,
        },
      ]);

      setMessage(
        `✅ Chuyển thành công ${coinAmount.toLocaleString()} coin cho ${selectedUser.full_name}`
      );

      setTimeout(() => onClose(), 1000);
    } catch (err) {
      console.error("Transfer error:", err);
      setMessage("❌ Có lỗi xảy ra khi chuyển coin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* Popup chính */}
      <div className="bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative flex flex-col overflow-hidden border border-gray-700">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white z-20"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-center text-gray-100">
          💳 Chuyển Coin
        </h2>

        {/* User list */}
        <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {users.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                selectedUser?.id === u.id
                  ? "border-yellow-400 bg-gray-800"
                  : "border-gray-700 hover:border-yellow-400 hover:bg-gray-800"
              }`}
            >
              <img
                src={
                  u.avatar_url ||
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(u.full_name)
                }
                alt={u.full_name}
                className="w-10 h-10 rounded-full object-cover border border-gray-600"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-100">{u.full_name}</p>
                <p className="text-sm text-gray-400">
                  {u.coin.toLocaleString()} coin
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Amount input */}
        <input
          type="text"
          className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-yellow-400 outline-none placeholder-gray-500"
          placeholder="💰 Nhập số coin muốn chuyển"
          value={amount}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, "").replace(/\./g, "");
            if (/^\d*$/.test(raw))
              setAmount(raw ? Number(raw).toLocaleString() : "");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTransfer();
          }}
        />

        {/* Transfer button */}
        <button
          className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-600 disabled:opacity-50 transition"
          disabled={loading}
          onClick={handleTransfer}
        >
          {loading ? "⏳ Đang chuyển..." : "🚀 Chuyển Coin"}
        </button>

        {/* Transaction history button */}
        <button
          className="mt-3 w-full bg-gray-800 text-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-700 transition"
          onClick={() => setShowHistory(!showHistory)}
        >
          📜 Transaction History
        </button>

        {/* Message */}
        {message && (
          <p className="mt-3 text-center text-sm text-gray-300">{message}</p>
        )}

        {/* Bảng lịch sử trượt ra mà không thay đổi layout */}
        <div
          className={`absolute top-0 right-0 h-full bg-gray-900 shadow-lg transition-transform duration-300 z-10 border-l border-gray-700 ${
            showHistory ? "translate-x-0 w-96" : "translate-x-full w-96"
          }`}
        >
          {showHistory && (
            <TransactionHistoryPage
              currentUser={currentUser}
              onClose={() => setShowHistory(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
