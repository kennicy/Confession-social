"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// Import các game
import DiceComponent from "./DiceComponent";
import BlackJackComponent from "./BlackJackComponent";
import EmpireComponent from "./EmpireComponent"; // 👈 thêm dòng này

// Icon
import { Dice5, Spade, Sprout } from "lucide-react";

export default function GamePage() {
  const games = {
    Dice: { component: DiceComponent, icon: <Dice5 size={18} /> },
    Blackjack: { component: BlackJackComponent, icon: <Spade size={18} /> },
    Empire: { component: EmpireComponent, icon: <Sprout size={18} /> }, // 👈 thêm game mới
  };

  const [activeGame, setActiveGame] = useState("Dice");
  const [user, setUser] = useState(null);
  const ActiveComponent = games[activeGame].component;

  // ===== Lấy user session =====
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session?.user) {
          console.log("No user session found");
          return;
        }
        setUser(session.user);
        console.log("User session:", session.user);
      } catch (err) {
        console.error("Error fetching user session:", err);
      }
    };

    fetchUser();
  }, []);

  if (!user) {
    return (
      <div
        style={{
          minHeight: "90vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "20px",
          fontWeight: "bold",
          color: "#444",
        }}
      >
        Loading user & coin... (check console)
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "90vh",
        padding: "40px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        background: "linear-gradient(135deg, #121212, #1e1e1e)",
        color: "#e5e7eb",
      }}
    >
      {/* Game Selection Tabs */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "40px",
          flexWrap: "wrap",
        }}
      >
        {Object.keys(games).map((game) => (
          <button
            key={game}
            onClick={() => setActiveGame(game)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              background:
                activeGame === game
                  ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                  : "#1f2937",
              color: activeGame === game ? "#fff" : "#d1d5db",
              fontWeight: "600",
              fontSize: "15px",
              boxShadow:
                activeGame === game
                  ? "0 4px 12px rgba(37, 99, 235, 0.5)"
                  : "0 2px 6px rgba(0,0,0,0.5)",
              transition: "all 0.3s ease",
            }}
          >
            {games[game].icon} {game}
          </button>
        ))}
      </div>

      {/* Render component của game đang active */}
      <div
        style={{
          background: "#1f2937",
          borderRadius: "16px",
          padding: "30px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.6)",
          color: "#e5e7eb",
        }}
      >
        <ActiveComponent user={user} />
      </div>
    </div>
  );
}
