import { useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { UploadCloud, Send, Trash2, Smile } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export default function ChatInput({ user, selectedUser, messagesEndRef }) {
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false); // trạng thái gửi

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

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

  const sendMessage = async () => {
    if (sending) return; // chặn spam
    if (!newMessage.trim() && !file) return;

    setSending(true);

    try {
      let type = "text";
      let image_url = null;

      if (file) {
        const ext = file.name?.split(".").pop() || "jpg";
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const folderPath = `${user.id}/`;
        const filePath = folderPath + fileName;

        const { error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("chat-images")
          .getPublicUrl(filePath);

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

      if (error) throw error;

      setNewMessage("");
      setFile(null);
      setFilePreview(null);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false); // mở lại send khi xong
    }
  };

  const addEmoji = (emojiData) =>
    setNewMessage((prev) => prev + emojiData.emoji);

return (
  <div
    className="flex flex-col p-3 border-t border-gray-700 gap-2 bg-gray-900 relative"
    onPaste={handlePaste}
  >
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
          className="absolute top-1 right-1 bg-gray-700 p-1 rounded-full hover:bg-gray-600"
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
        className="flex-1 p-2 rounded-xl border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        disabled={sending} // disable khi đang gửi
      />

      <button
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="p-2 rounded-full hover:bg-gray-700"
        disabled={sending}
      >
        <Smile size={20} />
      </button>
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-4 z-50">
          <EmojiPicker onEmojiClick={addEmoji} theme="dark" />
        </div>
      )}

      <label
        htmlFor="fileInput"
        className={`p-2 rounded-full hover:bg-gray-700 cursor-pointer ${
          sending ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <UploadCloud size={20} />
      </label>
      <input
        type="file"
        onChange={handleFileChange}
        className="hidden"
        id="fileInput"
        disabled={sending}
      />

      <button
        onClick={sendMessage}
        disabled={sending}
        className={`px-4 py-2 text-white rounded-xl font-semibold flex items-center gap-1 ${
          sending
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        <Send size={18} /> {sending ? "Sending..." : "Send"}
      </button>
    </div>
  </div>
);

}
