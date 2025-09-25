"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import ConfessionItem from "./ConfessionItem";

export default function ConfessionList({ user, profile }) {
  const [confessions, setConfessions] = useState([]);
  const [reactionsData, setReactionsData] = useState({});

  const formatTimeAgo = dateString => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return "Vừa xong";
    const m = Math.floor(diff / 60); if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24); if (d < 7) return `${d} ngày trước`;
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const fetchConfessions = async () => {
    const { data: confs } = await supabase
      .from("confessions")
      .select(`
        *,
        profiles:user_id(id, full_name, avatar_url),
        replies(*, profiles:user_id(id, full_name, avatar_url))
      `)
      .order("created_at", { ascending: false });
    setConfessions(confs || []);

    const { data: reactions } = await supabase.from("reactions").select(`*, profiles:user_id(id, full_name)`);
    const reactionMap = {};
    (reactions || []).forEach(r => {
      const key = r.reply_id ? `reply_${r.reply_id}` : r.confession_id;
      if (!reactionMap[key]) reactionMap[key] = { userReaction: null, users: {} };
      const name = r.profiles?.full_name || "Ẩn danh";
      if (!reactionMap[key].users[r.type]) reactionMap[key].users[r.type] = [];
      if (!reactionMap[key].users[r.type].includes(name)) reactionMap[key].users[r.type].push(name);
      if (r.user_id === user.id) reactionMap[key].userReaction = r.type;
    });
    setReactionsData(reactionMap);
  };

  useEffect(() => {
    fetchConfessions();

    const cfsChannel = supabase
      .channel("confessions-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT | UPDATE | DELETE
          schema: "public",
          table: "confessions",
        },
        (payload) => {
          console.log("Realtime confession payload:", payload);

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


  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"25px", padding:"10px" }}>
      {confessions.map(c => (
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
    </div>
  );
}
