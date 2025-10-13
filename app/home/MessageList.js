import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export default function MessageList({ user, allUsers, selectedUser, messages, setMessages, messagesEndRef }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // ảnh để preview

  const filteredMessages = messages
    .filter((m) => m.user_id === selectedUser.id || m.recipient_id === selectedUser.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const uniqueMessages = filteredMessages.reduce((acc, m) => {
    if (!acc.find((msg) => msg.id === m.id)) acc.push(m);
    return acc;
  }, []);

  const handleDelete = async (id) => {
    await supabase.from("messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setConfirmDeleteId(null);
  };

  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [uniqueMessages]);

  let lastDate = null;
return (
  <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 bg-gray-900 relative">
    {uniqueMessages.map((m) => {
      const isMe = m.user_id === user.id;
      const sender = allUsers.find((u) => u.id === m.user_id);
      const msgDate = dayjs(m.created_at).format("YYYY-MM-DD");
      const showDate = lastDate !== msgDate;
      lastDate = msgDate;

      return (
        <div key={m.id} className="flex flex-col gap-1">
          {showDate && (
            <div className="text-center text-gray-400 text-xs py-1">
              {dayjs(m.created_at).format("DD/MM/YYYY")}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
          >
            {!isMe && (
              <div className="w-7 h-7 rounded-full overflow-hidden">
                <img
                  src={
                    sender?.avatar_url ||
                    "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="relative group max-w-[70%] flex items-start">
              {isMe && (
                <button
                  onClick={() => setConfirmDeleteId(m.id)}
                  className="mr-1 opacity-0 group-hover:opacity-100 bg-gray-700 hover:bg-red-600 text-red-400 rounded-full p-1 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <div
                className={`p-3 rounded-2xl shadow text-sm ${
                  isMe
                    ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                {m.content && <div>{m.content}</div>}
                {m.image_url && (
                  <div className="mt-2">
                    {m.type === "image" ? (
                      <img
                        src={m.image_url}
                        alt="img"
                        className="max-w-xs rounded-lg cursor-pointer"
                        onClick={() => setPreviewImage(m.image_url)}
                      />
                    ) : (
                      <video src={m.image_url} controls className="max-w-xs rounded-lg" />
                    )}
                  </div>
                )}
                <div className="text-[10px] mt-1 text-right text-gray-400">
                  {dayjs(m.created_at).format("HH:mm")}
                  {isMe && m.is_read ? " ✓" : ""}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      );
    })}
    <div ref={messagesEndRef} />

    {/* --- Popup xác nhận xóa --- */}
    {confirmDeleteId && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <div className="bg-gray-800 p-4 rounded shadow-md flex flex-col gap-3 w-64">
          <span className="text-gray-200 text-center">Delete this message?</span>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleDelete(confirmDeleteId)}
              className="px-4 py-1 bg-red-600 text-white rounded"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-4 py-1 bg-gray-600 text-gray-200 rounded"
            >
              No
            </button>
          </div>
        </div>
      </div>
    )}

    {/* --- Modal xem ảnh --- */}
    {previewImage && (
      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
        onClick={() => setPreviewImage(null)}
      >
        <img
          src={previewImage}
          alt="preview"
          className="max-h-[90%] max-w-[90%] rounded-lg shadow-lg"
        />
      </div>
    )}
  </div>
);

}
