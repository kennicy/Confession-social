"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Loading from "../Loading/Loading";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Signup user trực tiếp, bỏ qua email confirmation
    const { data, error } = await supabase.auth.signUp({ email, password }, { redirectTo: "/" });
    setLoading(false);

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage("✅ Đăng ký thành công!");
      setTimeout(() => router.push("/login"), 1000);
    }
  };

  return (
    <>
      {loading && <Loading text="Đang đăng ký..." />}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(-45deg, #ff7eb3, #ff758c, #6b73ff, #000dff)",
          backgroundSize: "400% 400%",
          animation: "gradientBG 15s ease infinite",
          fontFamily: "'Inter', sans-serif",
          color: "#fff",
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
            background: "rgba(0,0,0,0.25)",
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
            Tạo tài khoản
          </h2>

          <form
            onSubmit={handleSignup}
            style={{ display: "flex", flexDirection: "column", width: "100%", gap: "20px" }}
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
              placeholder="Mật khẩu"
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
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </button>
          </form>

          {message && (
            <p
              style={{
                marginTop: "25px",
                fontSize: "1em",
                color: message.startsWith("✅") ? "#4caf50" : "#ff5555",
                fontWeight: "bold",
              }}
            >
              {message}
            </p>
          )}

          <p
            style={{
              marginTop: "25px",
              fontSize: "0.95em",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Đã có tài khoản?{" "}
            <a
              href="/login"
              style={{
                color: "#ffd700",
                fontWeight: "bold",
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                transition: "0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#fff")}
              onMouseLeave={(e) => (e.target.style.color = "#ffd700")}
            >
              Đăng nhập
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
