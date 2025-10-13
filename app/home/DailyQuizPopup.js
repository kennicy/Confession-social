"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dailyWords } from "./DailyWordsData";
import { supabase } from "../../lib/supabaseClient";
import { CheckCircle, XCircle, Star } from "lucide-react";

export default function DailyQuizPopup({ user, profile, setProfile, onAnswer }) {
  const [currentWord, setCurrentWord] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

  useEffect(() => {
    if (dailyWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * dailyWords.length);
      const wordObj = dailyWords[randomIndex];
      setCurrentWord({ ...wordObj, options: shuffleArray(wordObj.options) });
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  }, []);

  const handleAnswer = async (choice) => {
    if (isAnswered) return;

    setSelectedAnswer(choice);
    setIsAnswered(true);

    const correct = choice === currentWord.answer;

    if (correct && user && profile) {
      const { data, error } = await supabase
        .from("profiles")
        .update({ coin: (profile.coin || 0) + 500 })
        .eq("id", user.id)
        .select()
        .single();

      if (!error && data) setProfile(data);
    }

    onAnswer(); // thông báo HomePage đã trả lời
  };

  if (!currentWord) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)", // nền tối hơn
          backdropFilter: "blur(6px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999,
        }}
      >
        <motion.div
          initial={{ y: -60, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            background: "linear-gradient(145deg, #1a1a1a, #222)", // dark mode
            borderRadius: "25px",
            width: "440px",
            maxWidth: "90%",
            padding: "40px 30px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
            textAlign: "center",
            fontFamily: "'Segoe UI', sans-serif",
            color: "#ededed", // chữ sáng
          }}
        >
          {/* Title */}
          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            style={{
              marginBottom: "20px",
              fontSize: "28px",
              fontWeight: 700,
              color: "#4dabf7", // xanh sáng nổi bật trên dark
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
            }}
          >
            🎯 Daily Quiz <Star size={20} color="#ffbf00" />
          </motion.h2>

          {/* Word to translate */}
          <motion.p
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 250 }}
            style={{
              marginBottom: "30px",
              fontSize: "22px",
              fontWeight: 600,
              color: "#f0f0f0",
            }}
          >
            Translate: <span style={{ color: "#ff6f61" }}>{currentWord.word}</span>
          </motion.p>

          {/* Options */}
          {currentWord.options.map((opt) => {
            const isSelected = selectedAnswer === opt;
            const isCorrect = opt === currentWord.answer;

            let bgColor = "linear-gradient(90deg, #333, #444)"; // dark default
            let icon = null;

            if (isAnswered) {
              if (isSelected && isCorrect) {
                bgColor = "linear-gradient(90deg, #4caf50, #66bb6a)";
                icon = <CheckCircle size={20} />;
              } else if (isSelected && !isCorrect) {
                bgColor = "linear-gradient(90deg, #f44336, #ef5350)";
                icon = <XCircle size={20} />;
              } else if (isCorrect) {
                bgColor = "linear-gradient(90deg, #4caf50, #66bb6a)";
              }
            }

            return (
              <motion.button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={isAnswered}
                whileHover={{ scale: isAnswered ? 1 : 1.05 }}
                whileTap={{ scale: isAnswered ? 1 : 0.95 }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "14px 20px",
                  margin: "10px 0",
                  borderRadius: "15px",
                  border: "none",
                  background: bgColor,
                  color: "#fff",
                  fontSize: "17px",
                  cursor: isAnswered ? "default" : "pointer",
                  fontWeight: 600,
                  boxShadow: "0 5px 15px rgba(0,0,0,0.4)",
                  transition: "all 0.3s",
                }}
              >
                {opt} {icon}
              </motion.button>
            );
          })}

          {/* Result text */}
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: "25px",
                fontWeight: 700,
                fontSize: "20px",
                color: "#4dabf7",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {selectedAnswer === currentWord.answer ? (
                <>
                  <CheckCircle size={24} color="#4caf50" /> Correct! +500 coin
                </>
              ) : (
                <>
                  <XCircle size={24} color="#f44336" /> Wrong!
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
