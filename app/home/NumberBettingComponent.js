"use client";

import { useState } from "react";

export default function NumberBettingComponent() {
  const [balance, setBalance] = useState(100); // số tiền ban đầu
  const [bet, setBet] = useState("");
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const handleBet = () => {
    if (!bet || isNaN(bet)) {
      setMessage("Vui lòng chọn số để cược!");
      return;
    }

    if (amount > balance) {
      setMessage("Không đủ tiền để cược!");
      return;
    }

    const randomNumber = Math.floor(Math.random() * 10) + 1; // số random từ 1–10
    setResult(randomNumber);

    if (parseInt(bet) === randomNumber) {
      setBalance(balance + amount * 2);
      setMessage(`🎉 Bạn thắng! Số trúng là ${randomNumber}`);
    } else {
      setBalance(balance - amount);
      setMessage(`😢 Bạn thua! Số trúng là ${randomNumber}`);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto border rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">Number Betting Game</h2>
      <p>Số dư: {balance} 💰</p>

      <div className="mt-3">
        <label>Chọn số (1–10): </label>
        <input
          type="number"
          min="1"
          max="10"
          value={bet}
          onChange={(e) => setBet(e.target.value)}
          className="border p-1 rounded w-20 ml-2"
        />
      </div>

      <div className="mt-3">
        <label>Số tiền cược: </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value))}
          className="border p-1 rounded w-24 ml-2"
        />
      </div>

      <button
        onClick={handleBet}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Đặt cược
      </button>

      {message && (
        <p className="mt-3 font-medium">
          {message}
        </p>
      )}
    </div>
  );
}
