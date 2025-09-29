"use client";

import { useState } from "react";

export default function FarmComponent() {
  const [balance, setBalance] = useState(50);
  const [crops, setCrops] = useState(0);
  const [message, setMessage] = useState("");

  const plant = () => {
    if (balance < 5) {
      setMessage("Not enough money to plant seeds!");
      return;
    }
    setBalance(balance - 5);
    setCrops(crops + 1);
    setMessage("🌱 You planted 1 crop!");
  };

  const harvest = () => {
    if (crops <= 0) {
      setMessage("No crops to harvest!");
      return;
    }
    const earnings = crops * 10;
    setBalance(balance + earnings);
    setCrops(0);
    setMessage(`🌾 You harvested crops and earned ${earnings}!`);
  };

  return (
    <div className="p-4 max-w-md mx-auto border rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">Mini Farm Game</h2>
      <p>Balance: {balance} 💰</p>
      <p>Crops: {crops} 🌱</p>

      <div className="flex gap-3 mt-4">
        <button
          onClick={plant}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Plant (−5💰)
        </button>
        <button
          onClick={harvest}
          className="px-4 py-2 bg-yellow-500 text-white rounded"
        >
          Harvest (+10💰 each)
        </button>
      </div>

      {message && <p className="mt-3 font-medium">{message}</p>}
    </div>
  );
}
