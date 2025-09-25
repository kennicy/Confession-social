"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { X } from "lucide-react";

export default function BankComponent({ currentUser, onClose }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch user list
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, coin, avatar_url")
        .neq("id", currentUser.id);

      if (!error && data) {
        setUsers(data.map((u) => ({ ...u, coin: u.coin ?? 0 })));
      }
    }
    fetchUsers();
  }, [currentUser.id]);

  const handleTransfer = async () => {
    if (!selectedUser || !amount) {
      setMessage("⚠️ Vui lòng chọn user và nhập số coin");
      return;
    }

    const coinAmount = parseInt(amount.replace(/,/g, ""), 10);
    if (isNaN(coinAmount) || coinAmount <= 0) {
      setMessage("⚠️ Số tiền không hợp lệ");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Lấy coin người gửi
      const { data: senderData, error: senderError } = await supabase
        .from("profiles")
        .select("coin")
        .eq("id", currentUser.id)
        .single();

      if (senderError) throw senderError;
      if ((senderData.coin ?? 0) < coinAmount) {
        setMessage("❌ Bạn không đủ coin để chuyển");
        setLoading(false);
        return;
      }

      // Update sender
      await supabase
        .from("profiles")
        .update({ coin: (senderData.coin ?? 0) - coinAmount })
        .eq("id", currentUser.id);

      // Update receiver
      const { data: receiverData } = await supabase
        .from("profiles")
        .select("coin")
        .eq("id", selectedUser.id)
        .single();

      await supabase
        .from("profiles")
        .update({ coin: (receiverData.coin ?? 0) + coinAmount })
        .eq("id", selectedUser.id);

      setMessage(
        `✅ Chuyển thành công ${coinAmount.toLocaleString()} coin cho ${selectedUser.full_name}`
      );

      // Đóng popup sau 1s để hiển thị thông báo ngắn
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Có lỗi xảy ra khi chuyển coin");
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 relative">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
          💳 Chuyển Coin
        </h2>

        {/* User list */}
        <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {users.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition 
                ${
                  selectedUser?.id === u.id
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-gray-200 hover:border-yellow-400 hover:bg-gray-50"
                }`}
            >
              <img
                src={
                  u.avatar_url ||
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(u.full_name)
                }
                alt={u.full_name}
                className="w-10 h-10 rounded-full object-cover border"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{u.full_name}</p>
                <p className="text-sm text-gray-500">
                  {u.coin.toLocaleString()} coin
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Amount input */}
        <input
          type="text"
          className="w-full border rounded-lg p-3 mb-3 focus:ring-2 focus:ring-yellow-400 outline-none"
          placeholder="💰 Nhập số coin muốn chuyển"
          value={amount}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, "");
            if (!isNaN(raw)) {
              setAmount(Number(raw).toLocaleString());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleTransfer();
            }
          }}
        />

        {/* Transfer button */}
        <button
          className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 disabled:opacity-50 transition"
          disabled={loading}
          onClick={handleTransfer}
        >
          {loading ? "⏳ Đang chuyển..." : "🚀 Chuyển Coin"}
        </button>

        {/* Message */}
        {message && (
          <p className="mt-3 text-center text-sm text-gray-700">{message}</p>
        )}

      </div>
    </div>
  );
}
