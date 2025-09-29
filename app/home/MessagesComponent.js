"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import UserList from "./UserList";
import ChatWindow from "./ChatWindow";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

export default function MessagesComponent({ user }) {
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);

  // --- Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from("profiles").select("*").neq("id", user.id);
      setAllUsers(data || []);
    };
    fetchUsers();

    const channel = supabase
      .channel("realtime-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        setAllUsers((prev) => prev.map((u) => (u.id === payload.new.id ? payload.new : u)));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user.id]);

  // --- Fetch messages + realtime
  useEffect(() => {
    if (!user?.id) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      setMessages(data || []);

      const counts = {};
      (data || []).forEach((m) => {
        if (m.recipient_id === user.id && !m.is_read) {
          counts[m.user_id] = (counts[m.user_id] || 0) + 1;
        }
      });
      setUnreadCounts(counts);
    };
    fetchMessages();

    const messageChannel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new;

          if (msg.user_id === user.id || msg.recipient_id === user.id) {
            // Cập nhật messages state
            setMessages((prev) => {
              if (payload.eventType === "INSERT") {
                if (!prev.find((m) => m.id === msg.id)) return [...prev, msg];
                return prev;
              }
              if (payload.eventType === "UPDATE") {
                return prev.map((m) => (m.id === msg.id ? msg : m));
              }
              return prev;
            });

            // --- Tin nhắn mới đến cho mình ---
            if (msg.recipient_id === user.id && !msg.is_read) {
              if (selectedUser?.id === msg.user_id) {
                // Đang mở chat → mark read ngay + badge 0
                await supabase
                  .from("messages")
                  .update({ is_read: true })
                  .eq("id", msg.id);

                setUnreadCounts((prev) => ({
                  ...prev,
                  [msg.user_id]: 0,
                }));
              } else {
                // Chưa mở chat → tăng badge
                setUnreadCounts((prev) => ({
                  ...prev,
                  [msg.user_id]: (prev[msg.user_id] || 0) + 1,
                }));
              }
            }

            // --- Nếu có tin nhắn update is_read từ DB ---
            if (payload.eventType === "UPDATE" && msg.is_read) {
              if (selectedUser?.id === msg.user_id) {
                setUnreadCounts((prev) => ({
                  ...prev,
                  [msg.user_id]: 0,
                }));
              }
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(messageChannel);
  }, [user.id, selectedUser?.id]);

  // --- Sort users by last message
  const usersWithLastMessage = allUsers.map((u) => {
    const userMessages = messages.filter((m) => m.user_id === u.id || m.recipient_id === u.id);
    const lastMsg = userMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return { ...u, lastMessage: lastMsg?.created_at || null };
  });

  const sortedUsers = usersWithLastMessage.sort((a, b) => {
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage) - new Date(a.lastMessage);
  });

  return (
    <div className="flex h-full font-sans" style={{ height: "90vh" }}>
      <UserList
        allUsers={sortedUsers}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        unreadCounts={unreadCounts}
        messages={messages}
        user={user}
      />

      <ChatWindow
        user={user}
        allUsers={allUsers}
        selectedUser={selectedUser}
        messages={messages}
        setUnreadCounts={setUnreadCounts}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
}
