"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { X, CheckCircle2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TransactionHistoryPage({ currentUser }) {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("all"); // all, received, sent
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchHistory = async () => {
    if (!currentUser?.id) return;

    let query = supabase
      .from("transaction_history")
      .select(`
        id,
        amount,
        created_at,
        sender:sender_id(id, full_name, avatar_url),
        receiver:receiver_id(id, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`) // chỉ lấy giao dịch liên quan
      .order("created_at", { ascending: false });

    if (filter === "sent") {
      query = query.eq("sender_id", currentUser.id);
    } else if (filter === "received") {
      query = query.eq("receiver_id", currentUser.id);
    }

    const { data, error } = await query;
    if (!error && data) setHistory(data);
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser?.id, filter]);

  const renderAvatar = (user) =>
    user?.avatar_url ? (
      <img
        src={user.avatar_url}
        alt={user.full_name}
        className="w-12 h-12 rounded-full border object-cover"
      />
    ) : (
      <div className="w-12 h-12 rounded-full border bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
        {user?.full_name?.[0] || "?"}
      </div>
    );

  const formatTime = (timestamp) =>
    timestamp
      ? new Date(timestamp).toLocaleString("en-US", {
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "";

  return (
    <div className="bg-gray-50 p-4 rounded-lg h-full flex flex-col shadow-lg relative">
      <h2 className="text-2xl font-bold mb-4 border-b pb-2">
        📜 Transaction History
      </h2>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-4">
        {["all", "received", "sent"].map((f) => (
          <button
            key={f}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              filter === f
                ? f === "sent"
                  ? "bg-red-500 text-white"
                  : f === "received"
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-gray-400 text-center mt-10">
            No transactions found.
          </p>
        ) : (
          <div className="grid gap-3">
            {history.map((tx) => {
              const isSent = tx.sender?.id === currentUser.id;
              const otherUser = isSent ? tx.receiver : tx.sender;

              return (
                <motion.div
                  key={tx.id}
                  className="flex justify-between items-center p-3 bg-white rounded-xl shadow hover:shadow-lg cursor-pointer transition"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className="flex items-center gap-4">
                    {renderAvatar(otherUser)}
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">
                        {otherUser?.full_name || "Unknown"}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {formatTime(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isSent ? (
                      <ArrowUpRight className="text-red-500" size={18} />
                    ) : (
                      <ArrowDownRight className="text-green-500" size={18} />
                    )}
                    <p
                      className={`font-bold text-lg ${
                        isSent ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      {Number(tx.amount).toLocaleString()} 💰
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Popup chi tiết */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center relative"
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition"
                onClick={() => setSelectedTx(null)}
              >
                <X size={24} />
              </button>

              <CheckCircle2 size={64} className="text-green-500 mb-4" />

              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Transaction Details
              </h2>

              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex flex-col items-center">
                  {renderAvatar(selectedTx.sender)}
                  <p className="mt-2 font-semibold">
                    {selectedTx.sender?.full_name || "Unknown"}
                  </p>
                  <p className="text-gray-400 text-sm">Sender</p>
                </div>
                <div className="text-2xl font-bold">➡️</div>
                <div className="flex flex-col items-center">
                  {renderAvatar(selectedTx.receiver)}
                  <p className="mt-2 font-semibold">
                    {selectedTx.receiver?.full_name || "Unknown"}
                  </p>
                  <p className="text-gray-400 text-sm">Receiver</p>
                </div>
              </div>

              <p className="text-gray-700 text-lg mb-1">
                Amount:{" "}
                <span
                  className={`font-semibold ${
                    selectedTx.sender?.id === currentUser.id
                      ? "text-red-500"
                      : "text-green-600"
                  }`}
                >
                  {Number(selectedTx.amount).toLocaleString()} coins
                </span>
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Date: {formatTime(selectedTx.created_at)}
              </p>

              <button
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-10 rounded-2xl transition text-lg shadow-lg"
                onClick={() => setSelectedTx(null)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
