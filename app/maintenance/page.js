"use client";

import { useEffect, useState } from "react";

export default function Maintenance() {
  // Lấy thời gian kết thúc từ biến môi trường
  const maintenanceEnd = new Date(
    process.env.NEXT_PUBLIC_MAINTENANCE_END || "2025-12-31T23:59:59"
  );

  function getTimeLeft() {
    const now = new Date();
    const diff = maintenanceEnd - now;

    if (diff <= 0) return { h: 0, m: 0, s: 0 };

    return {
      h: Math.floor(diff / 1000 / 60 / 60),
      m: Math.floor((diff / 1000 / 60) % 60),
      s: Math.floor((diff / 1000) % 60),
    };
  }

  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOver = timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0;

  return (
    <div style={{
      position: "relative",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    }}>
      {/* Background gradient animated */}
      <div style={{
        position: "absolute",
        width: "200%",
        height: "200%",
        background: "linear-gradient(135deg, #667eea, #764ba2, #6e8efb, #a777e3)",
        backgroundSize: "400% 400%",
        animation: "gradientBG 15s ease infinite",
        top: 0,
        left: 0,
        zIndex: -2
      }} />

      {/* Sparkle */}
      {[...Array(25)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: `${Math.random() * 4 + 2}px`,
          height: `${Math.random() * 4 + 2}px`,
          background: "white",
          borderRadius: "50%",
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: 0.7,
          animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 5}s`
        }} />
      ))}

      {/* Center card */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        background: "rgba(255,255,255,0.05)",
        padding: "40px",
        borderRadius: "20px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
        maxWidth: "400px",
        width: "90%",
        color: "#fff",
        animation: "fadeIn 1s ease-in-out"
      }}>
        <div style={{ fontSize: "60px", marginBottom: "20px", animation: "bounce 2s infinite" }}>🔧</div>
        <h1 style={{ fontSize: "32px", marginBottom: "15px" }}>Bảo trì</h1>

        {!isOver ? (
          <>
            <p style={{ fontSize: "16px", marginBottom: "20px", lineHeight: "1.5" }}>
              Web đang được cập nhật một số tính năng mới. Vui lòng quay lại sau!
            </p>
            <h2 style={{ fontSize: "28px", marginBottom: "10px" }}>
              {timeLeft.h.toString().padStart(2, "0")}:
              {timeLeft.m.toString().padStart(2, "0")}:
              {timeLeft.s.toString().padStart(2, "0")}
            </h2>
            <p>⏳ Thời gian còn lại</p>
          </>
        ) : (
          <p style={{ fontSize: "18px", marginTop: "20px" }}>
            🚧 Hệ thống đang trong quá trình bảo trì, vui lòng quay lại sau!
          </p>
        )}
      </div>

      <style>
        {`
          @keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
          @keyframes bounce {0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
          @keyframes fadeIn {0%{opacity:0;transform:translateY(-20px);}100%{opacity:1;transform:translateY(0);}}
          @keyframes gradientBG {0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}
          @keyframes twinkle {0%,100%{opacity:0.2;}50%{opacity:0.8;}}
        `}
      </style>
    </div>
  );
}
