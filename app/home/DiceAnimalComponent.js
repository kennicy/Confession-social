"use client";

import { useState } from "react";

const symbols = ["🐟", "🦀", "🦌", "🍇", "🍤", "🐔"];

export default function DiceAnimalComponent() {
  const [balance, setBalance] = useState(100);
  const [betSymbol, setBetSymbol] = useState(null);
  const [amount, setAmount] = useState(10);
  const [result, setResult] = useState([]);
  const [message, setMessage] = useState("");

  const handlePlay = () => {
    if (!betSymbol) {
      setMessage("Please select a symbol to bet!");
      return;
    }

    if (amount > balance) {
      setMessage("Not enough balance!");
      return;
    }

    const rolls = Array(3)
      .fill(0)
      .map(() => symbols[Math.floor(Math.random() * symbols.length)]);
    setResult(rolls);

    const count = rolls.filter((s) => s === betSymbol).length;
    if (count > 0) {
      const winAmount = amount * count;
      setBalance(balance + winAmount);
      setMessage(`🎉 You win! ${count} match(es), +${winAmount}`);
    } else {
      setBalance(balance - amount);
      setMessage("😢 You lose!");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto border rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">Bầu Cua Game</h2>
      <p>Balance: {balance} 💰</p>

      <div className="flex gap-2 mt-2">
        {symbols.map((s) => (
          <button
            key={s}
            className={`px-3 py-2 border rounded ${betSymbol === s ? "bg-green-300" : ""}`}
            onClick={() => setBetSymbol(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label>Bet amount: </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value))}
          className="border p-1 rounded w-24 ml-2"
        />
      </div>

      <button
        onClick={handlePlay}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Roll
      </button>

      {result.length > 0 && (
        <div className="flex gap-4 mt-3 text-3xl">{result.join(" ")}</div>
      )}

      {message && <p className="mt-3 font-medium">{message}</p>}
    </div>
  );
}
