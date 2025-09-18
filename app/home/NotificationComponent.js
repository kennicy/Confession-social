"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, FileText } from "lucide-react";

export default function NotificationsFeedPage() {
  const [notifications, setNotifications] = useState([]);

  // Fetch notifications & setup realtime
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, user_id, user_name, created_at, content, confession_content, reaction_type")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Fetch notifications error:", error);
        return;
      }
      setNotifications(data);
    };

    fetchNotifications();

    const subscription = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  // Render notification text
  const renderContent = (n) => {
    switch (n.type) {
      case "cfs":
        return `${n.user_name} đã đăng 1 confession mới: "${n.content}"`;
      case "reply":
        return `${n.user_name} replies: "${n.content}" on confession: "${n.confession_content}"`;
      case "reaction":
        return `${n.user_name} đã "${n.reaction_type}" trên confession: "${n.confession_content}"`;
      default:
        return n.content;
    }
  };

  // Render icon
  const renderIcon = (type) => {
    switch (type) {
      case "cfs":
        return <FileText className="w-7 h-7 text-blue-500" />;
      case "reply":
        return <MessageCircle className="w-7 h-7 text-green-500" />;
      case "reaction":
        return <Heart className="w-7 h-7 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen p-6 bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="w-full max-w-lg space-y-4">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`bg-white shadow-2xl rounded-2xl p-5 flex items-start gap-4 border-l-6 ${
                n.type === "cfs"
                  ? "border-blue-500"
                  : n.type === "reply"
                  ? "border-green-500"
                  : "border-red-500"
              } hover:shadow-2xl hover:scale-[1.01] transition-all duration-200`}
            >
              {renderIcon(n.type)}
              <div className="flex-1">
                <div className="text-gray-900 font-medium text-sm md:text-base">
                  {renderContent(n)}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
