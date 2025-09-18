"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Home, User, MessageCircle, CalendarDays, Bell, Settings, LogOut, Gamepad, Clock, Cloud
} from "lucide-react";
import { motion } from "framer-motion";
import FeedComponent from "./FeedComponent";
import ProFileComponent from "./ProFileComponent";
import MeetingVoteComponent from "./MeetingVoteComponent";
import MessagesComponent from "./MessagesComponent";
import CalendarComponent from "./CalendarComponent";
import GameComponent from "./GameComponent";
import NotificationComponent from "./NotificationComponent";
import BankComponent from "./BankComponent";

// ==== Daily Words Quiz ====
const dailyWords = [
  { word: "abandon", options: ["bỏ rơi", "bắt đầu", "thành công", "giữ gìn"], answer: "bỏ rơi" },
  { word: "accommodate", options: ["đáp ứng, chứa được", "làm khó", "giữ nguyên", "từ chối"], answer: "đáp ứng, chứa được" },
  { word: "agenda", options: ["chương trình nghị sự", "hợp đồng", "bản báo cáo", "hóa đơn"], answer: "chương trình nghị sự" },
  { word: "allocate", options: ["phân bổ", "giữ lại", "tiêu hao", "bỏ qua"], answer: "phân bổ" },
  { word: "annual", options: ["hàng năm", "hiếm khi", "tạm thời", "ngẫu nhiên"], answer: "hàng năm" },
  { word: "appraisal", options: ["sự thẩm định", "sự cải tiến", "sự thất bại", "sự hợp tác"], answer: "sự thẩm định" },
  { word: "assemble", options: ["lắp ráp", "tách rời", "giấu đi", "phá hủy"], answer: "lắp ráp" },
  { word: "audit", options: ["kiểm toán", "tuyển dụng", "lập kế hoạch", "tiếp thị"], answer: "kiểm toán" },
  { word: "benevolent", options: ["nhân từ", "ác độc", "giàu có", "khó khăn"], answer: "nhân từ" },
  { word: "candidate", options: ["ứng viên", "khách hàng", "giám đốc", "giáo viên"], answer: "ứng viên" },
  { word: "collaborate", options: ["hợp tác", "cạnh tranh", "tách biệt", "bỏ qua"], answer: "hợp tác" },
  { word: "confidential", options: ["bí mật", "công khai", "bắt buộc", "tạm thời"], answer: "bí mật" },
  { word: "consolidate", options: ["củng cố, hợp nhất", "chia tách", "giảm bớt", "trì hoãn"], answer: "củng cố, hợp nhất" },
  { word: "crucial", options: ["quan trọng", "không quan trọng", "xa xôi", "giản đơn"], answer: "quan trọng" },
  { word: "deadline", options: ["hạn chót", "ngày nghỉ", "giờ làm việc", "khoảng thời gian"], answer: "hạn chót" },
  { word: "deduct", options: ["khấu trừ", "tăng thêm", "giữ nguyên", "thêm vào"], answer: "khấu trừ" },
  { word: "deficit", options: ["thâm hụt", "dư thừa", "tăng trưởng", "cân đối"], answer: "thâm hụt" },
  { word: "deteriorate", options: ["xấu đi, suy giảm", "ổn định", "cải thiện", "phát triển"], answer: "xấu đi, suy giảm" },
  { word: "endorse", options: ["chứng thực", "từ chối", "phê bình", "bỏ qua"], answer: "chứng thực" },
  { word: "evaluate", options: ["đánh giá", "bỏ qua", "chấp nhận", "trì hoãn"], answer: "đánh giá" },
  { word: "feasible", options: ["khả thi", "bất khả thi", "ngẫu nhiên", "tạm thời"], answer: "khả thi" },
  { word: "freight", options: ["hàng hóa vận chuyển", "doanh thu", "giấy phép", "lợi nhuận"], answer: "hàng hóa vận chuyển" },
  { word: "headquarters", options: ["trụ sở chính", "chi nhánh", "phòng họp", "nhà kho"], answer: "trụ sở chính" },
  { word: "inventory", options: ["hàng tồn kho", "doanh thu", "chi phí", "tài sản"], answer: "hàng tồn kho" },
  { word: "liaison", options: ["người liên lạc", "đối thủ", "chứng từ", "nhà cung cấp"], answer: "người liên lạc" },
];

