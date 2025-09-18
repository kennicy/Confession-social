"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import EmojiPicker from "emoji-picker-react";

export default function ConfessionForm({ user, profile, setConfessions }) {
  const [newConfession, setNewConfession] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [docFiles, setDocFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Emoji picker click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Paste image/video
  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
        const file = item.getAsFile();
        const type = item.type.startsWith("image/") ? "image" : "video";
        setMediaFiles(prev => [...prev, { type, file, previewUrl: URL.createObjectURL(file) }]);
      }
    }
  };

  // Upload change
  const handleMediaChange = (e, type) => {
    const file = e.target.files[0];
    if (file) setMediaFiles(prev => [...prev, { type, file, previewUrl: URL.createObjectURL(file) }]);
  };

  const handleDocChange = (e) => {
    const file = e.target.files[0];
    if (file) setDocFiles(prev => [...prev, { file }]);
  };

const addConfession = async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  // Nếu không có nội dung, media hay docs thì return
  if (!newConfession && mediaFiles.length === 0 && docFiles.length === 0) return;

  setIsSubmitting(true);

  // Khởi tạo mảng trống để đảm bảo luôn có key
  let uploadedMedia = { images: [], videos: [] };
  let uploadedDocs = [];

  try {
    // --- Upload media ---
    const uploadFile = async (fileObj, bucket) => {
      const folderPath = `${user.id}`;
      const ext = fileObj.file.name.split(".").pop();
      const fileName = `cfs_${fileObj.type || 'doc'}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${folderPath}/${fileName}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileObj.file, { cacheControl: "0", upsert: false, contentType: fileObj.file.type });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return `${data.publicUrl}?t=${Date.now()}`;
    };

    // Upload media files nếu có
    for (const item of mediaFiles) {
      const bucket = item.type === "image" ? "confession-images" : "confession-videos";
      const url = await uploadFile(item, bucket);
      if (item.type === "image") uploadedMedia.images.push(url);
      else uploadedMedia.videos.push(url);
    }

    // Upload docs nếu có
    for (const doc of docFiles) {
      const url = await uploadFile(doc, "confession-docs");
      uploadedDocs.push(url);
    }

    // --- Insert vào bảng confessions ---
    const { data, error } = await supabase
      .from("confessions")
      .insert({
        content: newConfession || "",
        user_id: user.id,
        image_url: uploadedMedia.images.length ? uploadedMedia.images : null,   // <-- luôn là mảng
        video_url: uploadedMedia.videos.length ? uploadedMedia.videos : null,   // <-- luôn là mảng
        file_url: uploadedDocs.length ? uploadedDocs : null,                     // <-- luôn là mảng
        is_anonymous: !!isAnonymous
      })
      .select()
      .single();

    if (error) throw error;

    setConfessions(prev => [{ ...data, likes_count: 0, user_liked: false }, ...prev]);
    setNewConfession(""); 
    setMediaFiles([]); 
    setDocFiles([]);

    // --- Thưởng coin ---
    try { await supabase.rpc("increment_coin", { user_id_input: user.id, amount: 5000 }); } catch {}

    // --- Thêm notification ---
    try {
      await supabase.from("notifications").insert({
        user_id: user.id,
        actor_id: user.id,
        type: "confession",
        reference_id: data.id,
        message: "Bạn vừa đăng một confession mới"
      });
    } catch {}
    
  } catch (err) {
    alert("Có lỗi khi đăng: " + err.message);
    console.error("Error adding confession:", err);
  } finally {
    setIsSubmitting(false);
  }
};


  const removeMedia = (index) => setMediaFiles(prev => prev.filter((_, i) => i !== index));
  const removeDoc = (index) => setDocFiles(prev => prev.filter((_, i) => i !== index));

  return (
    <form onSubmit={addConfession} style={{ marginBottom: "25px", borderRadius: "16px", padding: "18px", backgroundColor: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#eee", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
          <img src={isAnonymous ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg" : profile?.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <b>{isAnonymous ? "Ẩn danh" : profile?.full_name}</b>
          <div style={{ fontSize: "0.8em", color: "#777" }}>{profile?.faculty || "-"} | {profile?.major || "-"} | {profile?.year || "-"} | {profile?.gender || "-"}</div>
        </div>
        <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9em" }}>
          <input type="checkbox" checked={isAnonymous} onChange={() => setIsAnonymous(!isAnonymous)} style={{ width: "16px", height: "16px", accentColor: "#1e90ff" }} />
          Ẩn danh
        </label>
      </div>

      {/* TEXTAREA + EMOJI */}
      <div style={{ position: "relative" }}>
        <textarea
          ref={textareaRef}
          placeholder="Viết confession..."
          value={newConfession}
          onChange={(e) => setNewConfession(e.target.value)}
          onPaste={handlePaste}
          style={{ width: "100%", minHeight: "80px", padding: "12px", borderRadius: "12px", border: "1px solid #ddd", fontSize: "0.95em", resize: "vertical", outline: "none" }}
        />
        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ position: "absolute", right: "12px", top: "12px", background: "none", border: "none", fontSize: "1.2em", cursor: "pointer" }}>😄</button>
        {showEmojiPicker && (
          <div ref={emojiPickerRef} style={{ position: "absolute", top: "100%", right: "0", zIndex: 50 }}>
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                const cursorPos = textareaRef.current.selectionStart;
                const textBefore = newConfession.slice(0, cursorPos);
                const textAfter = newConfession.slice(cursorPos);
                setNewConfession(textBefore + emojiData.emoji + textAfter);
                setTimeout(() => {
                  textareaRef.current.selectionStart = cursorPos + emojiData.emoji.length;
                  textareaRef.current.selectionEnd = cursorPos + emojiData.emoji.length;
                  textareaRef.current.focus();
                }, 0);
              }}
            />
          </div>
        )}
      </div>


        {/* UPLOAD + SUBMIT */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
            <label htmlFor="cfs-image-upload" style={{ padding: "6px 12px", backgroundColor: "#ff6b81", color: "#fff", borderRadius: "8px", cursor: "pointer", fontSize: "0.95em" }}>📷 Ảnh</label>
            <input id="cfs-image-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleMediaChange(e, "image")} />

            <label htmlFor="cfs-video-upload" style={{ padding: "6px 12px", backgroundColor: "#1e90ff", color: "#fff", borderRadius: "8px", cursor: "pointer", fontSize: "0.95em" }}>🎥 Video</label>
            <input id="cfs-video-upload" type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => handleMediaChange(e, "video")} />

            <label htmlFor="cfs-doc-upload" style={{ padding: "6px 12px", backgroundColor: "#28a745", color: "#fff", borderRadius: "8px", cursor: "pointer", fontSize: "0.95em" }}>📄 File</label>
            <input id="cfs-doc-upload" type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleDocChange} />
        </div>

        <div style={{ marginLeft: "auto" }}>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", backgroundColor: isSubmitting ? "#aaa" : "#1e90ff", color: "#fff", border: "none", borderRadius: "10px", cursor: isSubmitting ? "not-allowed" : "pointer" }}>
            {isSubmitting ? "Đang đăng..." : "🚀 Đăng"}
            </button>
        </div>
        </div>

      {/* MEDIA PREVIEW GRID */}
      {mediaFiles.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: "12px", marginTop: "12px" }}>
          {mediaFiles.map((item, index) => (
            <div key={index} style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <button type="button" onClick={() => removeMedia(index)} style={{ position: "absolute", top: "4px", right: "4px", backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "14px" }}>×</button>
              {item.type === "video" ? <video src={item.previewUrl} style={{ width: "100%", height: "100%", objectFit: "cover" ,pointerEvents: "none"}} controls /> : <img src={item.previewUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="preview" />}
            </div>
          ))}
        </div>
      )}

      {/* DOC PREVIEW LIST */}
      {docFiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
          {docFiles.map((item, index) => (
            <div key={index} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📄 {item.file.name}</span>
              <button type="button" onClick={() => removeDoc(index)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#ff6b81" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
