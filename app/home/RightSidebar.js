"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import BankComponent from "./BankComponent";

// ===== FORMAT TIME VN =====
function timeSinceVN(dateString) {
  if (!dateString) return "";
  const utcDate = new Date(dateString);
  const vnDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000); // +7h
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

export default function RightSidebar({ user }) {
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [highlightUserId, setHighlightUserId] = useState(null);

  const sortedUsers = useMemo(() => {
    return [...allUsers].sort((a, b) => {
      // Người hiện tại luôn lên đầu
      if (a.id === user?.id) return -1;
      if (b.id === user?.id) return 1;

      // Online lên trước offline
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;

      // Cả hai offline: sắp xếp theo last_online gần nhất
      if (!a.is_online && !b.is_online) {
        return new Date(b.last_online) - new Date(a.last_online);
      }

      // Cả hai online hoặc không có last_online -> giữ nguyên
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
                updated[idx].coin !== payload.new.coin
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
          background: "#1e90ff",
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
          backgroundColor: "#f4f7fb",
          borderLeft: "1px solid #ddd",
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
          <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "#1e90ff" }}>
            Online Users ({sortedUsers.filter((u) => u.is_online).length})
          </h3>
          <button
            onClick={() => setIsBankOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              backgroundColor: "#ffc107",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            🏦 Bank
          </button>
          {isBankOpen && <BankComponent currentUser={user} onClose={() => setIsBankOpen(false)} />}
        </div>

        {/* Users list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sortedUsers.map((u, index) => {
            const highlight = highlightUserId === u.id;
            return (
              <motion.div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  backgroundColor: u.id === user?.id ? "#e6f0ff" : highlight ? "#fff8e1" : "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
                whileHover={{ scale: 1.02, backgroundColor: "#e0f0ff" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * index } }}
              >
                <img
                  src={u.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/Sample_User_Icon.png"}
                  alt={u.full_name}
                  style={{
                    width: "45px",
                    height: "45px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: u.is_online ? "2px solid #00ff00" : "2px solid #ccc",
                    boxShadow: u.is_online ? "0 0 8px rgba(0,255,0,0.6)" : "none",
                  }}
                />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "bold",
                      fontSize: "15px",
                      color: "#111",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.full_name} {u.id === user?.id ? "(You)" : ""}
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#555", fontWeight: 600 }}>
                    💰 {new Intl.NumberFormat("vi-VN").format(u.coin ?? 0)} coin
                  </p>
                  {!u.is_online && u.last_online && (
                    <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>
                      Offline: {timeSinceVN(u.last_online)}
                    </p>
                  )}
                </div>
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: u.is_online ? "#00ff00" : "#999",
                    border: "2px solid #fff",
                    boxShadow: u.is_online ? "0 0 8px rgba(0,255,0,0.7)" : "0 0 4px rgba(0,0,0,0.2)",
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
