"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Loading from "../Loading/Loading";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.push("/feed");
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return alert(error.message);
    }
    setTimeout(() => router.push("/feed"), 1000);
  };

  return (
    <>
      {loading && <Loading text="Đang đăng nhập..." />}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(-45deg, #6b73ff, #000dff, #ff6a00, #ff0000)",
          backgroundSize: "400% 400%",
          animation: "gradientBG 15s ease infinite",
          fontFamily: "'Inter', sans-serif",
          color: "#fff", // chữ chính luôn trắng
        }}
      >
        <style>{`
          @keyframes gradientBG {
            0% {background-position:0% 50%;}
            50% {background-position:100% 50%;}
            100% {background-position:0% 50%;}
          }
        `}</style>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.25)", // dark glass
            backdropFilter: "blur(25px)",
            borderRadius: "25px",
            padding: "50px 40px",
            width: "100%",
            maxWidth: "450px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "all 0.3s",
            color: "#fff", // chữ nổi bật trên nền
          }}
        >
          <h2
            style={{
              color: "#fff",
              fontSize: "2.2em",
              marginBottom: "35px",
              letterSpacing: "1px",
              textShadow: "0 2px 10px rgba(0,0,0,0.6)",
            }}
          >
            Welcome Back
          </h2>

          <form
            onSubmit={handleLogin}
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: "20px",
            }}
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: "16px 22px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.3)",
                outline: "none",
                fontSize: "1em",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                transition: "0.3s",
              }}
              onFocus={(e) => {
                e.target.style.border = "1px solid #ffd700";
                e.target.style.boxShadow = "0 0 10px #ffd700";
              }}
              onBlur={(e) => {
                e.target.style.border = "1px solid rgba(255,255,255,0.3)";
                e.target.style.boxShadow = "none";
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: "16px 22px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.3)",
                outline: "none",
                fontSize: "1em",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                transition: "0.3s",
              }}
              onFocus={(e) => {
                e.target.style.border = "1px solid #ffd700";
                e.target.style.boxShadow = "0 0 10px #ffd700";
              }}
              onBlur={(e) => {
                e.target.style.border = "1px solid rgba(255,255,255,0.3)";
                e.target.style.boxShadow = "none";
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "16px 0",
                borderRadius: "14px",
                border: "none",
                fontWeight: "bold",
                fontSize: "1.15em",
                cursor: loading ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, #ff7e5f, #feb47b)",
                color: "#fff",
                boxShadow: "0 6px 25px rgba(0,0,0,0.4)",
                transition: "0.3s",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 10px 30px rgba(255,214,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 6px 25px rgba(0,0,0,0.4)";
              }}
            >
              {loading ? "Đang đăng nhập..." : "Login"}
            </button>
          </form>

          <p
            style={{
              marginTop: "30px",
              fontSize: "0.95em",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            Chưa có tài khoản?{" "}
            <a
              href="/signup"
              style={{
                color: "#ffd700",
                fontWeight: "bold",
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                transition: "0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#fff")}
              onMouseLeave={(e) => (e.target.style.color = "#ffd700")}
            >
              Đăng ký
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
