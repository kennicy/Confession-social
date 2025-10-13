"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Zap,
  CheckCircle,
  Bell,
  Trash2,
  Undo2,
  Search,
} from "lucide-react";

// ---- Relative time helper
const timeAgo = (date) => {
  if (!date) return "";
  const now = new Date();
  const seconds = Math.floor((now - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ---- Notification text helper
const getNotificationText = (notification) => {
  const { type, user_name, reaction_type, content, confession_content } = notification || {};
  switch (type) {
    case "reaction":
      return `${user_name || "Someone"} reacted (${reaction_type || "react"}) to your post.`;
    case "reply":
      return `${user_name || "Someone"} commented: ${content || "..."}`;
    case "cfs":
      return `New confession: ${confession_content || content || "..."}`;
    default:
      return content || confession_content || "New notification";
  }
};

// ---- UUID validator
const getValidUUID = (uuid) => {
  if (!uuid) return null;
  return uuid.length > 36 ? uuid.slice(0, 36) : uuid;
};

export default function NotificationsFeedPage({ user }) {
  const currentUserId = getValidUUID(user?.id);
  const [userPostIds, setUserPostIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  // --- Fetch user's posts
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    const fetchUserPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("confessions")
        .select("id")
        .eq("user_id", currentUserId);
      setUserPostIds(error ? [] : data.map((d) => String(d.id)));
      setLoading(false);
    };
    fetchUserPosts();
  }, [currentUserId]);

  // --- Fetch notifications + avatar
  useEffect(() => {
    if (!currentUserId) return;

    const fetchNotifications = async () => {
      setLoading(true);

      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (notifError || !notifData) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Lấy danh sách user_id thực hiện action
      const userIds = [...new Set(notifData.map((n) => n.user_id))];

      // Lấy avatar + user_name từ profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds.map(String));

      const profilesMap = {};
      profilesData?.forEach((p) => {
        profilesMap[String(p.id)] = { avatar_url: p.avatar_url, user_name: p.user_name };
      });

      // Lọc notification của user post hiện tại
      const filtered = notifData.filter(
        (n) =>
          userPostIds.map(String).includes(String(n.reference_id)) &&
          n.user_id !== currentUserId
      );

      // Map avatar + user_name
      const mapped = filtered.map((n) => ({
        ...n,
        avatar_url: profilesMap[String(n.user_id)]?.avatar_url,
        user_name: profilesMap[String(n.user_id)]?.user_name || n.user_name,
      }));

      setNotifications(mapped);
      setLoading(false);
    };

    fetchNotifications();

    // --- Realtime subscription
    const subscription = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const newNotif = payload.new;
          if (
            userPostIds.map(String).includes(String(newNotif.reference_id)) &&
            newNotif.user_id !== currentUserId
          ) {
            // Lấy avatar + name của user_id mới
            const { data: profileData } = await supabase
              .from("profiles")
              .select("avatar_url, user_name")
              .eq("id", newNotif.user_id)
              .single();

            setNotifications((prev) => [
              {
                ...newNotif,
                avatar_url: profileData?.avatar_url,
                user_name: profileData?.user_name || newNotif.user_name,
              },
              ...prev,
            ]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [currentUserId, JSON.stringify(userPostIds)]);

  // --- Update helpers
  const updateNotif = async (notif, is_read) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read } : n))
    );
    await supabase.from("notifications").update({ is_read }).eq("id", notif.id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", notifications.map((n) => n.id));
  };

  const clearRead = () => {
    setNotifications((prev) => prev.filter((n) => !n.is_read));
  };

  // --- Tabs + filter
  const tabs = ["all", "reaction", "reply", "cfs"];
  const counts = tabs.reduce((acc, t) => {
    acc[t] = notifications.filter((n) => (t === "all" ? true : n.type === t)).length;
    return acc;
  }, {});

  const filteredByTab =
    activeTab === "all" ? notifications : notifications.filter((n) => n.type === activeTab);

  const filtered = filteredByTab.filter(
    (n) =>
      n.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      getNotificationText(n).toLowerCase().includes(search.toLowerCase())
  );

  // --- UI
  if (loading) return <p className="text-center mt-4">Loading notifications...</p>;
  if (!notifications.length) return <p className="text-center mt-4">No notifications.</p>;

return (
  <div className="max-w-2xl mx-auto p-4 bg-gray-900">
    {/* Header */}
    <div className="flex items-center mb-4">
      <Bell className="w-6 h-6 mr-2 text-blue-400" />
      <h2 className="text-xl font-bold text-gray-100">Notifications</h2>
    </div>

    {/* Tabs + Actions */}
    <div className="flex gap-2 mb-4 items-center flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`px-3 py-1 rounded-full font-medium flex items-center gap-1 ${
            activeTab === tab
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-200 hover:bg-gray-600"
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
          <span className="text-xs bg-gray-900 text-gray-200 px-2 py-0.5 rounded-full">
            {counts[tab]}
          </span>
        </button>
      ))}
      <button
        onClick={markAllAsRead}
        className="ml-auto px-3 py-1 rounded-full bg-green-600 text-white hover:bg-green-700"
      >
        Mark all as read
      </button>
      <button
        onClick={clearRead}
        className="px-3 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
      >
        <Trash2 size={16} /> Clear read
      </button>
    </div>

    {/* Search */}
    <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 mb-4">
      <Search className="w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder="Search notifications..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 bg-transparent outline-none ml-2 text-gray-100 placeholder-gray-500"
      />
    </div>

    {/* Notifications list */}
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      <AnimatePresence>
        {filtered.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`relative flex items-start p-4 rounded-xl shadow-sm hover:shadow-md transition-all ${
              notif.is_read
                ? "bg-gray-800"
                : "bg-gray-700 border-l-4 border-blue-500"
            }`}
          >
            {/* NEW badge */}
            {!notif.is_read && (
              <span className="absolute top-2 right-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                NEW
              </span>
            )}

            {/* Avatar */}
            <img
              src={notif.avatar_url || "/default-avatar.png"}
              alt="avatar"
              className="w-10 h-10 rounded-full mr-3 object-cover"
            />

            <div className="flex-1">
              <p className="text-sm text-gray-400">{timeAgo(notif.created_at)}</p>
              <p className="mt-1 text-sm text-gray-100">
                {notif.user_name && <span className="font-bold">{notif.user_name}</span>}{" "}
                {notif.type === "reaction" &&
                  `reacted (${notif.reaction_type || "react"}) to your post.`}
                {notif.type === "reply" && `commented: ${notif.content}`}
                {notif.type === "cfs" && (
                  <span className="line-clamp-3">{notif.confession_content || notif.content}</span>
                )}
              </p>
            </div>

            <div className="ml-3 flex items-center gap-2">
              {!notif.is_read ? (
                <button
                  onClick={() => updateNotif(notif, true)}
                  className="text-blue-400 hover:underline text-sm"
                >
                  Mark as read
                </button>
              ) : (
                <button
                  onClick={() => updateNotif(notif, false)}
                  className="text-gray-400 hover:underline text-sm flex items-center gap-1"
                >
                  <Undo2 size={14} /> Unread
                </button>
              )}
              {notif.is_read && <CheckCircle className="w-5 h-5 text-gray-500" />}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  </div>
);

}
