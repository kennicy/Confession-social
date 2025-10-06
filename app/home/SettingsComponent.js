"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Settings, Bell, LogOut, Smile, ThumbsUp } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import dynamic from "next/dynamic";

// Dynamic import emoji picker (SSR false)
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export default function SettingsComponent() {
  const [userId, setUserId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedbacksList, setFeedbacksList] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  // Lấy userId
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    };
    fetchUser();
  }, []);

  // Load feedbacks của user
  useEffect(() => {
    if (!userId) return;
    const fetchFeedbacks = async () => {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      else setFeedbacksList(data);
    };
    fetchFeedbacks();
  }, [userId, submitted]);

  // Click ngoài đóng picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .insert([{ user_id: userId, content: feedback }])
        .select();

      if (error) console.error(error);
      else {
        setSubmitted(true);
        setFeedback("");
        setShowEmojiPicker(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setFeedback(feedback + emojiData.emoji);
  };

  if (!userId) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6 font-sans">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-800">
        <Settings size={28} /> Account Settings
      </h1>

      {/* Feedback Card */}
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-lg mb-8 border border-gray-200 relative">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-700">
          <MessageSquare size={22} /> Feedback
        </h2>

        {submitted && (
          <p className="text-green-600 font-medium mb-4 text-center animate-pulse">
            ✅ Thanks for your feedback!
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 relative">
          <div className="relative">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts or suggestions..."
              className="border border-gray-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shadow-sm hover:shadow transition-all w-full"
              rows={4}
            />
            {/* Emoji button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 bottom-3 text-gray-500 hover:text-gray-700 transition"
            >
              <Smile size={20} />
            </button>
          </div>

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute z-50 mt-2"
              style={{ bottom: "-300px", left: 0 }}
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}

          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium shadow hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <ThumbsUp size={18} /> Send Feedback
          </button>
        </form>

        {/* Feedback List */}
        {feedbacksList.length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-semibold mb-3 text-gray-700 flex items-center gap-2">
              <Smile size={18} /> Your Feedbacks:
            </h3>
            <ul className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              {feedbacksList.map((f) => (
                <li
                  key={f.id}
                  className="border-l-4 border-indigo-500 bg-indigo-50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1"
                >
                  <p className="text-gray-800">{f.content}</p>
                  <small className="text-gray-500">{new Date(f.created_at).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Other Settings Card */}
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Other Options</h2>
        <div className="flex flex-col gap-4">
          <button className="flex items-center gap-3 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 hover:scale-105 transform transition-all duration-200 shadow-sm">
            <Bell size={20} /> Notifications
          </button>
          <button className="flex items-center gap-3 px-6 py-3 border border-gray-300 rounded-xl hover:bg-red-50 hover:scale-105 transform transition-all duration-200 shadow-sm">
            <LogOut size={20} /> Log out
          </button>
        </div>
      </div>
      
    </div>
  );
}
