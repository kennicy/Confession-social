"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { motion } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import { UploadCloud, Send, Trash2, Smile } from "lucide-react";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

export default function MessagesComponent({ user }) {
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);

  // --- Fetch all users except self
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

  // --- Fetch all messages + realtime
  useEffect(() => {
    if (!user?.id) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      setMessages(data || []);

      // Tính số unread cho mỗi user
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
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new;
        if (msg.user_id === user.id || msg.recipient_id === user.id) {
          setMessages((prev) => {
            if (!prev.find((m) => m.id === msg.id)) return [...prev, msg];
            return prev;
          });

          // cập nhật unread count nếu người khác gửi
          if (msg.recipient_id === user.id && !msg.is_read) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.user_id]: (prev[msg.user_id] || 0) + 1,
            }));
          }
        }
      })
      .subscribe();

    return () => supabase.removeChannel(messageChannel);
  }, [user.id]);

  // --- Mark messages as read when selectedUser changes
  useEffect(() => {
    if (!selectedUser) return;

    const markAsRead = async () => {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("user_id", selectedUser.id)
        .eq("is_read", false);

      // Xóa badge unread count khi đọc
      setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }));
    };
    markAsRead();

    scrollToBottom();
  }, [selectedUser?.id, user.id]);

  // --- Scroll function
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Handle file
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  // --- Paste image support
  const handlePaste = (e) => {
    const clipboardItems = e.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        setFile(blob);
        setFilePreview(URL.createObjectURL(blob));
      }
    }
  };

  // --- Send message
  const sendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    let type = "text";
    let image_url = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const folderPath = `${user.id}/`;
      const filePath = folderPath + fileName;

      const { error: uploadError } = await supabase.storage.from("chat-images").upload(filePath, file);
      if (uploadError) return console.error("Upload error:", uploadError);

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(filePath);
      image_url = urlData.publicUrl;
      type = file.type.startsWith("image/") ? "image" : "video";
    }

    const { error } = await supabase.from("messages").insert([
      {
        user_id: user.id,
        recipient_id: selectedUser.id,
        content: newMessage.trim() || null,
        image_url,
        type,
      },
    ]);

    if (error) return console.error("Insert message error:", error);

    setNewMessage("");
    setFile(null);
    setFilePreview(null);
  };

  // --- Add emoji
  const addEmoji = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  // --- Filter messages for selectedUser
  const filteredMessages = selectedUser
    ? messages.filter((m) => m.user_id === selectedUser.id || m.recipient_id === selectedUser.id)
    : [];

  const uniqueMessages = filteredMessages.reduce((acc, m) => {
    if (!acc.find((msg) => msg.id === m.id)) acc.push(m);
    return acc;
  }, []);

  return (
    <div className="flex h-full font-sans" onPaste={handlePaste} style={{ height: "90vh" }}>
      {/* --- User list --- */}
      <div className="w-64 border-r border-gray-200 p-3 bg-gray-50 overflow-y-auto">
        <h4 className="mb-3 font-semibold text-gray-700">Users</h4>
        {allUsers.map((u) => (
          <motion.div
            key={u.id}
            onClick={() => setSelectedUser(u)}
            className={`flex items-center justify-between p-2 mb-2 cursor-pointer rounded-lg transition-all ${
              selectedUser?.id === u.id ? "bg-blue-50 shadow" : "hover:bg-gray-100"
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3">
              <img
                src={u.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
              <div className="flex flex-col">
                <p className="m-0 font-medium text-gray-800 text-sm">{u.full_name}</p>
                <small className="text-gray-500 text-xs">
                  {u.is_online ? "Online" : dayjs(u.last_online).add(7, "hour").fromNow()}
                </small>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${u.is_online ? "bg-green-400" : "bg-gray-400"}`}></span>
              {/* --- Unread badge --- */}
              {unreadCounts[u.id] > 0 && (
                <div className="w-5 h-5 bg-red-500 text-white text-xs font-semibold flex items-center justify-center rounded-full">
                  {unreadCounts[u.id]}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* --- Chat window --- */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-gray-200 font-semibold text-gray-700 bg-gray-50 flex items-center gap-2">
              <img src={selectedUser.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"} className="w-8 h-8 rounded-full" />
              <span>{selectedUser.full_name}</span>
              <span className={`text-xs ${selectedUser.is_online ? "text-green-500" : "text-gray-400"}`}>
                {selectedUser.is_online ? "Online" : "Offline"}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 bg-gray-50">
              {uniqueMessages.map((m) => {
                const isMe = m.user_id === user.id;
                const sender = allUsers.find((u) => u.id === m.user_id);

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {!isMe && (
                      <img
                        src={sender?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                    )}
                    <div
                      className={`p-3 rounded-2xl max-w-[70%] shadow text-sm ${
                        isMe ? "bg-gradient-to-br from-blue-500 to-blue-400 text-white" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.content && <div>{m.content}</div>}
                      {m.image_url && (
                        <div className="mt-2">
                          {m.type === "image" ? (
                            <img src={m.image_url} alt="img" className="max-w-xs rounded-lg" />
                          ) : (
                            <video src={m.image_url} controls className="max-w-xs rounded-lg" />
                          )}
                        </div>
                      )}
                      <div className="text-[10px] mt-1 text-right text-gray-300">
                        {dayjs(m.created_at).format("HH:mm")}
                        {isMe && m.is_read ? " ✓" : ""}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex flex-col p-3 border-t border-gray-200 gap-2 bg-gray-50 relative">
              {filePreview && (
                <div className="relative">
                  {file.type.startsWith("image/") ? (
                    <img src={filePreview} alt="preview" className="max-w-xs rounded-lg" />
                  ) : (
                    <video src={filePreview} controls className="max-w-xs rounded-lg" />
                  )}
                  <button
                    onClick={() => {
                      setFile(null);
                      setFilePreview(null);
                    }}
                    className="absolute top-1 right-1 bg-gray-200 p-1 rounded-full hover:bg-gray-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />

                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full hover:bg-gray-200">
                  <Smile size={20} />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-16 right-4 z-50">
                    <EmojiPicker onEmojiClick={addEmoji} />
                  </div>
                )}

                <label htmlFor="fileInput" className="p-2 rounded-full hover:bg-gray-200 cursor-pointer">
                  <UploadCloud size={20} />
                </label>
                <input type="file" onChange={handleFileChange} className="hidden" id="fileInput" />

                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 flex items-center gap-1"
                >
                  <Send size={18} /> Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a user to start chat
          </div>
        )}
      </div>
    </div>
  );
}
