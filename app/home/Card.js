"use client";

import { motion } from "framer-motion";

export default function Card({ card, selected, onClick, highlight }) {
  const isRed = card.suit === "♥" || card.suit === "♦";

  return (
    <motion.div
      onClick={onClick}
      animate={{ y: selected ? -25 : 0 }}
      whileHover={{ scale: 1.1 }}
      className={`
        px-3 py-4 rounded-lg shadow-md cursor-pointer border-2 text-lg font-bold
        ${selected ? "bg-yellow-200 border-yellow-500" : "bg-white border-gray-300"}
        ${highlight ? "ring-4 ring-green-400" : ""}
        ${isRed ? "text-red-600" : "text-black"}
      `}
    >
      {card.value}
      {card.suit}
    </motion.div>
  );
}
