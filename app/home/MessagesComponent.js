"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import UserList from "./UserList";
import ChatWindow from "./ChatWindow";
import GroupList from "./GroupList";
import GroupWindow from "./GroupWindow";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

export default function MessagesComponent({ user }) {
  const [mode, setMode] = useState("personal"); // 'personal' hoặc 'group'
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({});

  const messagesEndRef = useRef(null);

  // --- Fetch users ---
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

  // --- Fetch messages + realtime ---
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

            if (msg.recipient_id === user.id && !msg.is_read) {
              if (selectedUser?.id === msg.user_id) {
                await supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
                setUnreadCounts((prev) => ({ ...prev, [msg.user_id]: 0 }));
              } else {
                setUnreadCounts((prev) => ({ ...prev, [msg.user_id]: (prev[msg.user_id] || 0) + 1 }));
              }
            }

            if (payload.eventType === "UPDATE" && msg.is_read) {
              if (selectedUser?.id === msg.user_id) {
                setUnreadCounts((prev) => ({ ...prev, [msg.user_id]: 0 }));
              }
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(messageChannel);
  }, [user.id, selectedUser?.id]);

  // --- Fetch groups + realtime ---
  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from("groups").select("*"); // giả sử bảng 'groups'
      setAllGroups(data || []);
    };
    fetchGroups();

    const groupChannel = supabase
      .channel("realtime-groups")
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, (payload) => {
        setAllGroups((prev) => prev.map((g) => (g.id === payload.new.id ? payload.new : g)));
      })
      .subscribe();

    return () => supabase.removeChannel(groupChannel);
  }, []);

  // --- Fetch group messages + realtime ---
  useEffect(() => {
    if (!user?.id) return;

    const fetchGroupMessages = async () => {
      const { data } = await supabase
        .from("group_messages")
        .select("*")
        .order("created_at", { ascending: true });

      setGroupMessages(data || []);

      const counts = {};
      (data || []).forEach((m) => {
        if (m.user_id !== user.id && !m.is_read) {
          counts[m.group_id] = (counts[m.group_id] || 0) + 1;
        }
      });
      setGroupUnreadCounts(counts);
    };
    fetchGroupMessages();

    const groupMsgChannel = supabase
      .channel("realtime-group-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_messages" },
        async (payload) => {
          const msg = payload.new;
          setGroupMessages((prev) => {
            if (payload.eventType === "INSERT") {
              if (!prev.find((m) => m.id === msg.id)) return [...prev, msg];
              return prev;
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((m) => (m.id === msg.id ? msg : m));
            }
            return prev;
          });

          if (msg.user_id !== user.id && !msg.is_read) {
            if (selectedGroup?.id === msg.group_id) {
              await supabase.from("group_messages").update({ is_read: true }).eq("id", msg.id);
              setGroupUnreadCounts((prev) => ({ ...prev, [msg.group_id]: 0 }));
            } else {
              setGroupUnreadCounts((prev) => ({ ...prev, [msg.group_id]: (prev[msg.group_id] || 0) + 1 }));
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(groupMsgChannel);
  }, [user.id, selectedGroup?.id]);

  // --- Sort users by last message ---
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
    <div className="flex flex-col h-full font-sans" style={{ height: "90vh" }}>
      {/* Header 2 nút */}
      <div className="flex gap-2 p-2 bg-gray-800 text-white">
        <button
          className={`px-4 py-2 rounded ${mode === "personal" ? "bg-blue-600" : "bg-gray-700"}`}
          onClick={() => setMode("personal")}
        >
          Chat cá nhân
        </button>
        <button
          className={`px-4 py-2 rounded ${mode === "group" ? "bg-blue-600" : "bg-gray-700"}`}
          onClick={() => setMode("group")}
        >
          Chat nhóm
        </button>
      </div>

      {/* Nội dung chính */}
      <div className="flex flex-1 overflow-hidden">
        {mode === "personal" ? (
          <>
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
          </>
        ) : (
          <>
            <GroupList
              allGroups={allGroups}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              unreadCounts={groupUnreadCounts}
              messages={groupMessages}
              user={user}
            />
            <GroupWindow
              user={user}
              allGroups={allGroups}
              selectedGroup={selectedGroup}
              messages={groupMessages}
              setUnreadCounts={setGroupUnreadCounts}
              messagesEndRef={messagesEndRef}
            />
          </>
        )}
      </div>
    </div>
  );
}
