"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import EmojiPicker from "emoji-picker-react";
import { Smile, Upload, File, Video, Send, X } from "lucide-react";


export default function ConfessionForm({ user, setConfessions }) {
  const [profile, setProfile] = useState(null);
  const [newConfession, setNewConfession] = useState("");
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [files, setFiles] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef(null);
  const emojiRef = useRef(null);
  const savedRangeRef = useRef(null);

  const toolbarBtnStyle = {
    border: "none",
    background: "#fff",
    padding: "4px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    transition: "0.2s",
  };

  const colorInputStyle = {
    width: 28,
    height: 28,
    padding: 0,
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer"
  };

  // ===== Fetch profile =====
  useEffect(() => {
    if (!user?.id) return; // ⚡ Nếu user null hoặc không có id → không chạy

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    };
    fetchProfile();

    const profileSub = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        payload => setProfile(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(profileSub);
  }, [user?.id]);

  // ===== Outside click for emoji =====
  useEffect(() => {
    const handleClickOutside = e => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ===== Save cursor position =====
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0);
  };

  // Chèn emoji tại vị trí đã lưu
  const insertEmoji = (emoji) => {
    const editor = editorRef.current;
    editor.focus();

    const sel = window.getSelection();
    
    if (savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    } else {
      // nếu chưa có range, đặt con trỏ cuối editor
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const range = sel.getRangeAt(0);
    const emojiNode = document.createTextNode(emoji);
    range.deleteContents();
    range.insertNode(emojiNode);

    // Move cursor after emoji
    range.setStartAfter(emojiNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    savedRangeRef.current = range;
    setNewConfession(editor.innerHTML);
  };

  // ===== Handle submit =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newConfession && images.length === 0 && videos.length === 0 && files.length === 0) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let image_urls = [], video_urls = [], file_urls = [];

      // Upload ảnh
      for (const img of images) {
        const path = `${user.id}/img_${Date.now()}_${img.name}`;
        const { error } = await supabase.storage.from("confession-images").upload(path, img);
        if (error) throw error;
        const { data } = supabase.storage.from("confession-images").getPublicUrl(path);
        image_urls.push(`${data.publicUrl}?t=${Date.now()}`);
      }

      // Upload video
      for (const vid of videos) {
        const path = `${user.id}/vid_${Date.now()}_${vid.name}`;
        const { error } = await supabase.storage.from("confession-videos").upload(path, vid);
        if (error) throw error;
        const { data } = supabase.storage.from("confession-videos").getPublicUrl(path);
        video_urls.push(`${data.publicUrl}?t=${Date.now()}`);
      }

      // Upload file
      for (const f of files) {
        const path = `${user.id}/file_${Date.now()}_${f.name}`;
        const { error } = await supabase.storage.from("confession-files").upload(path, f);
        if (error) throw error;
        const { data } = supabase.storage.from("confession-files").getPublicUrl(path);
        file_urls.push(`${data.publicUrl}?t=${Date.now()}`);
      }

      // Insert confession
      const { data, error } = await supabase.from("confessions")
        .insert({
          content: newConfession,
          user_id: user.id,
          image_url: image_urls.length ? image_urls : null,
          video_url: video_urls.length ? video_urls : null,
          file_url: file_urls.length ? file_urls : null,
          is_anonymous: isAnonymous,
        })
        .select(`*, profiles:user_id(*)`)
        .single();

      if (error) throw error;

      // ✅ Cộng 5000 coin cho user trong bảng profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ coin: (data.profiles.coin ?? 0) + 20000 })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Thêm confession mới vào state
      setConfessions((prev) => [data, ...prev]);

      // Reset form
      setNewConfession("");
      setImages([]);
      setVideos([]);
      setFiles([]);

    } catch (err) {
      console.error(err);
      alert("Lỗi khi đăng: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

return (
  <form
    onSubmit={handleSubmit}
    style={{
      background: "#1a1a1a", // nền tối
      borderRadius: "20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      padding: "10px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      color: "#f1f1f1"
    }}
  >
    {/* User info */}
    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
      <img
        src={
          isAnonymous
            ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
            : profile?.avatar_url
        }
        style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>
          {isAnonymous ? "Ẩn danh" : profile?.full_name}
        </span>
        {!isAnonymous && profile && (
          <span style={{ fontSize: "13px", color: "#aaa" }}>
            {profile.faculty} • {profile.major} • {profile.year} • {profile.gender}
          </span>
        )}
      </div>
      <label
        style={{
          marginLeft: "auto",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          color: "#ddd"
        }}
      >
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={() => setIsAnonymous(!isAnonymous)}
        />
        Ẩn danh
      </label>
    </div>

    {/* Editor + Toolbar + Emoji */}
    <div
      style={{
        position: "relative",
        border: "1px solid #333",
        borderRadius: 16,
        padding: 1,
        background: "#222",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
          background: "#2a2a2a", // nền tối
          padding: "6px 8px",
          borderRadius: 12,
          boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.05)"
        }}
      >
        <button
          type="button"
          onClick={() => document.execCommand("bold")}
          title="Bold (Ctrl+B)"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "none",
            background: "#333",
            color: "#f5f5f5",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "0.2s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#444"}
          onMouseOut={e => e.currentTarget.style.background = "#333"}
        >
          B
        </button>

        <button
          type="button"
          onClick={() => document.execCommand("italic")}
          title="Italic (Ctrl+I)"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "none",
            background: "#333",
            color: "#f5f5f5",
            cursor: "pointer",
            fontStyle: "italic",
            transition: "0.2s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#444"}
          onMouseOut={e => e.currentTarget.style.background = "#333"}
        >
          I
        </button>

        <button
          type="button"
          onClick={() => document.execCommand("underline")}
          title="Underline (Ctrl+U)"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "none",
            background: "#333",
            color: "#f5f5f5",
            cursor: "pointer",
            textDecoration: "underline",
            transition: "0.2s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#444"}
          onMouseOut={e => e.currentTarget.style.background = "#333"}
        >
          U
        </button>

        <button
          type="button"
          onClick={() => document.execCommand("strikeThrough")}
          title="Strike"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "none",
            background: "#333",
            color: "#f5f5f5",
            cursor: "pointer",
            textDecoration: "line-through",
            transition: "0.2s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#444"}
          onMouseOut={e => e.currentTarget.style.background = "#333"}
        >
          S
        </button>

        {/* Màu chữ */}
        <input
          type="color"
          onChange={e => document.execCommand("foreColor", false, e.target.value)}
          title="Màu chữ"
          style={{
            width: 32,
            height: 32,
            border: "none",
            borderRadius: 6,
            background: "#222",
            cursor: "pointer"
          }}
        />
      </div>


      {/* Editable content */}
      <div
        ref={editorRef}
        contentEditable
        onFocus={() => {
          const sel = window.getSelection();
          if (sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0);
        }}
        onInput={() => {
          const sel = window.getSelection();
          if (sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0);
          setNewConfession(editorRef.current.innerHTML);
        }}
        onPaste={async (e) => {
          const items = e.clipboardData.items;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf("image") !== -1) {
              e.preventDefault();
              const file = item.getAsFile();
              setImages(prev => [...prev, file]);
            }
          }
        }}
        style={{
          minHeight: "120px",
          outline: "none",
          padding: "8px",
          borderRadius: "12px",
          fontSize: "15px",
          lineHeight: "1.5",
          background: "#1e1e1e",
          color: "#f5f5f5",
          boxShadow: "inset 0 1px 3px rgba(255,255,255,0.05)",
          overflowY: "auto"
        }}
      ></div>

      {/* Emoji picker */}
      <button
        type="button"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        onMouseDown={e => e.preventDefault()}
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#ccc"
        }}
      >
        <Smile size={20} />
      </button>

      {showEmojiPicker && (
        <div ref={emojiRef} style={{ position: "absolute", right: 0, top: "100%", zIndex: 10 }}>
          <EmojiPicker onEmojiClick={e => insertEmoji(e.emoji)} />
        </div>
      )}
    </div>

    {/* Preview nhiều file */}
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      {images.map((img, i) => (
        <div key={i} style={{ position: "relative", width: 120, height: 90, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          <img src={URL.createObjectURL(img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button
            type="button"
            onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
            style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      {videos.map((vid, i) => (
        <div key={i} style={{ position: "relative", width: 140, height: 90, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          <video src={URL.createObjectURL(vid)} controls style={{ width: "100%", height: "100%" }} />
          <button
            type="button"
            onClick={() => setVideos(prev => prev.filter((_, idx) => idx !== i))}
            style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      {files.map((f, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            border: "1px solid #444",
            borderRadius: 12,
            background: "#2a2a2a",
            color: "#eee"
          }}
        >
          <File size={20} />
          <span style={{ fontSize: "14px" }}>{f.name}</span>
          <button
            type="button"
            onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ccc" }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>

    {/* Buttons */}
    <div
      style={{
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
        alignItems: "center",
        marginTop: "0px"
      }}
    >
      <label
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          padding: "8px 14px",
          borderRadius: "12px",
          background: "#1e293b",
          color: "#60a5fa",
          fontWeight: 500,
          transition: "0.2s"
        }}
      >
        <Upload size={18} /> Ảnh
        <input
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => setImages(prev => [...prev, ...Array.from(e.target.files)])}
        />
      </label>

      <label
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          padding: "8px 14px",
          borderRadius: "12px",
          background: "#2a1d12",
          color: "#f59e0b",
          fontWeight: 500,
          transition: "0.2s"
        }}
      >
        <Video size={18} /> Video
        <input
          type="file"
          accept="video/*"
          multiple
          style={{ display: "none" }}
          onChange={e => setVideos(prev => [...prev, ...Array.from(e.target.files)])}
        />
      </label>

      <label
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          padding: "8px 14px",
          borderRadius: "12px",
          background: "#3b1d1d",
          color: "#f87171",
          fontWeight: 500,
          transition: "0.2s"
        }}
      >
        <File size={18} /> File
        <input
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          marginLeft: "auto",
          padding: "10px 20px",
          borderRadius: "20px",
          background: isSubmitting ? "#555" : "#2563eb",
          color: "#fff",
          border: "none",
          fontWeight: 600,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          transition: "0.2s"
        }}
      >
        <Send size={18} /> {isSubmitting ? "Đang gửi..." : "Đăng"}
      </button>
    </div>
  </form>
);

}
