"use client";
import React, { useEffect, useState } from "react";
import {
  User,
  GraduationCap,
  Calendar,
  Briefcase,
  DollarSign,
  Users,
} from "lucide-react";

export default function ProfilePopup({ userData, onClose }) {
  const [visible, setVisible] = useState(false);
  const [showImage, setShowImage] = useState(false); // 👈 thêm state review ảnh

  useEffect(() => {
    if (userData) setVisible(true);
    else setVisible(false);
  }, [userData]);

  if (!userData) return null;

  const formatCoin = (num) => {
    if (num == null) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const infoItems = [
    { icon: <GraduationCap size={18} />, label: "Faculty", value: userData.faculty || "-" },
    { icon: <Briefcase size={18} />, label: "Major", value: userData.major || "-" },
    { icon: <Calendar size={18} />, label: "Year", value: userData.year || "-" },
    { icon: <Users size={18} />, label: "Position", value: userData.position || "-" },
    { icon: <User size={18} />, label: "Gender", value: userData.gender || "-" },
    { icon: <DollarSign size={18} />, label: "Coin", value: formatCoin(userData.coin) },
  ];

  return (
    <>
      {/* ===== Modal profile chính ===== */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(22, 22, 22, 0)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          transition: "background 0.3s ease",
          padding: "16px",
        }}
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#272727ff",
            borderRadius: "20px",
            width: "400px",
            maxWidth: "100%",
            padding: "24px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
            textAlign: "center",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.95)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <img
              src={userData.avatar_url || "https://via.placeholder.com/120"}
              alt={userData.full_name}
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "4px solid #4caf50",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                cursor: "pointer",
              }}
              onClick={() => setShowImage(true)} // 👈 mở review ảnh
            />
          </div>

          {/* Name & Nickname */}
          <h2 style={{ margin: "8px 0 4px", fontSize: "1.5rem", fontWeight: 700 }}>
            {userData.full_name}
          </h2>
          {userData.nickname && (
            <p style={{ margin: "0 0 16px", fontSize: "1rem", color: "#666" }}>
              @{userData.nickname}
            </p>
          )}

          {/* Info list */}
          <div style={{ textAlign: "left", marginBottom: "16px" }}>
            {infoItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "0.95rem",
                  color: "#ffffffff",
                  padding: "6px 0",
                  borderBottom: idx !== infoItems.length - 1 ? "1px solid #eee" : "none",
                }}
              >
                <div style={{ color: "#4caf50" }}>{item.icon}</div>
                <div style={{ fontWeight: 600, minWidth: "90px" }}>{item.label}:</div>
                <div style={{ flex: 1, fontWeight: 400 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          {userData.bio && (
            <div
              style={{
                fontSize: "0.95rem",
                color: "#ffffffff",
                lineHeight: "1.5em",
                marginBottom: "20px",
                padding: "10px",
                background: "#323232ff",
                borderRadius: "12px",
              }}
            >
              {userData.bio}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 300);
            }}
            style={{
              marginTop: "12px",
              padding: "10px 24px",
              borderRadius: "14px",
              background: "#4caf50",
              color: "#fff",
              fontWeight: 600,
              fontSize: "1rem",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#45a049")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#4caf50")}
          >
            Đóng
          </button>
        </div>
      </div>

      {/* ===== Modal xem ảnh phóng to ===== */}
      {showImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
          onClick={() => setShowImage(false)} // click ngoài đóng
        >
          <img
            src={userData.avatar_url || "https://via.placeholder.com/300"}
            alt="Avatar Zoom"
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: "12px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
      
    </>
  );
}
