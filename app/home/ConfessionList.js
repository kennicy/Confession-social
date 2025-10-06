"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import ConfessionItem from "./ConfessionItem";

export default function ConfessionList({ user, profile }) {
  const [confessions, setConfessions] = useState([]);
  const [reactionsData, setReactionsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 4; // số bài mỗi lần tải

  const formatTimeAgo = (dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return "Vừa xong";
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} ngày trước`;
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  // 🔥 Fetch có phân trang
  const fetchConfessions = async (pageNumber = 0) => {
    setLoading(true);
    const from = pageNumber * pageSize;
    const to = from + pageSize - 1;

    const { data: confs, error } = await supabase
      .from("confessions")
      .select(
        `
        *,
        profiles:user_id(id, full_name, avatar_url, nickname, level),
        replies(*, profiles:user_id(id, full_name, nickname, avatar_url, level))
      `
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Lỗi khi load confessions:", error);
    } else if (confs && confs.length > 0) {
      // tránh trùng bài khi load thêm
      setConfessions((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newOnes = confs.filter((c) => !existingIds.has(c.id));
        return [...prev, ...newOnes];
      });
    }

    setLoading(false);

    // chỉ fetch reactions 1 lần lúc đầu
    if (pageNumber === 0) {
      const { data: reactions } = await supabase
        .from("reactions")
        .select(`*, profiles:user_id(id, full_name)`);

      const reactionMap = {};
      (reactions || []).forEach((r) => {
        const key = r.reply_id ? `reply_${r.reply_id}` : r.confession_id;
        if (!reactionMap[key])
          reactionMap[key] = { userReaction: null, users: {} };
        const name = r.profiles?.full_name || "Ẩn danh";
        if (!reactionMap[key].users[r.type])
          reactionMap[key].users[r.type] = [];
        if (!reactionMap[key].users[r.type].includes(name))
          reactionMap[key].users[r.type].push(name);
        if (r.user_id === user.id) reactionMap[key].userReaction = r.type;
      });
      setReactionsData(reactionMap);
    }
  };

  // 🌀 Realtime cập nhật bài viết
  useEffect(() => {
    fetchConfessions(0); // load trang đầu

    const cfsChannel = supabase
      .channel("confessions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "confessions",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setConfessions((prev) => [payload.new, ...prev]);
          }
          if (payload.eventType === "UPDATE") {
            setConfessions((prev) =>
              prev.map((c) => (c.id === payload.new.id ? payload.new : c))
            );
          }
          if (payload.eventType === "DELETE") {
            setConfessions((prev) =>
              prev.filter((c) => c.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cfsChannel);
    };
  }, []);

  // 📦 Load thêm
  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchConfessions(nextPage);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        padding: "10px",
      }}
    >
      {confessions.map((c) => (
        <ConfessionItem
          key={c.id}
          confession={c}
          user={user}
          profile={profile}
          reactionsData={reactionsData}
          setReactionsData={setReactionsData}
          formatTimeAgo={formatTimeAgo}
        />
      ))}

      {loading && <div style={{ textAlign: "center" }}>Đang tải...</div>}

      {!loading && (
        <button
          onClick={handleLoadMore}
          style={{
            margin: "20px auto",
            padding: "8px 16px",
            borderRadius: "8px",
            background: "#4d4d4dff",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          More...
        </button>
      )}
    </div>
  );
}
