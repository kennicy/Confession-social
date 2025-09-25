"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AlertTriangle, XCircle, Send } from "lucide-react";

export default function ReportModal({ confessionId, user, onClose }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setMessage("Vui lòng nhập lý do báo cáo.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("reports")
        .insert([
          {
            confession_id: confessionId,
            user_id: user.id,
            reason,
          },
        ])
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        setMessage("❌ Có lỗi xảy ra, vui lòng thử lại.");
      } else {
        setMessage("✅ Báo cáo thành công!");
        setReason("");
        onClose();
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
        transition: "opacity 0.3s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          padding: "32px",
          borderRadius: "16px",
          width: "90%",
          maxWidth: "420px",
          boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
          transform: "translateY(0)",
          transition: "transform 0.3s ease",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon cảnh báo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <AlertTriangle color="#ffa500" size={28} />
          <h2 style={{ fontSize: "1.3em", fontWeight: 600, color: "#333", margin: 0 }}>
            Báo cáo bài đăng
          </h2>
        </div>

        {/* Textarea */}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do báo cáo..."
          rows={6}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            resize: "none",
            fontSize: "0.95em",
            outline: "none",
            transition: "border 0.2s",
          }}
          onFocus={(e) => (e.target.style.border = "1px solid #ffa500")}
          onBlur={(e) => (e.target.style.border = "1px solid #ddd")}
        />

        {/* Message */}
        {message && (
          <p
            style={{
              marginTop: "12px",
              marginBottom: "12px",
              color: message.includes("❌") ? "#e74c3c" : "#27ae60",
              fontWeight: 500,
            }}
          >
            {message}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "12px",
              background: "#eee",
              color: "#555",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#ddd")}
            onMouseLeave={(e) => (e.target.style.background = "#eee")}
          >
            <XCircle size={18} /> Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "8px 18px",
              borderRadius: "12px",
              background: "#ffa500",
              color: "#fff",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = "#e69500")}
            onMouseLeave={(e) => !loading && (e.target.style.background = "#ffa500")}
          >
            {loading ? "Đang gửi..." : <><Send size={18} /> Gửi</>}
          </button>
        </div>
      </div>
    </div>
  );
}
