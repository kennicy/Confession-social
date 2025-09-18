"use client";

import { useState, useEffect } from "react";
import DiceComponent from "./DiceComponent";
import BlackJackComponent from "./BlackJackComponent"; // Thêm các component khác tương tự
import { supabase } from "../../lib/supabaseClient";

export default function GamePage() {
  // Map tên game -> component
  const games = {
    Dice: DiceComponent,
    Blackjack: BlackJackComponent,
    // Thêm game mới ở đây: "TênGame": Component
  };

  const [activeGame, setActiveGame] = useState("Dice"); // mặc định Dice
  const [user, setUser] = useState(null);
  const ActiveComponent = games[activeGame];

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
      <div style={{ minHeight: "90vh", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px", fontWeight: "bold" }}>
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
        background: "#f0f2f5",
      }}
    >
      {/* Game Selection Tabs */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "40px" }}>
        {Object.keys(games).map((game) => (
          <button
            key={game}
            onClick={() => setActiveGame(game)}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              backgroundColor: activeGame === game ? "#1e90ff" : "#ddd",
              color: activeGame === game ? "#fff" : "#333",
              fontWeight: "bold",
              transition: "0.3s",
            }}
          >
            {game}
          </button>
        ))}
      </div>

      {/* Render component của game đang active */}
      <div>
        {/* Truyền user xuống component game */}
        <ActiveComponent user={user} />
      </div>
    </div>
  );
}
