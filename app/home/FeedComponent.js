"use client";

import { useState } from "react";
import ConfessionFeed from "./ConfessionFeed";
import MarketFeed from "./MarketFeed";
import BagFeed from "./BagFeed"; // ✅ đổi StoryFeed -> BagFeed
import { MessageSquare, ShoppingBag, Backpack } from "lucide-react"; // đổi icon story -> bag

export default function FeedTabs({ user, profile }) {
  const [activeTab, setActiveTab] = useState("confession");

  const tabs = [
    { key: "confession", label: "Confession", icon: MessageSquare },
    { key: "market", label: "Market", icon: ShoppingBag },
    { key: "bag", label: "Bag", icon: Backpack }, // ✅ tab mới
  ];

  return (
    <div style={{ width: "100%", margin: "0 auto", padding: "0px" }}>
      {/* ===== TAB SELECTOR ===== */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "30px",
                border: "none",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "1em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: isActive
                  ? "linear-gradient(90deg, #1e90ff, #00bfff)"
                  : "#f1f2f6",
                color: isActive ? "#fff" : "#555",
                boxShadow: isActive ? "0 4px 12px rgba(30,144,255,0.3)" : "none",
                transition: "0.2s",
              }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div>
        {activeTab === "confession" && <ConfessionFeed user={user} profile={profile} />}
        {activeTab === "market" && <MarketFeed />}
        {activeTab === "bag" && <BagFeed user={user} profile={profile} />} {/* ✅ tab mới */}
      </div>
    </div>
  );
}
