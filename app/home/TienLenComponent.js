"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Card from "./Card";
import { createDeck, shuffle, compareCards, isValidMove } from "./utils";
import { botPlay } from "./BotAI";

export default function TienLenComponent() {
  const [hands, setHands] = useState([[], [], [], []]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [selectedCards, setSelectedCards] = useState([]);
  const [tableCards, setTableCards] = useState([]);
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    startGame();
  }, []);

  const startGame = () => {
    let deck = shuffle(createDeck());
    let newHands = [[], [], [], []];
    for (let i = 0; i < 52; i++) {
      newHands[i % 4].push(deck[i]);
    }
    newHands = newHands.map((h) =>
      h.sort((a, b) => compareCards(a, b))
    );
    setHands(newHands);
    setCurrentPlayer(0);
    setTableCards([]);
    setWinner(null);
    setSelectedCards([]);
    setMessage("");
  };

  const playCards = (cards, player) => {
    if (!isValidMove(cards, tableCards)) {
      if (player === 0) {
        setMessage("⛔ Nước đi không hợp lệ!");
      }
      return;
    }

    const newHands = [...hands];
    newHands[player] = newHands[player].filter(
      (c) => !cards.includes(c)
    );
    setHands(newHands);
    setTableCards(cards);
    setSelectedCards([]);
    setMessage("");

    if (newHands[player].length === 0) {
      setWinner(player);
      return;
    }

    setTimeout(() => {
      setCurrentPlayer((player + 1) % 4);
    }, 500);
  };

  const skipTurn = (player) => {
    setTableCards([]);
    setTimeout(() => {
      setCurrentPlayer((player + 1) % 4);
    }, 500);
  };

  useEffect(() => {
    if (winner !== null) return;
    if (currentPlayer !== 0) {
      setTimeout(() => {
        const move = botPlay(hands[currentPlayer], tableCards);
        if (move) playCards(move, currentPlayer);
        else skipTurn(currentPlayer);
      }, 1000);
    }
  }, [currentPlayer]);

  const toggleSelect = (card) => {
    if (selectedCards.includes(card)) {
      setSelectedCards(selectedCards.filter((c) => c !== card));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gradient-to-b from-green-800 to-green-900 min-h-screen text-white relative">
      <h1 className="text-3xl font-bold mb-4">🎴 Tiến Lên</h1>

      {winner !== null && (
        <div className="mb-4 text-2xl font-bold text-yellow-300">
          {winner === 0 ? "🎉 Bạn thắng!" : `🤖 Bot ${winner} thắng!`}
        </div>
      )}

      {message && (
        <div className="mb-2 text-red-400 font-semibold">{message}</div>
      )}

      {/* Bàn chơi */}
      <div className="flex justify-center items-center h-48 w-full mb-8">
        {tableCards.map((c) => (
          <motion.div
            key={c.id}
            className="mx-1 px-3 py-4 rounded-lg bg-white text-black shadow-xl text-lg font-bold"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {c.value}
            {c.suit}
          </motion.div>
        ))}
      </div>

      {/* Bots */}
      <div className="absolute top-10 left-10">
        <div>🤖 Bot 1 ({hands[1].length})</div>
      </div>
      <div className="absolute top-10 right-10">
        <div>🤖 Bot 2 ({hands[2].length})</div>
      </div>
      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        <div>🤖 Bot 3 ({hands[3].length})</div>
      </div>

      {/* Người chơi */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="mb-2 font-semibold">
          {currentPlayer === 0 ? "👉 Tới lượt bạn" : "⏳ Chờ bot..."}
        </div>
        <div className="flex space-x-2 flex-wrap justify-center max-w-5xl">
          {hands[0].map((c) => (
            <Card
              key={c.id}
              card={c}
              selected={selectedCards.includes(c)}
              onClick={() => toggleSelect(c)}
              highlight={isValidMove([c], tableCards)}
            />
          ))}
        </div>

        {currentPlayer === 0 && !winner && (
          <div className="mt-4 space-x-4">
            <button
              onClick={() => playCards(selectedCards, 0)}
              className="px-6 py-2 bg-blue-500 rounded-lg shadow-lg hover:bg-blue-600"
            >
              Đánh
            </button>
            <button
              onClick={() => skipTurn(0)}
              className="px-6 py-2 bg-red-500 rounded-lg shadow-lg hover:bg-red-600"
            >
              Bỏ lượt
            </button>
          </div>
        )}

        {winner !== null && (
          <button
            onClick={startGame}
            className="mt-6 px-6 py-2 bg-yellow-400 text-black font-bold rounded-lg shadow-md hover:bg-yellow-500"
          >
            🔄 Chơi lại
          </button>
        )}
      </div>
    </div>
  );
}
