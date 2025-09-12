"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import EmojiPicker from "emoji-picker-react";

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
  "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
  "😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔",
  "🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌",
  "😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧",
  "🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐",
  "😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦",
  "😧","😨","😰","😥","😢","😭","😱","😖","😣","😞",
  "😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿",
  "💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖",
  "🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
  "👐","🙌","👏","🙏","🤝","👍","👎","👊","✊","🤛",
  "🤜","🤞","✌️","🤟","🤘","👌","👈","👉","👆","👇",
  "☝️","✋","🤚","🖐","🖖","👋","🤙","💪","🦵","🦶"
];

export default function PublicChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deletePopup, setDeletePopup] = useState({ show: false, msgId: null });
  const [hoverBubbleId, setHoverBubbleId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Show web notification
  const notifyNewMessage = (msg) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const title = msg.profiles?.nickname || "Ẩn danh";
      const options = {
        body: msg.content || "🖼️ Hình ảnh",
        icon: msg.profiles?.avatar_url || "/default-avatar.png",
      };
      new Notification(title, options);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles:user_id(nickname, avatar_url)")
        .order("created_at", { ascending: true });
      if (!error) setMessages(data);
    };
    fetchMessages();

    const sub = supabase.channel("public:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMsgData = payload.new;
        const { data: profData } = await supabase.from("profiles").select("nickname, avatar_url").eq("id", newMsgData.user_id).single();
        const newMessage = { ...newMsgData, profiles: profData };
        setMessages(prev => [...prev, newMessage]);

        if (newMsgData.user_id !== user.id) {
          notifyNewMessage(newMessage);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [user.id]);

  useEffect(() => scrollToBottom(), [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() && !imageFile) return;

    try {
      const { data: profData } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", user.id)
        .single();

      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        await supabase.storage.from("chat-images").upload(filePath, imageFile);
        const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const messageData = {
        user_id: user.id,
        username: profData?.nickname || "Ẩn danh",
        avatar_url: profData?.avatar_url || null,
        content: newMsg.trim(),
        image_url: imageUrl,
      };

      const { data } = await supabase
        .from("messages")
        .insert([messageData])
        .select()
        .single();

      setMessages(prev => [...prev, { ...data, profiles: { nickname: profData.nickname, avatar_url: profData.avatar_url } }]);
      setNewMsg("");
      setImageFile(null);
    } catch (err) {
      console.error(err);
      alert("Gửi tin nhắn thất bại!");
    }
  };

  const confirmDelete = (msgId) => setDeletePopup({ show: true, msgId });
  const handleDelete = async () => {
    const { error } = await supabase.from("messages").delete().eq("id", deletePopup.msgId);
    if (!error) setMessages(messages.filter(m => m.id !== deletePopup.msgId));
    setDeletePopup({ show: false, msgId: null });
  };

  const addEmoji = (emoji) => setNewMsg(prev => prev + emoji);

  const handlePaste = (e) => {
    if (e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith("image/")) setImageFile(file);
    }
  };

  return (
    <div
      style={{
        borderRadius: 20,
        maxWidth: 720,
        margin: "30px auto",
        display: "flex",
        flexDirection: "column",
        height: 640,
        backgroundColor: "#121212",
        overflow: "hidden",
        boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
        fontFamily: "'Inter', sans-serif",
      }}
      onPaste={handlePaste}
    >
      {/* Chat Window */}
      <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map(msg => {
          const isMe = msg.user_id === user.id;
          const avatar = msg.profiles?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isMe ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 12,
                transition: "all 0.2s",
              }}
              onMouseEnter={() => setHoverBubbleId(msg.id)}
              onMouseLeave={() => setHoverBubbleId(null)}
            >
              {/* Avatar */}
              <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.4)", transition: "transform 0.2s" }}>
                <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>

              {/* Bubble container */}
              <div style={{ position: "relative", display: "flex", flexDirection: "column", maxWidth: "70%" }}>
                {isMe && hoverBubbleId === msg.id && (
                  <button
                    onClick={() => confirmDelete(msg.id)}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: -28,
                      transform: "translateY(-50%)",
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.9,
                      transition: "all 0.2s",
                    }}
                  >
                    ✖
                  </button>
                )}

                {/* Chat bubble */}
                <div
                  style={{
                    background: isMe ? "linear-gradient(135deg, #6C63FF, #8A73FF)" : "linear-gradient(135deg, #2D2F36, #3C3F47)",
                    color: "#fff",
                    borderRadius: 20,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    wordBreak: "break-word",
                    position: "relative",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  {msg.content && <div style={{ fontSize: 14 }}>{msg.content}</div>}
                  {msg.image_url && (
                    <img src={msg.image_url} alt="sent-img" style={{ width: "100%", maxWidth: 220, borderRadius: 12, marginTop: 6, objectFit: "cover", cursor: "pointer" }} />
                  )}
                </div>

                <div style={{ fontSize: 10, color: "#ccc", marginTop: 3, textAlign: isMe ? "right" : "left" }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input Section */}
      <div style={{ display: "flex", padding: "12px 16px", gap: 8, alignItems: "center", borderTop: "1px solid #333", backgroundColor: "#1e1e1e", position: "relative" }}>
        <button onClick={() => setShowEmojiPicker(prev => !prev)} style={{ fontSize: 22, background: "transparent", border: "none", color: "#ffb500", cursor: "pointer" }}>😄</button>

        {showEmojiPicker && (
          <div style={{ position: "absolute", bottom: 50, left: 16, zIndex: 10 }}>
            <EmojiPicker
              onEmojiClick={(emojiObject) => {
                const cursorPos = inputRef.current.selectionStart;
                const text = newMsg;
                const newText = text.slice(0, cursorPos) + emojiObject.emoji + text.slice(cursorPos);
                setNewMsg(newText);
                // đặt lại con trỏ sau emoji
                setTimeout(() => inputRef.current.setSelectionRange(cursorPos + emojiObject.emoji.length, cursorPos + emojiObject.emoji.length), 0);
              }}
              theme="dark"
              searchDisabled={true} // nếu muốn ẩn search
              skinTonesDisabled={true} // nếu muốn ẩn skin tones
            />
          </div>
        )}

        <label htmlFor="imageUpload" style={{ fontSize: 22, cursor: "pointer", color: "#d18fff" }}>📷</label>
        <input type="file" accept="image/*" style={{ display: "none" }} id="imageUpload" onChange={(e) => setImageFile(e.target.files[0] || null)} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 24, backgroundColor: "#2a2a2a", cursor: "text", position: "relative" }} onClick={() => { inputRef.current.focus(); setShowEmojiPicker(false); }}>
          {imageFile && (
            <div style={{ position: "relative" }}>
              <img src={URL.createObjectURL(imageFile)} alt="preview" style={{ width: 50, height: 50, borderRadius: 8, objectFit: "cover" }} />
              <button onClick={() => setImageFile(null)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#ff5555", color: "#fff", cursor: "pointer", fontSize: 12 }}>✖</button>
            </div>
          )}
          <input ref={inputRef} value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Nhập tin nhắn..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14 }} onFocus={() => setShowEmojiPicker(false)} />
        </div>

        <button onClick={handleSend} style={{ padding: "8px 16px", borderRadius: 20, border: "none", backgroundColor: "#0084ff", color: "#fff", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#3399ff"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "#0084ff"}>Gửi</button>
      </div>

      {/* Delete popup */}
      {deletePopup.show && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#2a2a2a", color: "#fff", padding: "16px 24px", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 100, display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
          <span>Bạn có chắc muốn xóa tin nhắn này?</span>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setDeletePopup({ show: false, msgId: null })} style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, backgroundColor: "#555", color: "#fff" }}>Hủy</button>
            <button onClick={handleDelete} style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, backgroundColor: "#ff5555", color: "#fff" }}>Xóa</button>
          </div>
        </div>
      )}
    </div>
  );
}
