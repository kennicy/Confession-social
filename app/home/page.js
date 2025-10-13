"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import MainContent from "./MainContent";
import DailyQuizPopup from "./DailyQuizPopup";
import { AnimatePresence } from "framer-motion";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("feed");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);

  // ====== TÍNH LEVEL DỰA TRÊN TỔNG THỜI GIAN ONLINE ======
  const calculateLevel = (totalSeconds) => {
    const totalHours = totalSeconds/3600;
    const thresholds = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
    let level = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (totalHours >= thresholds[i]) level = i + 1;
      else break;
    }
    return level;
  };

  // ====== XỬ LÝ LOGIN + CẬP NHẬT TRẠNG THÁI ======
  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/login");
        return;
      }
      if (!isMounted) return;

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData && isMounted) setProfile(profileData);

      setLoading(false);
      setShowQuiz(true);

      // === Khi mở trang thì đánh dấu online ===
      if (!document.hidden) {
        await updateOnlineStatus(user.id, true);
      }

      // === Cập nhật liên tục mỗi 60s để không bị miss khi user mở lâu ===
      const interval = setInterval(async () => {
        await updateOnlineStatus(user.id, true);
      }, 60000);

      // === Khi thoát trang hoặc tắt tab ===
      const handleBeforeUnload = () => {
        if (user?.id) {
          // Dùng sendBeacon để đảm bảo gói tin gửi đi dù tab bị đóng
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
          const payload = JSON.stringify({ is_online: false, last_online: new Date().toISOString() });

          navigator.sendBeacon(url, payload);
        }
      };

      // === Khi tab bị ẩn hoặc hiện lại ===
      const handleVisibilityChange = async () => {
        if (!user?.id) return;
        if (document.hidden) {
          await updateOnlineStatus(user.id, false);
        } else {
          await updateOnlineStatus(user.id, true);
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // === Theo dõi đăng xuất ===
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event) => {
          if (event === "SIGNED_OUT") {
            await updateOnlineStatus(user.id, false);
            setUser(null);
            router.push("/login");
          }
        }
      );

      return () => {
        isMounted = false;
        clearInterval(interval);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        authListener.subscription.unsubscribe();
      };
    };

    getUser();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // ====== CẬP NHẬT TRẠNG THÁI ONLINE VÀ LEVEL ======
  const updateOnlineStatus = async (userId, isOnline) => {
    try {
      const now = new Date().toISOString();

      const { data: profileData, error: getErr } = await supabase
        .from("profiles")
        .select("last_login, total_online_seconds")
        .eq("id", userId)
        .single();

      if (getErr) {
        console.error("Lỗi lấy profile:", getErr);
        return;
      }

      let updates = { is_online: isOnline };
      let totalSeconds = profileData?.total_online_seconds || 0;

      if (isOnline) {
        // === Online: lưu thời điểm login ===
        updates.last_login = now;
      } else {
        // === Offline: tính tổng thời gian online ===
        if (profileData?.last_login) {
          const lastLogin = new Date(profileData.last_login);
          const diffSeconds = Math.floor((new Date() - lastLogin) / 1000);
          totalSeconds += diffSeconds;
          updates.last_online = now;
          updates.total_online_seconds = totalSeconds;
          updates.level = calculateLevel(totalSeconds);
        } else {
          updates.last_online = now;
        }
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (updateErr) console.error("Lỗi cập nhật online:", updateErr);
      else console.log("✅ Cập nhật profile thành công:", updates);
    } catch (err) {
      console.error("Lỗi khi cập nhật online:", err);
    }
  };

  // ====== Ẩn popup quiz sau khi trả lời ======
  useEffect(() => {
    if (quizAnswered) {
      const timer = setTimeout(() => setShowQuiz(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [quizAnswered]);

  // ====== Loading UI ======
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #1e29ff, #6a5acd)",
          color: "#fff",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <div style={{ marginBottom: "30px", textAlign: "center" }}>
          <span
            style={{
              fontSize: "48px",
              fontWeight: "900",
              letterSpacing: "3px",
              background: "linear-gradient(90deg, #ff3b3b, #ff7b00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 4px 15px rgba(0,0,0,0.3)",
              display: "inline-block",
            }}
          >
            NOVA
          </span>
        </div>
        <div
          style={{
            width: "80px",
            height: "80px",
            border: "8px solid rgba(255,255,255,0.2)",
            borderTop: "8px solid #fff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p
          style={{
            marginTop: "20px",
            fontSize: "18px",
            fontWeight: "600",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          Đang tải dữ liệu, vui lòng chờ...
        </p>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // ====== Giao diện chính ======
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#ededed",
      }}
    >
      <LeftSidebar
        tab={tab}
        setTab={(newTab) => {
          setTab(newTab);
          setSelectedUserId(null);
        }}
        user={user}
        setUser={setUser}
      />
      <MainContent
        tab={tab}
        setTab={setTab}
        user={user}
        profile={profile}
        setProfile={setProfile}
        selectedUserId={selectedUserId}
      />
      <RightSidebar
        user={user}
        profile={profile}
        onSelectUser={(id) => setSelectedUserId(id)}
      />

      <AnimatePresence>
        {showQuiz && (
          <DailyQuizPopup
            user={user}
            profile={profile}
            setProfile={setProfile}
            onAnswer={() => setQuizAnswered(true)}
            onClose={() => setShowQuiz(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
