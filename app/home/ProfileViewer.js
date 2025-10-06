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
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

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
    return <p className="text-center mt-10 text-gray-400">Select a user to view</p>;
  if (loading) return <p className="text-center mt-10 text-gray-400">Loading...</p>;
  if (!profile)
    return <p className="text-center mt-10 text-red-500">User not found</p>;

  const getOfflineTime = (lastOnline) => {
    const now = dayjs();
    const offline = dayjs(lastOnline);
    const diffMinutes = now.diff(offline, "minute");
    const diffHours = now.diff(offline, "hour");
    const diffDays = now.diff(offline, "day");
    const diffWeeks = now.diff(offline, "week");
    const diffMonths = now.diff(offline, "month");

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    return `${diffMonths} months ago`;
  };

  const offlineTime = profile.last_online ? getOfflineTime(profile.last_online) : "";

  const infoList = [
    { label: "City", value: profile.city, icon: "🏙" },
    { label: "Province", value: profile.province, icon: "📍" },
    { label: "School", value: profile.school, icon: "🏫" },
    { label: "Faculty", value: profile.faculty, icon: "🎓" },
    { label: "Major", value: profile.major, icon: "📝" },
    { label: "Year", value: profile.year, icon: "📅" },
    { label: "Gender", value: profile.gender, icon: "⚧" },
    { label: "Position", value: profile.position, icon: "💼" },
  ].filter((item) => item.value);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-900 pb-10 text-gray-200"
    >
      {/* Cover */}
      <div
        className="relative w-full h-56 bg-gray-800 cursor-pointer"
        onClick={() => setIsCoverModalOpen(true)}
      >
        <img
          src={profile.cover_url || "https://via.placeholder.com/1200x300"}
          alt="Cover"
          className="w-full h-full object-cover"
        />

        {/* Avatar */}
        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 translate-y-1/2 z-20">
          <motion.img
            whileHover={{ scale: 1.05 }}
            src={profile.avatar_url || "https://via.placeholder.com/150"}
            alt={profile.full_name}
            className="w-36 h-36 rounded-full border-4 border-indigo-500 shadow-xl object-cover cursor-pointer"
            onClick={(e) => {
              e.stopPropagation(); // ✅ prevent cover click
              setIsAvatarModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* User Info */}
      <div className="mt-20 text-center px-6 sm:px-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-indigo-400">{profile.full_name || "No Name"}</h1>
        {profile.nickname && <p className="text-gray-400 text-lg mt-1">@{profile.nickname}</p>}
        {profile.bio && (
          <p className="mt-4 text-gray-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Info Grid */}
      {infoList.length > 0 && (
        <div className="mt-6 max-w-3xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-gray-200">
          {infoList.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl shadow hover:bg-gray-700 transition-colors">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-sm text-gray-400">{item.label}</p>
                <p className="text-base font-semibold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 flex justify-center gap-6 flex-wrap">
        {/* Coins */}
        <motion.div
          whileHover={{ y: -3, boxShadow: "0 10px 20px rgba(255,215,0,0.4)" }}
          className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-400 cursor-pointer transition-all duration-200 text-gray-900"
        >
          <span className="text-2xl">💰</span>
          <div className="text-center">
            <p className="text-xl font-semibold">{profile.coin?.toLocaleString() ?? "0"}</p>
            <p className="text-sm">Coins</p>
          </div>
        </motion.div>

        {/* Status */}
        <motion.div
          whileHover={{ y: -3, boxShadow: "0 10px 20px rgba(0,255,128,0.3)" }}
          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
            profile.is_online
              ? "bg-gradient-to-r from-green-600 to-green-400 text-gray-900"
              : "bg-gray-800 text-gray-200"
          }`}
        >
          <div className="text-center">
            <p className="text-xl font-semibold">{profile.is_online ? "Online" : "Offline"}</p>
            {!profile.is_online && offlineTime && (
              <p className="text-gray-400 text-sm">{offlineTime}</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="my-8 border-t border-gray-700 mx-6 sm:mx-10"></div>

      {/* User Posts */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-semibold mb-6 text-indigo-300">Posts</h2>
        <UserPosts userId={userId} darkMode={true} />
      </div>

      {/* Avatar Modal */}
      {isAvatarModalOpen && (
        <div
          onClick={() => setIsAvatarModalOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
        >
          <img
            src={profile.avatar_url || "https://via.placeholder.com/150"}
            alt="Avatar Large"
            className="max-w-[90%] max-h-[90%] rounded-lg shadow-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Cover Modal */}
      {isCoverModalOpen && (
        <div
          onClick={() => setIsCoverModalOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
        >
          <img
            src={profile.cover_url || "none"}
            alt="Nonne"
            className="max-w-[90%] max-h-[90%] rounded-lg shadow-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </motion.div>
  );
}
