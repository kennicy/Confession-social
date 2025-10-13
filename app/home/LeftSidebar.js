"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home, User, MessageCircle, Bell, Settings,
  LogOut, Gamepad, Cloud, Briefcase, HelpCircle, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export default function LeftSidebar({ tab, setTab, user, setUser }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isOpen, setIsOpen] = useState(true); // toggle sidebar

  // ===== MENU ITEMS =====
  const menuItems = [
    { key: "feed", label: "Feed", icon: <Home size={18} /> },
    { key: "profile", label: "Profile", icon: <User size={18} /> },
    { key: "messages", label: "Messages", icon: <MessageCircle size={18} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { key: "drive", label: "Drive", icon: <Cloud size={18} /> },
    { key: "game", label: "Game", icon: <Gamepad size={18} /> },
    { key: "manager", label: "Manager", icon: <Briefcase size={18} /> },
    { key: "quiz", label: "Quiz", icon: <HelpCircle size={18} /> },
    { key: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  // ====== FETCH & SUBSCRIBE NOTIFICATIONS ======
  useEffect(() => {
    if (!user?.id) return;

    let lastCount = 0; // lưu số lượng badge trước đó

    const fetchUnread = async () => {
      const { data, count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("target_user_id", user.id)
        .eq("is_read", false)
        .neq("user_id", user.id); // loại bỏ các notification do chính user tạo

      if (!error) {
        if (count > lastCount) {
          const audio = new Audio("/sound/messages.mp3");
          audio.play().catch(err => console.log("Audio play error:", err));
        }
        lastCount = count || 0;
        setUnreadCount(count || 0);
      }
    };

    fetchUnread();

    const channel = supabase
      .channel("notifications_changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `target_user_id=eq.${user.id}`,
      }, (payload) => {
        // chỉ thêm nếu notification do người khác tạo
        if (payload.new.user_id !== user.id) fetchUnread();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);


  // ====== FETCH & SUBSCRIBE MESSAGES ======
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadMsg = async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (!error) {
        if (count > unreadMessages) {
          const audio = new Audio("/sound/messages.mp3");
          audio.play().catch(err => console.log("Audio play error:", err));
        }
        setUnreadMessages(count || 0);
      }
    };

    fetchUnreadMsg();

    const channel = supabase
      .channel("messages_changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `recipient_id=eq.${user.id}`,
      }, () => {
        fetchUnreadMsg();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      if (user?.id) {
        await supabase.from("profiles")
          .update({
            is_online: false,
            last_online: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
      await supabase.auth.signOut();

    } catch (err) {
      console.error("Logout error:", err.message);
    }
  };

  return (
    <>
      {/* Sidebar */}
      <motion.div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: isOpen ? "260px" : "0px",
          overflow: "hidden",
          background: "#121212ff", // giữ màu tối
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: isOpen ? "2px 0 16px rgba(0,0,0,0.12)" : "none",
          padding: isOpen ? "20px 15px" : "20px 0px",
          zIndex: 50,
        }}
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1, transition: { duration: 0.4 } }}
      >
        {isOpen && (
          <>
            {/* Logo */}
            <div
              onClick={() => (window.location.href = "/home")}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  fontSize: "42px",
                  fontWeight: 900,
                  letterSpacing: "2px",
                  background: "linear-gradient(90deg, #ff3b3b, #ff7b00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 2px 10px rgba(255,59,59,0.4)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                NOVA
              </span>
            </div>

            {/* Menu */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* Primary */}
              {menuItems
                .filter((i) =>
                  ["feed", "profile", "messages", "notifications"].includes(i.key)
                )
                .map((item) => {
                  const isActive = tab === item.key;
                  const badgeCount =
                    item.key === "notifications" ? unreadCount :
                    item.key === "messages" ? unreadMessages : 0;

                  return (
                    <motion.button
                      key={item.key}
                      onClick={() => setTab(item.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: "14px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: isActive ? 700 : 600,
                        background: isActive ? "#1e90ff" : "#222222ff",
                        boxShadow: isActive ? "0 4px 12px rgba(30,144,255,0.25)" : "none",
                        transition: "0.25s",
                      }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {item.icon} {item.label}
                      </div>
                      {badgeCount > 0 && (
                        <span
                          style={{
                            background: "red",
                            color: "#fff",
                            borderRadius: "999px",
                            fontSize: "12px",
                            padding: "2px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </motion.button>
                  );
                })}

              <hr style={{ margin: "12px 0", borderColor: "#333" }} />

              {/* Secondary */}
              {menuItems
                .filter((i) => ["drive", "game", "manager", "quiz"].includes(i.key))
                .map((item) => {
                  const isActive = tab === item.key;
                  return (
                    <motion.button
                      key={item.key}
                      onClick={() => {
                        setTab(item.key);
                        if (item.key === "drive") {
                          window.open(
                            "https://drive.google.com/drive/u/5/folders/1ZPk7m8gAw8c8nSMb_auPOcngfqvamhzq",
                            "_blank"
                          );
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "12px 16px",
                        borderRadius: "14px",
                        fontWeight: isActive ? 700 : 600,
                        background: isActive ? "#1e90ff" : "#222222ff",
                        transition: "0.25s",
                      }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {item.icon} {item.label}
                    </motion.button>
                  );
                })}

              <hr style={{ margin: "12px 0", borderColor: "#333" }} />

              {/* Settings */}
              {menuItems
                .filter((i) => i.key === "settings")
                .map((item) => (
                  <motion.button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontWeight: tab === item.key ? 700 : 600,
                      background: tab === item.key ? "#1e90ff" : "#222222ff",
                      transition: "0.25s",
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item.icon} {item.label}
                  </motion.button>
                ))}
            </div>

            {/* Logout */}
            <motion.div style={{ marginTop: "auto" }}>
              <motion.button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  border: "none",
                  cursor: "pointer",
                  background: "#ff6b81",
                  color: "#fff",
                  fontWeight: "bold",
                  transition: "0.3s",
                }}
                whileHover={{ scale: 1.05, backgroundColor: "#ff4757" }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut size={18} /> Logout
              </motion.button>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          top: "20px",
          left: isOpen ? "260px" : "20px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "none",
          background: "#1e90ff",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          cursor: "pointer",
          zIndex: 60,
        }}
        animate={{ left: isOpen ? "260px" : "20px", transition: { duration: 0.3 } }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </motion.button>
    </>
  );

}
