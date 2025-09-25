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

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);

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

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData && isMounted) setProfile(profileData);

      setLoading(false);
      setShowQuiz(true);

      // ===== SET ONLINE =====
      await supabase
        .from("profiles")
        .update({ is_online: true })
        .eq("id", user.id);

      // ===== EVENT: BEFORE UNLOAD =====
      const handleBeforeUnload = async () => {
        await supabase
          .from("profiles")
          .update({ 
            is_online: false, 
            last_online: new Date().toISOString() 
          })
          .eq("id", user.id);
      };

      // ===== EVENT: VISIBLE CHANGE (chuyển tab) =====
      const handleVisibilityChange = async () => {
        if (document.hidden) {
          await supabase
            .from("profiles")
            .update({ 
              is_online: false, 
              last_online: new Date().toISOString() 
            })
            .eq("id", user.id);
        } else {
          await supabase
            .from("profiles")
            .update({ is_online: true })
            .eq("id", user.id);
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      /// ===== Supabase Auth Listener =====
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event) => {
          if (event === "SIGNED_OUT") {
            // Khi user sign out → chắc chắn redirect login
            setUser(null);
            router.push("/login");
          }
        }
      );
      return () => {
        isMounted = false;
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

  useEffect(() => {
    if (quizAnswered) {
      const timer = setTimeout(() => setShowQuiz(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [quizAnswered]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #1e29ffff, #6a5acd)",
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
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9fbfd" }}>
      <LeftSidebar tab={tab} setTab={setTab} user={user} setUser={setUser} />
      <MainContent tab={tab} setTab={setTab} user={user} profile={profile} setProfile={setProfile} />
      <RightSidebar user={user} profile={profile} />

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
