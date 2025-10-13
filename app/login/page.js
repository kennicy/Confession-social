"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check nếu đã login → chuyển thẳng vào Feed/Home
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/home"); 
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Login bằng Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (!data?.user?.id) {
        setError("Đăng nhập thất bại. Thử lại sau.");
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // 2. Lưu session/token
      localStorage.setItem("sb-user", JSON.stringify(data.session));

      // 3. Lấy profile (nếu có), nhưng không block flow nếu lỗi
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("coin, last_login_date")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn("Profile chưa tồn tại, tiếp tục vào home bình thường");
      } else {
        // Cập nhật coin nếu chưa login hôm nay
        const today = new Date().toISOString().split("T")[0];
        if (profileData.last_login_date !== today) {
          const newCoin = (profileData.coin || 0) + 10000;
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ coin: newCoin, last_login_date: today })
            .eq("id", userId);
          if (updateError) console.error("Lỗi cập nhật coin:", updateError);
        }
      }

      // 4. Redirect vào home ngay, không chờ profile
      router.push("/home");

    } catch (err) {
      console.error("Lỗi login:", err);
      setError("Đăng nhập thất bại. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, width: "100%", height: "100%",
          display: "flex", justifyContent: "center", alignItems: "center",
          background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "1.5em", zIndex: 9999
        }}>
          Đang đăng nhập...
        </div>
      )}

      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(-45deg, #6b73ff, #000dff, #ff6a00, #ff0000)",
        backgroundSize: "400% 400%",
        animation: "gradientBG 15s ease infinite",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}>
        <style>{`
          @keyframes gradientBG {
            0% {background-position:0% 50%;}
            50% {background-position:100% 50%;}
            100% {background-position:0% 50%;}
          }
        `}</style>

        <div style={{
          background: "rgba(0, 0, 0, 0.25)",
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
          color: "#fff",
        }}>
          <h2 style={{ fontSize: "2.2em", marginBottom: "35px", letterSpacing: "1px", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
            Welcome Back
          </h2>

          {error && <p style={{ color: "red", marginBottom: "15px" }}>{error}</p>}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", width: "100%", gap: "20px" }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ padding: "16px 22px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.3)", outline: "none", fontSize: "1em", background: "rgba(255,255,255,0.05)", color: "#fff" }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ padding: "16px 22px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.3)", outline: "none", fontSize: "1em", background: "rgba(255,255,255,0.05)", color: "#fff" }} />
            <button type="submit" disabled={loading} style={{ padding: "16px 0", borderRadius: "14px", border: "none", fontWeight: "bold", fontSize: "1.15em", cursor: loading ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #ff7e5f, #feb47b)", color: "#fff", boxShadow: "0 6px 25px rgba(0,0,0,0.4)" }}>
              {loading ? "Đang đăng nhập..." : "Login"}
            </button>
          </form>

          <p style={{ marginTop: "25px", fontSize: "0.95em", color: "rgba(255,255,255,0.8)" }}>
            Chưa có tài khoản?{" "}
            <a href="/signup" style={{ color: "#ffd700", fontWeight: "bold", textDecoration: "none", transition: "0.2s" }}
              onMouseEnter={(e) => (e.target.style.color = "#fff")}
              onMouseLeave={(e) => (e.target.style.color = "#ffd700")}>
              Đăng ký
            </a>
          </p>
        </div>
      </div>
    </>
  );
  
}
