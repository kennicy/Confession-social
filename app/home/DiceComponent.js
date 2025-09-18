"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

const diceFaces = [1, 2, 3, 4, 5, 6];
const betOptions = [500, 1000, 5000, 10000,20000, 50000, 100000, 200000,300000, 500000, 1000000, 2000000];
const choices = ["Tài", "Xỉu"];

export default function DiceComponent({ user }) {
  const [profile, setProfile] = useState(null);
  const [diceValues, setDiceValues] = useState([1, 1, 1]);
  const [rolling, setRolling] = useState(false);
  const [total, setTotal] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState("");
  const [selectedBet, setSelectedBet] = useState(betOptions[0]);
  const [selectedChoice, setSelectedChoice] = useState("Tài");
  const [loading, setLoading] = useState(true);

  // ================= Fetch profile + Realtime coin =================
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setLoading(false);
          return;
        }

        if (isMounted) setProfile(profileData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchProfile();

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          if (isMounted) setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ================= Roll dice =================
  const rollDice = async () => {
    if (!profile) return;
    if (rolling) return;
    if ((profile.coin || 0) < selectedBet) {
      alert("Bạn không đủ coin để cược!");
      return;
    }

    setRolling(true);
    setShowResult(false);

    let animationCount = 0;
    const interval = setInterval(() => {
      const dice1 = diceFaces[Math.floor(Math.random() * 6)];
      const dice2 = diceFaces[Math.floor(Math.random() * 6)];
      const dice3 = diceFaces[Math.floor(Math.random() * 6)];
      setDiceValues([dice1, dice2, dice3]);

      animationCount++;
      if (animationCount > 15) {
        clearInterval(interval);

        const sum = dice1 + dice2 + dice3;
        setTotal(sum);
        const outcome = sum >= 11 ? "Tài" : "Xỉu";
        setResult(outcome);

        // Tính coin
        let newCoin = profile.coin - selectedBet;
        if (selectedChoice === outcome) newCoin += selectedBet * 2;

        supabase
          .from("profiles")
          .update({ coin: newCoin })
          .eq("id", user.id)
          .then(({ data, error }) => {
            if (error) console.error("Update coin error:", error);
          });

        setProfile((prev) => ({ ...prev, coin: newCoin }));

        setTimeout(() => setShowResult(true), 300);
        setTimeout(() => {
          setRolling(false);
          setShowResult(false);
        }, 3000);
      }
    }, 80);
  };

  if (loading) return <p>Loading user & coin...</p>;
  if (!profile) return <p>Profile not found</p>;

  return (
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <div style={{ marginBottom: "20px", fontSize: "40px", fontWeight: "bold" }}>
        💰 Coin: {profile.coin?.toLocaleString() ?? 0}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
        {betOptions.map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBet(b)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: selectedBet === b ? "2px solid #1e90ff" : "1px solid #ccc",
              backgroundColor: selectedBet === b ? "#1e90ff" : "#f5f5f5",
              color: selectedBet === b ? "#fff" : "#111",
              cursor: "pointer",
              fontWeight: "bold",
              flex: "1 1 100px", // mỗi nút có thể co giãn, tối thiểu 100px
              textAlign: "center",
            }}
          >
            {b.toLocaleString()}
          </button>
        ))}
      </div>


      {/* Chọn Tài/Xỉu */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        {choices.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedChoice(c)}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: selectedChoice === c ? "2px solid #00d2ff" : "1px solid #ccc",
              backgroundColor: selectedChoice === c ? "#00d2ff" : "#f5f5f5",
              color: selectedChoice === c ? "#fff" : "#111",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "30px", marginBottom: "40px" }}>
        {diceValues.map((value, idx) => (
          <motion.div
            key={idx}
            animate={{ y: rolling ? [-120, 0] : 0, rotate: rolling ? [0, 360] : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 12 }}
            style={{
              width: "100px",
              height: "100px",
              backgroundColor: "#fff",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: "bold",
              boxShadow: "0 12px 25px rgba(0,0,0,0.5)",
            }}
          >
            {value}
          </motion.div>
        ))}

        <AnimatePresence>
          {showResult && (
            <motion.div
              key={total}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.3, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              style={{
                position: "absolute",
                top: "40%",
                left: "40%",
                fontSize: "80px",
                fontWeight: "bold",
                color: result === "Tài" ? "#00d2ff" : "#ff3860",
                textShadow: "0 0 20px rgba(0,0,0,0.8)",
              }}
            >
              {result} - {total}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={rollDice}
        disabled={rolling}
        style={{
          padding: "16px 32px",
          fontSize: "20px",
          fontWeight: "bold",
          borderRadius: "14px",
          border: "none",
          cursor: "pointer",
          background: rolling ? "#888" : "linear-gradient(90deg, #00d2ff, #0066ff)",
          color: "#fff",
          transition: "0.3s",
        }}
      >
        {rolling ? "Rolling..." : `Lắc Xí Ngầu (${selectedChoice})`}
      </button>
    </div>
  );
}
