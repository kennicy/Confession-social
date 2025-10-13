// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect về trang login sau 1s (tạo cảm giác mượt)
    const timer = setTimeout(() => router.push("/login"), 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "linear-gradient(135deg, #6e8efb, #a777e3)",
      color: "#fff",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{ marginBottom: "20px", fontSize: "24px", fontWeight: "bold" }}>
        Đang tải...
      </div>

      {/* Spinner */}
      <div style={{
        border: "5px solid rgba(255, 255, 255, 0.3)",
        borderTop: "5px solid #fff",
        borderRadius: "50%",
        width: "50px",
        height: "50px",
        animation: "spin 1s linear infinite"
      }} />

      {/* CSS animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
