"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import ConfessionForm from "./ConfessionForm";
import ConfessionList from "./ConfessionList";

export default function ConfessionFeed({ user, profile }) {
  const [confessions, setConfessions] = useState([]);
  const [reactionsData, setReactionsData] = useState({});

  // ===== FETCH CONFESSIONS + REACTIONS =====
  const fetchConfessionsAndReactions = async () => {
    try {
      const { data: confs, error: confError } = await supabase
        .from("confessions")
        .select(`
          *,
          profiles:user_id(id, full_name,nickname, avatar_url, faculty, major, year),
          replies(*, profiles:user_id(id, full_name,nickname, avatar_url))
        `)
        .order("created_at", { ascending: false });

      if (confError) return console.error("Error fetching confessions:", confError);
      setConfessions(confs || []);

      const { data: reactions } = await supabase
        .from("reactions")
        .select(`*, profiles:user_id(id, full_name, nickname)`);

      const data = {};
      confs.forEach(c => {
        data[c.id] = {
          like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0,
          userReaction: null,
          users: { like: [], love: [], haha: [], wow: [], sad: [], angry: [] }
        };
      });

      reactions?.forEach(r => {
        if (!data[r.confession_id])
          data[r.confession_id] = {
            like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0,
            userReaction: null,
            users: { like: [], love: [], haha: [], wow: [], sad: [], angry: [] }
          };

        data[r.confession_id][r.type] += 1;
        const userName = r.profiles?.full_name || "Ẩn danh";
        data[r.confession_id].users[r.type].push(userName);

        if (r.user_id === user.id) data[r.confession_id].userReaction = r.type;
      });

      setReactionsData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // load ban đầu
    fetchConfessionsAndReactions();

    // subcribe realtime
    const channel = supabase
      .channel("confessions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confessions" },
        async (payload) => {
          console.log("Realtime payload:", payload);

          // khi có INSERT
          if (payload.eventType === "INSERT") {
            // query lại row đầy đủ
            const { data: newConf } = await supabase
              .from("confessions")
              .select(`
                *,
                profiles:user_id(id, full_name, nickname, avatar_url, faculty, major, year),
                replies(*, profiles:user_id(id, full_name,nickname, avatar_url))
              `)
              .eq("id", payload.new.id)
              .single();

            if (newConf) {
              setConfessions((prev) => [newConf, ...prev]);
            }
          }

          // khi có UPDATE
          if (payload.eventType === "UPDATE") {
            const { data: updated } = await supabase
              .from("confessions")
              .select(`
                *,
                profiles:user_id(id, full_name,nickname, avatar_url, faculty, major, year),
                replies(*, profiles:user_id(id, full_name,nickname, avatar_url))
              `)
              .eq("id", payload.new.id)
              .single();

            if (updated) {
              setConfessions((prev) =>
                prev.map((c) => (c.id === updated.id ? updated : c))
              );
            }
          }

          // khi có DELETE
          if (payload.eventType === "DELETE") {
            setConfessions((prev) =>
              prev.filter((c) => c.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status); // cần thấy "SUBSCRIBED"
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        backgroundColor: "#111", // nền tối
        color: "#f1f1f1",        // chữ sáng
        borderRadius: "12px",    // bo góc
        padding: "16px",         // khoảng cách trong
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)", // bóng đổ nhẹ
      }}
    >
      <ConfessionForm 
        user={user} 
        profile={profile} 
        setConfessions={setConfessions} 
      />
      <ConfessionList 
        user={user} 
        profile={profile} 
        confessions={confessions} 
        setConfessions={setConfessions} 
        reactionsData={reactionsData} 
        setReactionsData={setReactionsData} 
      />
    </div>
  );
  
}
