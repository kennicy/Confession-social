"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import BankComponent from "./BankComponent";
import { useRouter } from "next/navigation";

// ===== FORMAT TIME VN =====
function timeSinceVN(dateString) {
  if (!dateString) return "";
  const utcDate = new Date(dateString);
  const vnDate = new Date(utcDate.getTime());
  const now = new Date();
  const seconds = Math.floor((now - vnDate) / 1000);

  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  const weeks = Math.floor(days / 7);
  return `${weeks} tuần trước`;
}

// ===== MÀU AURA THEO LEVEL =====
function getAuraColor(level) {
  if (level >= 10) return "from-[#ff00ff] via-[#ff0000] to-[#ff9900]"; // tím đỏ cam rực
  if (level >= 9) return "from-[#ff0000] via-[#ff9900] to-[#ffff00]";
  if (level >= 8) return "from-purple-500 via-pink-500 to-red-500";
  if (level >= 7) return "from-pink-400 via-red-400 to-orange-400";
  if (level >= 6) return "from-yellow-400 to-orange-500";
  if (level >= 5) return "from-green-400 to-cyan-400";
  if (level >= 4) return "from-blue-400 to-indigo-500";
  if (level >= 3) return "from-sky-400 to-blue-500";
  if (level >= 2) return "from-gray-400 to-gray-600";
  if (level >= 1) return "from-gray-500 to-gray-700";
  return "from-transparent to-transparent";
}

// ===== MÀU CHỮ LEVEL =====
function getLevelTextColor(level) {
  if (level >= 10) return "#ff006e";
  if (level >= 9) return "#ff2d55";
  if (level >= 8) return "#ef4444";
  if (level >= 7) return "#f97316";
  if (level >= 6) return "#facc15";
  if (level >= 5) return "#22c55e";
  if (level >= 4) return "#3b82f6";
  if (level >= 3) return "#06b6d4";
  if (level >= 2) return "#9ca3af";
  return "#6b7280";
}

export default function RightSidebar({ user, profile, onSelectUser }) {
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [highlightUserId, setHighlightUserId] = useState(null);
  const router = useRouter();

  // ===== SORT USERS =====
  const sortedUsers = useMemo(() => {
    return [...allUsers].sort((a, b) => {
      if (a.id === user?.id) return -1;
      if (b.id === user?.id) return 1;
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      if (!a.is_online && !b.is_online) {
        return new Date(b.last_online) - new Date(a.last_online);
      }
      return 0;
    });
  }, [allUsers, user?.id]);

  // ===== FETCH USERS & REALTIME =====
  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      const { data: users } = await supabase.from("profiles").select("*");
      if (users && isMounted) setAllUsers(users);
    };

    fetchUsers();

    const subscription = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          setAllUsers((prev) => {
            const idx = prev.findIndex((u) => u.id === payload.new.id);
            if (idx > -1) {
              const updated = [...prev];
              if (
                updated[idx].is_online !== payload.new.is_online ||
                updated[idx].coin !== payload.new.coin ||
                updated[idx].level !== payload.new.level
              ) {
                setHighlightUserId(payload.new.id);
                setTimeout(() => setHighlightUserId(null), 1200);
              }
              updated[idx] = { ...updated[idx], ...payload.new };
              return updated;
            } else {
              return [...prev, payload.new];
            }
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setIsRightOpen(!isRightOpen)}
        style={{
          position: "fixed",
          top: "50%",
          right: 0,
          transform: "translateY(-50%)",
          zIndex: 1100,
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px 0 0 8px",
          padding: "12px 6px",
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        }}
        whileHover={{ scale: 1.1 }}
      >
        {isRightOpen ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
      </motion.button>

      {/* Sidebar */}
      <motion.div
        style={{
          width: "300px",
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#0d0d0d",
          borderLeft: "1px solid #2a2a2a",
          padding: "20px 15px",
          overflowY: "auto",
          zIndex: 1000,
        }}
        initial={false}
        animate={{ x: isRightOpen ? 0 : 340 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "#3b82f6" }}>
            Online Users ({sortedUsers.filter((u) => u.is_online).length})
          </h3>
          <button
            onClick={() => setIsBankOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              backgroundColor: "#1f2937",
              color: "#facc15",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            🏦 Bank
          </button>
          {isBankOpen && (
            <BankComponent currentUser={user} onClose={() => setIsBankOpen(false)} />
          )}
        </div>

        {/* Users list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sortedUsers.map((u, index) => {
            const highlight = highlightUserId === u.id;
            const level = u.level ?? 0;

            const auraColor = getAuraColor(level);
            const levelColor = getLevelTextColor(level);

            return (
              <motion.div
                key={u.id}
                onClick={() => onSelectUser(u.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  backgroundColor:
                    u.id === user?.id
                      ? "#1a1a1a"
                      : highlight
                      ? "#222"
                      : "#121212",
                  border: "1px solid #2a2a2a",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
                whileHover={{ scale: 1.02, backgroundColor: "#2d2d2d" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * index } }}
              >
                {/* Avatar + Aura */}
                <div className="flex flex-col items-center relative">
                  <div
                    className={`relative w-[46px] h-[46px] rounded-full p-[2px] bg-gradient-to-r ${auraColor}`}
                  >
                    <img
                      src={
                        u.avatar_url ||
                        "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
                      }
                      alt={u.full_name}
                      className="w-full h-full rounded-full border border-gray-800 object-cover"
                    />
                  </div>

                  {/* Level badge dưới avatar */}
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: levelColor,
                      textShadow: "0 0 6px rgba(0,0,0,0.6)",
                    }}
                  >
                    Lv. {level}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "bold",
                      fontSize: "15px",
                      color: "#f5f5f5",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.full_name} {u.id === user?.id ? "(You)" : ""}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "#d1d5db",
                      fontWeight: 600,
                    }}
                  >
                    💰 {new Intl.NumberFormat("vi-VN").format(u.coin ?? 0)} coin
                  </p>
                  {!u.is_online && u.last_online && (
                    <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                      Offline: {timeSinceVN(u.last_online)}
                    </p>
                  )}
                </div>

                {/* Status dot */}
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: u.is_online ? "#22c55e" : "#6b7280",
                    border: "2px solid #111",
                    boxShadow: u.is_online
                      ? "0 0 8px rgba(34,197,94,0.7)"
                      : "0 0 4px rgba(0,0,0,0.2)",
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
