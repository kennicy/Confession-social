"use client"; // nhớ khai báo client component nếu dùng state/hooks

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Home, User, MessageCircle, Calendar, Bell, Settings, LogOut } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

// =================== FeedComponent ===================
export default function FeedComponent({ user, profile }) {
  // ================= STATE =================
  const [confessions, setConfessions] = useState([]);      // Danh sách confession
  const [newConfession, setNewConfession] = useState("");  // Nội dung confession mới
  const [confessionFile, setConfessionFile] = useState(null); // Ảnh upload
  const [confessionVideo, setConfessionVideo] = useState(null); // Video upload
  const [previewConfessionUrl, setPreviewConfessionUrl] = useState(null); // URL preview ảnh/video
  const [replyInputs, setReplyInputs] = useState({}); // Input cho từng confession reply
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // ID confession đang xóa
  const [reactionsData, setReactionsData] = useState({}); // Dữ liệu reactions
  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái gửi confession
  const [isAnonymous, setIsAnonymous] = useState(false); // trạng thái ẩn danh
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // hiện/ẩn emoji picker
  const textareaRef = useRef(null); // tham chiếu tới ô textarea để chèn emoji

  // ================= REACTION TYPES =================
  const reactionTypes = [
    { type: "like", icon: "👍" },
    { type: "love", icon: "❤️" },
    { type: "haha", icon: "😂" },
    { type: "wow", icon: "😮" },
    { type: "sad", icon: "😢" },
    { type: "angry", icon: "😡" },
  ];

  // ================= FETCH CONFESSIONS + REACTIONS =================
  const fetchConfessionsAndReactions = async () => {
    try {
      // Lấy confessions + profile + replies
      const { data: confs, error: confError } = await supabase
        .from("confessions")
        .select(`
          *,
          profiles:user_id(id, full_name, avatar_url, faculty, major, year),
          replies(*, profiles:user_id(id, full_name, avatar_url))
        `)
        .order("created_at", { ascending: false });

      if (confError) return console.error("Error fetching confessions:", confError);

      setConfessions(confs || []);

      // Lấy reactions
      const { data: reactions } = await supabase.from("reactions").select("*");

      const data = {};
      confs.forEach(c => {
        data[c.id] = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, userReaction: null };
      });

      reactions.forEach(r => {
        if (!data[r.confession_id])
          data[r.confession_id] = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, userReaction: null };
        data[r.confession_id][r.type] += 1;
        if (r.user_id === user.id) data[r.confession_id].userReaction = r.type;
      });

      setReactionsData(data);

    } catch (err) {
      console.error(err);
    }
  };

  // ================= EFFECTS =================
  useEffect(() => {
    fetchConfessionsAndReactions();

    // Realtime confessions
    const confSub = supabase
      .channel("public:confessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confessions" },
        payload => {
          const newC = payload.new;
          const oldC = payload.old;

          setConfessions(prev => {
            switch (payload.eventType) {
              case "INSERT":
                return [newC, ...prev];
              case "UPDATE":
                return prev.map(c => (c.id === newC.id ? newC : c));
              case "DELETE":
                return prev.filter(c => c.id !== oldC.id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    // Realtime reactions
    const reactionSub = supabase
      .channel("public:reactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        payload => {
          const r = payload.new || payload.old;
          setReactionsData(prev => {
            // Cập nhật lại reactions cho confession này
            supabase
              .from("reactions")
              .select("*")
              .eq("confession_id", r.confession_id)
              .then(({ data }) => {
                const newCounts = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, userReaction: null };
                data.forEach(x => {
                  newCounts[x.type] += 1;
                  if (x.user_id === user.id) newCounts.userReaction = x.type;
                });
                setReactionsData(prev => ({ ...prev, [r.confession_id]: newCounts }));
              });

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(confSub);
      supabase.removeChannel(reactionSub);
    };
  }, [user.id]);

  // ================= ADD CONFESSION =================
  const addConfession = async e => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newConfession && !confessionFile && !confessionVideo) return;

    setIsSubmitting(true);
    let image_url = null;
    let video_url = null;

    try {
      // Upload ảnh
      if (confessionFile) {
        const folderPath = `${user.id}`;
        const ext = confessionFile.name.split(".").pop();
        const fileName = `cfs_img_${Date.now()}.${ext}`;
        const filePath = `${folderPath}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("confession-images")
          .upload(filePath, confessionFile, { cacheControl: "0", upsert: false, contentType: confessionFile.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("confession-images").getPublicUrl(filePath);
        image_url = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Upload video
      if (confessionVideo) {
        image_url = null; // ưu tiên video nếu có
        const folderPath = `${user.id}`;
        const ext = confessionVideo.name.split(".").pop();
        const fileName = `cfs_vid_${Date.now()}.${ext}`;
        const filePath = `${folderPath}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("confession-videos")
          .upload(filePath, confessionVideo, { cacheControl: "0", upsert: false, contentType: confessionVideo.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("confession-videos").getPublicUrl(filePath);
        video_url = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Insert confession
      const { data, error } = await supabase
        .from("confessions")
        .insert({
          content: newConfession,
          user_id: user.id,
          image_url,
          video_url,
          is_anonymous: isAnonymous // thêm cột này trong DB
        })
        .select(`*, profiles:user_id(id, full_name, faculty, major, year, avatar_url), replies(*)`)
        .single();

      if (error) throw error;

      setConfessions(prev => [{ ...data, likes_count: 0, user_liked: false }, ...prev]);
      setNewConfession("");
      setConfessionFile(null);
      setConfessionVideo(null);
      setPreviewConfessionUrl(null);
    } catch (err) {
      alert("Có lỗi khi đăng: " + err.message);
      console.error("Error adding confession:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= TOGGLE REACTION =================
  const toggleReaction = async (cfsId, type) => {
    const prevData = reactionsData[cfsId] || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, userReaction: null };
    const userHasReacted = prevData.userReaction === type;

    // Update UI ngay lập tức
    setReactionsData(prev => {
      const newCounts = { ...prevData };
      if (userHasReacted) {
        newCounts[type] -= 1;
        newCounts.userReaction = null;
      } else {
        if (prevData.userReaction) newCounts[prevData.userReaction] -= 1;
        newCounts[type] += 1;
        newCounts.userReaction = type;
      }
      return { ...prev, [cfsId]: newCounts };
    });

    // Update DB
    try {
      if (userHasReacted) {
        await supabase.from("reactions").delete().eq("confession_id", cfsId).eq("user_id", user.id).eq("type", type);
      } else {
        if (prevData.userReaction) {
          await supabase.from("reactions").delete().eq("confession_id", cfsId).eq("user_id", user.id).eq("type", prevData.userReaction);
        }
        await supabase.from("reactions").insert({ confession_id: cfsId, user_id: user.id, type });
      }
    } catch (err) {
      console.error("Toggle reaction failed:", err);
      setReactionsData(prev => ({ ...prev, [cfsId]: prevData })); // rollback
    }
  };

  // ================= ADD REPLY =================
  const addReply = async cfsId => {
    const replyContent = replyInputs[cfsId];
    if (!replyContent) return;

    const { data, error } = await supabase
      .from("replies")
      .insert({ confession_id: cfsId, content: replyContent, user_id: user.id })
      .select(`*, profiles:user_id(id, full_name, avatar_url)`)
      .single();

    if (!error && data) {
      setConfessions(prev => prev.map(c => (c.id === cfsId ? { ...c, replies: [...(c.replies || []), data] } : c)));
      setReplyInputs(prev => ({ ...prev, [cfsId]: "" }));
    }
  };

  // ================= DELETE CONFESSION =================
  const handleDeleteConfession = async cfsId => {
    const { error } = await supabase.from("confessions").delete().eq("id", cfsId).eq("user_id", user.id);
    if (error) alert("Xóa thất bại: " + error.message);
    else {
      setConfessions(prev => prev.filter(c => c.id !== cfsId));
      setDeleteConfirmId(null);
    }
  };

  // ================= RENDER =================
  return (
  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>

    {/* ===== FORM POST ===== */}
    <form onSubmit={addConfession} style={{
      marginBottom: "25px",
      borderRadius: "16px",
      padding: "18px",
      backgroundColor: "#fff",
      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
      transition: "0.3s",
    }}>
      {/* PROFILE HEADER */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        marginBottom: "14px",
      }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#eee",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}>
          <img 
            src={isAnonymous 
                  ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg" 
                  : profile?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"} 
            alt="avatar" 
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} 
          />
        </div>
        <div>
          <b style={{ fontSize: "1em", color: "#333" }}>{isAnonymous ? "Ẩn danh" : profile?.full_name}</b>
          <div style={{ fontSize: "0.8em", color: "#777" }}>
            {profile?.faculty || "-"} | {profile?.major || "-"} | Khóa {profile?.year || "-"} | {profile?.gender || "-"}
          </div>
        </div>

        {/* Checkbox ẩn danh */}
        <label style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
          fontSize: "0.9em",
        }}>
          <input 
            type="checkbox" 
            checked={isAnonymous} 
            onChange={() => setIsAnonymous(!isAnonymous)}
            style={{
              width: "16px",
              height: "16px",
              accentColor: "#1e90ff", // màu checkbox hiện đại
              cursor: "pointer",
            }}
          />
          Ẩn danh
        </label>
      </div>

      {/* TEXTAREA + EMOJI + UPLOAD */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
        <textarea
          ref={textareaRef}
          placeholder="Viết confession..."
          value={newConfession}
          onChange={(e) => setNewConfession(e.target.value)}
          onPaste={(e) => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                if (file) {
                  setConfessionFile(file);
                  setPreviewConfessionUrl(URL.createObjectURL(file));
                }
              }
            }
          }}
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            fontSize: "0.95em",
            resize: "vertical",
            outline: "none",
            transition: "0.2s",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
          }}
        />

        {/* Emoji button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
            position: "absolute",
            right: "12px",
            top: "12px",
            background: "none",
            border: "none",
            fontSize: "1.2em",
            cursor: "pointer",
          }}
        >😄</button>

        {showEmojiPicker && (
          <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50 }}>
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

        {/* UPLOAD + SUBMIT */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {/* Ảnh */}
            <label htmlFor="cfs-image-upload" style={{
              padding: "6px 12px",
              backgroundColor: "#ff6b81",
              color: "#fff",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.95em",
              transition: "0.2s",
            }}>📷 Ảnh</label>
            <input id="cfs-image-upload" type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files[0];
                setConfessionFile(file);
                if (file) setPreviewConfessionUrl(URL.createObjectURL(file));
              }}
            />

            {/* Video */}
            <label htmlFor="cfs-video-upload" style={{
              padding: "6px 12px",
              backgroundColor: "#1e90ff",
              color: "#fff",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.95em",
              transition: "0.2s",
            }}>🎥 Video</label>
            <input id="cfs-video-upload" type="file" accept="video/*" style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files[0];
                setConfessionVideo(file);
                if (file) setPreviewConfessionUrl(URL.createObjectURL(file));
              }}
            />
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting} style={{
            padding: "8px 16px",
            backgroundColor: isSubmitting ? "#aaa" : "#1e90ff",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: "0.9em",
            transition: "0.2s",
          }}>
            {isSubmitting ? "Đang đăng..." : "🚀 Đăng"}
          </button>
        </div>

        {/* PREVIEW */}
        {previewConfessionUrl && (
          <div
            style={{
              width: "100%",
              maxWidth: "360px",
              height: "360px",
              position: "relative",
              overflow: "hidden",
              borderRadius: "12px",
              marginTop: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          >
            {/* Nút xóa */}
            <button
              type="button"
              onClick={() => {
                setConfessionFile(null);
                setConfessionVideo(null);
                setPreviewConfessionUrl(null);
              }}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                lineHeight: "28px",
                textAlign: "center",
                zIndex: 10,
              }}
            >×</button>

            {/* Render video nếu có, nếu không render ảnh */}
            {confessionVideo ? (
              <video
                src={previewConfessionUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                controls
              />
            ) : (
              <img
                src={previewConfessionUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt="preview"
              />
            )}
          </div>
        )}
      </div>
    </form>


    {/* ================= LIST CONFESSIONS ================= */}
    {confessions.map(c => {
      const displayName = c.is_anonymous ? "Ẩn danh" : c.profiles?.full_name || "Ẩn danh";
      const avatarUrl = c.is_anonymous 
        ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
        : c.profiles?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg";
      const faculty = c.profiles?.faculty || "-";
      const major = c.profiles?.major || "-";
      const year = c.profiles?.year || "-";
      const gender = c.profiles?.gender || "-";
      const isOwnConfession = c.user_id === user.id;

      return (
        <div key={c.id} style={{ borderRadius: "12px", marginBottom: "20px", padding: "15px", backgroundColor: "#ffffff", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          {/* PROFILE + TIME + DELETE */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <b>{displayName}</b>
                <div style={{ fontSize: "0.8em", color: "#999" }}>{faculty} | {major} | {year}| {gender}</div>
              </div>
            </div>

            {/* DELETE + TIME */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "0.75em", color: "#aaa" }}>{new Date(c.created_at).toLocaleString()}</div>
              {isOwnConfession && (
                <div style={{ display: "inline-block", position: "relative" }}>
                  <button onClick={() => setDeleteConfirmId(c.id)} style={{ padding: "4px 8px", border: "none", borderRadius: "6px", cursor: "pointer", backgroundColor: "#ff6b81", color: "#fff", fontSize: "0.75em", transition: "0.2s" }}>Xóa</button>
                  {deleteConfirmId === c.id && (
                    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                      <div style={{ backgroundColor: "#fff", padding: "20px 25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "320px" }}>
                        <p style={{ marginBottom: "15px" }}>Bạn muốn xóa bài này?</p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                          <button onClick={() => { handleDeleteConfession(c.id); setDeleteConfirmId(null); }} style={{ padding: "6px 12px", borderRadius: "6px", border: "none", backgroundColor: "#ff6b81", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>Yes</button>
                          <button onClick={() => setDeleteConfirmId(null)} style={{ padding: "6px 12px", borderRadius: "6px", border: "none", backgroundColor: "#ccc", color: "#333", cursor: "pointer", fontWeight: "bold" }}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CONTENT + MEDIA */}
          <p style={{ margin: "0 0 10px 0", fontSize: "0.95em", lineHeight: "1.4em" }}>{c.content}</p>
          {c.image_url && <img src={c.image_url} alt="confession" style={{ maxWidth: "400px", borderRadius: "10px", marginBottom: "10px" }} />}
          {c.video_url && <video src={c.video_url} controls style={{ maxWidth: "400px", borderRadius: "10px", marginBottom: "10px" }} />}

          {/* REACTIONS */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            {reactionTypes.map(r => (
              <button key={r.type} onClick={() => toggleReaction(c.id, r.type)} style={{ padding: "4px 8px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.85em", backgroundColor: reactionsData[c.id]?.userReaction === r.type ? "#ffd700" : "#eee", display: "flex", alignItems: "center", gap: "4px" }}>
                {r.icon} {reactionsData[c.id]?.[r.type] || 0}
              </button>
            ))}
          </div>

          {/* REPLIES */}
          <div>
            {(c.replies || []).map((r, idx) => (
              <div
                key={r.id || idx}
                style={{
                  display: "flex",
                  gap: "10px",
                  margin: "8px 0",
                  fontSize: "1em",
                  backgroundColor: "#f9f9f9",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  alignItems: "center",
                  marginLeft: 0
                }}
              >
                {/* Avatar */}
                <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid #ddd" }}>
                  <img
                    src={r.profiles?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"}
                    alt="avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                {/* Nội dung reply */}
                <div style={{ lineHeight: 1.4 }}>
                  <b>Ẩn danh:</b> {r.content}
                </div>
              </div>
            ))}

            {/* INPUT REPLY */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "6px",
              backgroundColor: "#f1f2f6",
              padding: "6px 10px",
              borderRadius: "30px",
              marginLeft: 0
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid #ddd" }}>
                <img
                  src={profile?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>

              <input
                type="text"
                placeholder="Trả lời..."
                value={replyInputs[c.id] || ""}
                onChange={e => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "20px",
                  border: "1px solid #ccc",
                  outline: "none",
                  fontSize: "0.95em"
                }}
              />

              <button
                type="button"
                onClick={() => addReply(c.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "none",
                  backgroundColor: "#1e90ff",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "0.95em",
                  transition: "0.2s"
                }}
              >
                Rep
              </button>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

}