function timeSince(dateString) {
  if (!dateString) return "";

  // Convert UTC to VN time
  const utcDate = new Date(dateString);
  const vnDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000); // +7h

  const seconds = Math.floor((new Date() - vnDate) / 1000);

  let interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} giờ trước`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} phút trước`;
  return "Vừa xong";
}

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("feed");
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [showPopup, setShowPopup] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const requiredFields = ["full_name", "avatar_url", "nickname", "year"];
  const [isBankOpen, setIsBankOpen] = useState(false);
  
  

  // ===== INIT SESSION + PROFILE + COIN =====
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/"); // chưa login → về login
          return;
        }

        setUser(session.user);

        // Lấy profile nhưng không block flow nếu chưa có
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileData) {
          // Coin daily login
          const today = new Date().toISOString().split("T")[0];
          if (profileData.last_login_date !== today) {
            const newCoin = Number(profileData.coin || 0) + 10000;
            await supabase
              .from("profiles")
              .update({ coin: newCoin, last_login_date: today })
              .eq("id", session.user.id);
            profileData.coin = newCoin;
            profileData.last_login_date = today;
          }

          setProfile(profileData);

          // Tab mặc định
          const requiredFields = ["full_name", "avatar_url", "nickname", "year"];
          const isProfileIncomplete = requiredFields.some(
            field => !profileData[field] || profileData[field].toString().trim() === ""
          );
          setTab(isProfileIncomplete ? "profile" : "feed");
        } else {
          console.warn("Profile chưa tồn tại, sẽ vào home bình thường");
          setTab("feed"); // vẫn vào feed
        }

        setLoading(false);

        // Lấy danh sách user để hiển thị sidebar
        const { data: users } = await supabase.from("profiles").select("*");
        if (users && isMounted) setAllUsers(users);

      } catch (err) {
        console.error("Lỗi init FeedPage:", err);
        setLoading(false); // luôn tắt loading
      }
    };

    init();

    return () => { isMounted = false; };
  }, [router]);

  // ===== REALTIME ONLINE STATUS =====
  useEffect(() => {
    if (!user?.id) return;

    // ====== Update online/offline status ======
    const setOnlineStatus = async (online) => {
      if (online) {
        await supabase
          .from("profiles")
          .update({ is_online: true })
          .eq("id", user.id);
      } else {
        await supabase
          .from("profiles")
          .update({
            is_online: false,
            last_online: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
    };
    setOnlineStatus(true);

    // ====== Fetch unread notifications ======
    const fetchUnread = async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (!error) setUnreadCount(count);
    };
    fetchUnread();

    const handleBeforeUnload = () => {
      setOnlineStatus(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOnlineStatus(false);
      } else {
        setOnlineStatus(true);
      }
    };

    // ====== Event listeners ======
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Channel cho profiles
    const profileChannel = supabase
      .channel("realtime-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          setAllUsers((prev) =>
            prev.map((u) => (u.id === payload.new.id ? payload.new : u))
          );
        }
      )
      .subscribe();

    // Listen realtime messages
    const messageChannel = supabase
    .channel("realtime-messages-feedpage")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        // Listen tất cả messages liên quan tới user: gửi hoặc nhận
        filter: `recipient_id=eq.${user.id}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" && payload.new.is_read === false) {
          setUnreadMessages((prev) => prev + 1); // badge tăng
        }

        if (payload.eventType === "UPDATE") {
          // Nếu tin nhắn từ chưa đọc → đọc, giảm badge
          if (payload.old.is_read === false && payload.new.is_read === true) {
            setUnreadMessages((prev) => Math.max(prev - 1, 0));
          }
        }

        if (payload.eventType === "DELETE" && payload.old.is_read === false) {
          setUnreadMessages((prev) => Math.max(prev - 1, 0));
        }
      }
    )
    .subscribe();

    // ===== Realtime notifications =====
    const notificationChannel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new.user_id === user.id && !payload.new.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new.user_id === user.id && payload.new.is_read) {
            setUnreadCount((prev) => Math.max(prev - 1, 0));
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setOnlineStatus(false);
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [user?.id]);

  // ===== QUIZ: random 1 từ mỗi lần popup mở =====
  useEffect(() => {
    if (showPopup && dailyWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * dailyWords.length);
      setCurrentWord(dailyWords[randomIndex]);
      setSelectedAnswer(null);
    }
  }, [showPopup]);

  const handleAnswer = async (choice) => {
    if (selectedAnswer) return;
    setSelectedAnswer(choice);

    if (choice === currentWord.answer) {
      await supabase
        .from("profiles")
        .update({ coin: (profile.coin || 0) + 500 })
        .eq("id", user.id);
      setProfile(prev => ({ ...prev, coin: (prev.coin || 0) + 500 }));
    }

    // Tự đóng popup sau 1 giây
    setTimeout(() => {
      setShowPopup(false);
    }, 1000);
  };

  // ===== MENU ITEMS =====
  const menuItems = [
    { key: "feed", label: "Feed", icon: <Home size={18} /> },
    { key: "profile", label: "Profile", icon: <User size={18} /> },
    { key: "messages", label: "Messages", icon: <MessageCircle size={18} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { key: "drive", label: "Drive", icon: <Cloud size={18} /> },
    { key: "game", label: "Game", icon: <Gamepad size={18} /> },
    { key: "calendar", label: "Calendar", icon: <CalendarDays size={18} /> },
    { key: "timemeet", label: "Timemeet Vote", icon: <Clock size={18} /> },
    { key: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const sortedUsers = useMemo(() => {
    return [...allUsers].sort((a, b) => {
      if (a.id === user?.id) return -1;
      if (b.id === user?.id) return 1;
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      return 0;
    });
  }, [allUsers, user?.id]);

  const handleLogout = async () => {
    if (user?.id)
      await supabase
        .from("profiles")
        .update({ is_online: false, last_online: new Date().toISOString() })
        .eq("id", user.id);
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <LoadingScreen />;
  

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontWeight: "bold" }}>
      {/* Sidebar trái */}
      <motion.div
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: "250px",
          backgroundColor: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between",
          boxShadow: "2px 0 12px rgba(0,0,0,0.1)", padding: "15px",
        }}
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1, transition: { duration: 0.5 } }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <span
              style={{
                fontSize: "42px",
                fontWeight: "900",
                letterSpacing: "3px",
                background: "linear-gradient(90deg, #ff3b3b, #990000)", // đỏ sáng → đỏ đậm
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 2px 8px rgba(153,0,0,0.6)", // bóng đỏ đậm
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              NOVA
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#666",
                marginLeft: "6px",
                fontStyle: "italic",
                marginBottom: "4px",
              }}
            >
              web
            </span>
          </div>
        </div>

        {/* Menu */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "15px" }}>
          {menuItems
            .filter((i) =>
              ["feed", "profile", "messages", "notifications"].includes(i.key)
            )
            .map((item) => {
              const isActive = tab === item.key;

              const handleClick = async () => {
                setTab(item.key);

                if (item.key === "notifications") {
                  // Update tất cả notification chưa đọc thành đã đọc
                  const { error } = await supabase
                    .from("notifications")
                    .update({ is_read: true })
                    .eq("user_id", user.id)
                    .eq("is_read", false);

                  if (error) console.error("Lỗi update is_read:", error);
                  else setUnreadCount(0); // Reset badge notifications
                }

                // Với messages thì KHÔNG reset badge, MessagesComponent sẽ handle is_read
              };

              return (
                <motion.button
                  key={item.key}
                  onClick={handleClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    marginBottom: "8px",
                    fontWeight: isActive ? "bold" : "600",
                    backgroundColor: isActive ? "#1e90ff" : "#f7f8fa",
                    color: isActive ? "#fff" : "#222",
                    boxShadow: isActive ? "0 4px 12px rgba(30,144,255,0.4)" : "none",
                    transition: "all 0.25s",
                    textAlign: "left",
                    width: "100%",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {item.icon} {item.label}
                  </div>

                  {/* Badge */}
                  {item.key === "notifications" && unreadCount > 0 && (
                    <span
                      style={{
                        background: "red",
                        color: "white",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        padding: "2px 8px",
                        fontWeight: "bold",
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                  {item.key === "messages" && unreadMessages > 0 && (
                    <span
                      style={{
                        background: "red",
                        color: "white",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        padding: "2px 8px",
                        fontWeight: "bold",
                      }}
                    >
                      {unreadMessages}
                    </span>
                  )}
                </motion.button>
              );
            })}

          <hr />

          {/* Secondary Menu */}
          {menuItems
            .filter((i) => ["drive", "calendar", "timemeet", "game"].includes(i.key))
            .map((item) => {
              const isActive = tab === item.key;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => {
                    setTab(item.key);
                    if (item.key === "drive")
                      window.open(
                        "https://drive.google.com/drive/folders/1ZPk7m8gAw8c8nSMb_auPOcngfqvamhzq?usp=sharing",
                        "_blank"
                      );
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    marginBottom: "8px",
                    fontWeight: isActive ? "bold" : "600",
                    backgroundColor: isActive ? "#1e90ff" : "#f7f8fa",
                    color: isActive ? "#fff" : "#222",
                    boxShadow: isActive ? "0 4px 12px rgba(30,144,255,0.4)" : "none",
                    transition: "all 0.25s",
                    textAlign: "left",
                    width: "100%",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.icon} {item.label}
                </motion.button>
              );
            })}

          <hr />

          {/* Settings */}
          {menuItems
            .filter((i) => ["settings"].includes(i.key))
            .map((item) => {
              const isActive = tab === item.key;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    marginBottom: "8px",
                    fontWeight: isActive ? "bold" : "600",
                    backgroundColor: isActive ? "#1e90ff" : "#f7f8fa",
                    color: isActive ? "#fff" : "#222",
                    boxShadow: isActive ? "0 4px 12px rgba(30,144,255,0.4)" : "none",
                    transition: "all 0.25s",
                    textAlign: "left",
                    width: "100%",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.icon} {item.label}
                </motion.button>
              );
            })}
        </div>

        {/* Logout */}
        <motion.div style={{ marginTop: "auto" }} initial={{ opacity:0 }} animate={{ opacity:1, transition:{delay:0.5} }}>
          <motion.button onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 16px", borderRadius:"12px", border:"none", cursor:"pointer", backgroundColor:"#ff6b81", color:"#fff", fontWeight:"bold", boxShadow:"0 4px 12px rgba(255,107,129,0.3)", transition:"0.25s" }} whileHover={{ scale:1.05, backgroundColor:"#ff4757" }} whileTap={{ scale:0.95 }}>
            <LogOut size={18}/> Logout
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Sidebar phải: Users */}
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
            padding: "10px 6px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
          whileHover={{ scale: 1.1 }}
        >
          {isRightOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </motion.button>

        {/* Sidebar */}
        <motion.div
          style={{
            width: "300px",
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#f7f8fa",
            borderLeft: "1px solid #ddd",
            padding: "20px",
            overflowY: "auto",
            zIndex: 1000,
          }}
          initial={false}
          animate={{ x: isRightOpen ? 0 : 320 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ fontWeight: "bold" }}>
              Users ({sortedUsers.filter((u) => u.is_online).length} online)
            </h3>

            {/* Nút Bank */}
            <button
              onClick={() => setIsBankOpen(true)}
              style={{
                padding: "6px 12px",
                backgroundColor: "#ffc107",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              🏦Bank
            </button>
            {/* Popup Bank */}
            {isBankOpen && <BankComponent currentUser={user} onClose={() => setIsBankOpen(false)} />}
          </div>

          {/* List Users */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {sortedUsers.map((u, index) => (
              <motion.div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  backgroundColor: u.id === user?.id ? "#e6f0ff" : "transparent",
                  cursor: "pointer",
                }}
                whileHover={{ scale: 1.02, backgroundColor: "#d0e4ff" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.05 * index },
                }}
              >
                <img
                  src={
                    u.avatar_url ||
                    "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
                  }
                  alt={u.full_name}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: "#111",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.id === user?.id ? u.full_name : "Anonymous"}{" "}
                    {u.id === user?.id ? "(You)" : ""}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "#555",
                      fontWeight: "600",
                    }}
                  >
                    💰 {new Intl.NumberFormat("vi-VN").format(u.coin ?? 0)} coin
                    {!u.is_online && u.last_online
                      ? ` • Offline ${timeSince(u.last_online)}`
                      : ""}
                  </p>
                </div>
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: u.is_online ? "#00FF00" : "#999",
                    border: "2px solid #fff",
                    boxShadow: u.is_online
                      ? "0 0 8px rgba(0,255,0,0.7)"
                      : "0 0 4px rgba(0,0,0,0.2)",
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </>

      {/* Main content */}
      <motion.div style={{ flex:1, padding:"20px", marginLeft:"250px", marginRight:"280px" }} initial={{opacity:0}} animate={{opacity:1, transition:{duration:0.5}}}>
        <div style={{ maxWidth:"800px", margin:"0 auto" }}>
          {tab==="feed" && <FeedComponent user={user} profile={profile} />}
          {tab==="profile" && <ProFileComponent user={user} profile={profile} setProfile={setProfile}/>}
          {tab==="messages" && <MessagesComponent user={user} />}
          {tab==="timemeet" && <MeetingVoteComponent user={user} />}
          {tab==="notifications" && <NotificationComponent user={user} />}
          {tab==="settings" && <div>Settings</div>}
          {tab==="game" && <GameComponent user={user} />}
          {tab==="calendar" && <CalendarComponent user={user} />}
          {tab==="drive" && <div>Drive (upload/lưu file)</div>}
        </div>
      </motion.div>

      {/* Popup Quiz */}
      {showPopup && currentWord && (
        <motion.div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px 32px",
              borderRadius: "16px",
              width: "400px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#333" }}>
              🎯 Quiz Daily Word
            </h2>
            <p style={{ margin: 0, fontSize: "15px", color: "#555" }}>
              Chọn nghĩa đúng của từ: <strong>{currentWord.word}</strong>
            </p>

            {/* Các đáp án */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              {currentWord.options.map((opt) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === currentWord.answer;

                return (
                  <motion.button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!selectedAnswer} 
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #1e90ff",
                      backgroundColor: isSelected
                        ? isCorrect
                          ? "#00c851"
                          : "#ff4444"
                        : "#f9f9f9",
                      color: isSelected ? "#fff" : "#111",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                    whileHover={{ scale: !selectedAnswer ? 1.03 : 1 }}
                    whileTap={{ scale: !selectedAnswer ? 0.97 : 1 }}
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </div>

            {/* Hiển thị đúng/sai */}
            {selectedAnswer && (
              <p style={{ marginTop: "12px", fontWeight: "bold", color: selectedAnswer === currentWord.answer ? "#00c851" : "#ff4444" }}>
                {selectedAnswer === currentWord.answer ? "✅ Correct!" : `❌ Wrong! Đáp án: ${currentWord.answer}`}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ===== Loading Component =====
function LoadingScreen() {
  return (
    <div style={{
      width: "100%",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: "20px",
      fontWeight: "bold",
      color: "#1e90ff",
    }}>
      Loading...
    </div>
  );
}
