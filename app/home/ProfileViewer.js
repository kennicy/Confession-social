"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import UserPosts from "../home/UserPosts";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function ProfileViewer({ userId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (error) {
          console.error("Error fetching profile:", error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setProfile(null);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  if (!userId)
    return <p className="text-center mt-10 text-gray-500">Chọn người dùng để xem</p>;
  if (loading) return <p className="text-center mt-10">Đang tải...</p>;
  if (!profile)
    return <p className="text-center mt-10 text-red-500">Không tìm thấy người dùng</p>;

  // Hàm tính thời gian offline chi tiết
  const getOfflineTime = (lastOnline) => {
    const now = dayjs();
    const offline = dayjs(lastOnline);
    const diffMinutes = now.diff(offline, "minute");
    const diffHours = now.diff(offline, "hour");
    const diffDays = now.diff(offline, "day");
    const diffWeeks = now.diff(offline, "week");
    const diffMonths = now.diff(offline, "month");

    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffWeeks < 4) return `${diffWeeks} tuần trước`;
    return `${diffMonths} tháng trước`;
  };

  const offlineTime = profile.last_online ? getOfflineTime(profile.last_online) : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 pb-10"
    >
      {/* Avatar */}
      <div className="flex justify-center mt-10">
        <motion.img
          whileHover={{ scale: 1.05 }}
          src={profile.avatar_url || "https://via.placeholder.com/150"}
          alt={profile.full_name}
          className="w-36 h-36 rounded-full border-4 border-white shadow-lg object-cover"
        />
      </div>

      {/* User Info */}
      <div className="mt-6 text-center px-6 sm:px-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{profile.full_name || "Chưa có tên"}</h1>
        {profile.nickname && <p className="text-gray-500 text-lg mt-1">@{profile.nickname}</p>}
        {profile.bio && (
          <p className="mt-4 text-gray-700 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 flex justify-center gap-6 flex-wrap">
        {/* Coins */}
        <motion.div
          whileHover={{ y: -3, boxShadow: "0 10px 15px rgba(0,0,0,0.1)" }}
          className="flex items-center gap-2 text-gray-800 p-3 rounded-xl bg-white transition-all duration-200 cursor-pointer"
        >
          {/* Coin icon 💰 */}
          <span className="text-yellow-500 text-xl">💰</span>
          <div className="text-center">
            <p className="text-xl font-semibold">{profile.coin?.toLocaleString() ?? "0"}</p>
            <p className="text-gray-500 text-sm">Coins</p>
          </div>
        </motion.div>

        {/* Status */}
        <motion.div
          whileHover={{ y: -3, boxShadow: "0 10px 15px rgba(0,0,0,0.1)" }}
          className="flex items-center gap-3 text-gray-800 p-3 rounded-xl bg-white transition-all duration-200 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-6 w-6 ${profile.is_online ? "text-green-500" : "text-gray-400"}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
          <div className="text-center">
            <p className="text-xl font-semibold">{profile.is_online ? "Online" : "Offline"}</p>
            {!profile.is_online && offlineTime && (
              <p className="text-gray-500 text-sm">{offlineTime}</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="my-8 border-t border-gray-200 mx-6 sm:mx-10"></div>

      {/* User Posts */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Bài viết</h2>
        <UserPosts userId={userId} />
      </div>
    </motion.div>
  );
}
