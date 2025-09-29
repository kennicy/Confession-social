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
      const { error } = await supabase.from("reports").insert([
        {
          confession_id: confessionId,
          user_id: user.id,
          reason,
        },
      ]);

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
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        backdropFilter: "blur(6px)",
        animation: "fadeIn 0.25s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #ffffff, #f9fafc)",
          padding: "28px",
          borderRadius: "20px",
          width: "90%",
          maxWidth: "420px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          position: "relative",
          transform: "translateY(0)",
          animation: "slideUp 0.3s ease",
          fontFamily: "Inter, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "18px",
          }}
        >
          <AlertTriangle color="#ff9800" size={30} />
          <h2
            style={{
              fontSize: "1.35em",
              fontWeight: 700,
              color: "#222",
              margin: 0,
            }}
          >
            Báo cáo bài đăng
          </h2>
        </div>

        {/* Input */}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Hãy cho chúng tôi biết lý do bạn muốn báo cáo bài viết này..."
          rows={5}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            border: "1px solid #e0e0e0",
            resize: "none",
            fontSize: "0.95em",
            lineHeight: "1.5",
            outline: "none",
            transition: "all 0.2s",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
          }}
          onFocus={(e) =>
            (e.target.style.border = "1px solid rgba(255,152,0,0.8)")
          }
          onBlur={(e) => (e.target.style.border = "1px solid #e0e0e0")}
        />

        {/* Message */}
        {message && (
          <p
            style={{
              marginTop: "14px",
              marginBottom: "10px",
              fontSize: "0.9em",
              color: message.includes("❌") ? "#e74c3c" : "#27ae60",
              fontWeight: 500,
            }}
          >
            {message}
          </p>
        )}

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "18px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "14px",
              background: "#f5f5f5",
              color: "#444",
              fontWeight: 500,
              fontSize: "0.95em",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.target.style.background = "rgba(0,0,0,0.07)")
            }
            onMouseLeave={(e) => (e.target.style.background = "#f5f5f5")}
          >
            <XCircle size={18} /> Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "10px 22px",
              borderRadius: "14px",
              background: loading
                ? "linear-gradient(90deg,#ccc,#bbb)"
                : "linear-gradient(90deg,#ff9800,#ffb74d)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.95em",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(255,152,0,0.4)",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.25s",
            }}
          >
            {loading ? "Đang gửi..." : <><Send size={18} /> Gửi</>}
          </button>
        </div>
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
