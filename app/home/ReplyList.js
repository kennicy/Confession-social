"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Trash2, Smile, Heart, CornerDownLeft } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

export default function ReplyList({ confession, user, profile, formatTimeAgo, openProfileModal }) {
  const [hoveredReplyId, setHoveredReplyId] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [nestedInputs, setNestedInputs] = useState({});
  const [replyAnonymous, setReplyAnonymous] = useState({});
  const [isPosting, setIsPosting] = useState({});
  const [showEmoji, setShowEmoji] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [replies, setReplies] = useState([]);
  const [likedReplies, setLikedReplies] = useState({});
  const replyRefs = useRef({});

  // ====================== Init liked replies ======================
  useEffect(() => {
    if (!user?.id) return; // ⚡ tránh chạy khi user null

    const fetchLikes = async () => {
      const { data } = await supabase
        .from("reply_likes")
        .select("reply_id")
        .eq("user_id", user.id);

      const liked = {};
      data?.forEach(d => liked[d.reply_id] = true);
      setLikedReplies(liked);
    };

    fetchLikes();
  }, [user?.id]); // ⚡ dùng user?.id để tránh lỗi khi user null

  // ====================== Fetch replies (2 cấp) ======================
  useEffect(() => {
    const fetchReplies = async () => {
      const { data, error } = await supabase
        .from("replies")
        .select(`
          *,
          profiles:profiles!inner(full_name, avatar_url)
        `)
        .eq("confession_id", confession.id)
        .order("created_at", { ascending: true });

      if (error) return console.error(error);

      const rootReplies = [];
      const replyMap = {};

      data.forEach(r => {
        r.children = [];
        replyMap[r.id] = r;
      });

      data.forEach(r => {
        if (r.parent_id) {
          if (replyMap[r.parent_id]) replyMap[r.parent_id].children.push(r);
        } else {
          rootReplies.push(r);
        }
      });

      setReplies(rootReplies);
    };

    fetchReplies();
  }, [confession.id]);

  // ====================== Add reply ======================
  const addReply = async (cfsId, isAnonymous, parentId = null) => {
    const content = parentId ? nestedInputs[parentId] : replyInputs[cfsId];
    if (!content?.trim() || isPosting[parentId || cfsId]) return;

    setIsPosting((prev) => ({ ...prev, [parentId || cfsId]: true }));

    try {
      // Insert reply
      const { data, error } = await supabase
        .from("replies")
        .insert([{
          content,
          confession_id: cfsId,
          user_id: user.id,
          is_anonymous: isAnonymous,
          parent_id: parentId || null,
        }])
        .select(`
          *,
          profiles:profiles!inner(full_name, avatar_url, coin)
        `)
        .single();

      if (error) throw error;

      // ✅ Cộng 5000 coin cho user trong bảng profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ coin: (data.profiles.coin ?? 0) + 2000 })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Chuẩn hóa dữ liệu reply để thêm vào state
      const replyWithProfile = {
        ...data,
        children: [],
        profiles:
          data.profiles || {
            full_name: isAnonymous ? "Ẩn danh" : profile?.full_name,
            avatar_url: profile?.avatar_url,
          },
      };

      if (parentId) {
        // Thêm vào children của reply cha
        setReplies((prev) =>
          prev.map((r) =>
            r.id === parentId
              ? { ...r, children: [...(r.children || []), replyWithProfile] }
              : r
          )
        );
        setNestedInputs((prev) => ({ ...prev, [parentId]: "" }));
      } else {
        // Thêm reply mới vào danh sách
        setReplies((prev) => [...prev, replyWithProfile]);
        setReplyInputs((prev) => ({ ...prev, [cfsId]: "" }));
      }
    } catch (err) {
      console.error("Error adding reply:", err.message);
      alert("Lỗi khi đăng phản hồi: " + err.message);
    } finally {
      setIsPosting((prev) => ({ ...prev, [parentId || cfsId]: false }));
    }
  };

  // ====================== Delete reply ======================
  const handleDelete = async ({ id, parentId = null }) => {
    try {
      await supabase.from("replies").delete().eq("id", id);
      if (parentId) {
        setReplies(prev => prev.map(r => r.id === parentId ? { ...r, children: r.children.filter(c => c.id !== id) } : r));
      } else {
        setReplies(prev => prev.filter(r => r.id !== id));
      }
    } catch(err){ console.error(err); }
    setDeleteConfirm(null);
  };

  // ====================== Like/unlike reply ======================
  const handleLike = async (reply) => {
    const hasLiked = likedReplies[reply.id];
    try {
      if (hasLiked) {
        await supabase.from("reply_likes").delete()
          .eq("reply_id", reply.id)
          .eq("user_id", user.id);
        await supabase.from("replies").update({ like_count: (reply.like_count || 1) - 1 }).eq("id", reply.id);
      } else {
        await supabase.from("reply_likes").insert([{ reply_id: reply.id, user_id: user.id }]);
        await supabase.from("replies").update({ like_count: (reply.like_count || 0) + 1 }).eq("id", reply.id);
      }
      setLikedReplies(prev => ({ ...prev, [reply.id]: !hasLiked }));
    } catch (err) { console.error(err); }
  };

  // ====================== Click outside emoji ======================
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(replyRefs.current).forEach(cfsId => {
        if (replyRefs.current[cfsId] && !replyRefs.current[cfsId].contains(event.target)) {
          setShowEmoji(prev => ({ ...prev, [cfsId]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ====================== Realtime subscription ======================
  useEffect(() => {
    const channel = supabase.channel(`replies-realtime-${confession.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies', filter: `confession_id=eq.${confession.id}` }, payload => {
        const newReply = payload.new;
        if (payload.eventType === 'DELETE') {
          setReplies(prev => prev.filter(r => r.id !== payload.old.id && (!r.children || !r.children.find(c => c.id === payload.old.id))));
        } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setReplies(prev => prev.map(r => {
            // Update root reply
            if (r.id === newReply.id) {
              return { ...r, ...newReply, profiles: r.profiles || { full_name: newReply.is_anonymous ? "Ẩn danh" : newReply.profiles?.full_name, avatar_url: newReply.profiles?.avatar_url } };
            }
            // Update children
            return { ...r, children: r.children.map(c => c.id === newReply.id ? { ...c, ...newReply, profiles: c.profiles || { full_name: newReply.is_anonymous ? "Ẩn danh" : newReply.profiles?.full_name, avatar_url: newReply.profiles?.avatar_url } } : c) };
          }));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [confession.id]);

  // ====================== Render reply recursively ======================
  const renderReply = (r) => {
    const uniqueChildren = r.children
      ? Array.from(new Map(r.children.map(c => [c.id, c])).values())
      : [];

    return (
      <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: "10px", marginLeft: r.parent_id ? "40px" : 0 }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", position: "relative" }}
            onMouseEnter={() => setHoveredReplyId(r.id)}
            onMouseLeave={() => setHoveredReplyId(null)}>
          {/* Avatar */}
          <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
            <img
              src={r.is_anonymous
                ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
                : r.profiles?.avatar_url
              }
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Content box */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{
              background: "#202020ff",
              padding: "10px 14px",
              borderRadius: "20px",
              maxWidth: "85%",
              fontSize: "0.9em",
              lineHeight: "1.4em",
              position: "relative"
            }}>
              <span
                onClick={() => {
                  if (!r.is_anonymous) {
                    openProfileModal(r.user_id); // 👈 gọi hàm cha
                  }
                }}
                style={{
                  fontSize: "0.85em",
                  fontWeight: "600",
                  cursor: r.is_anonymous ? "default" : "pointer",
                }}
              >
                {r.is_anonymous ? "Ẩn danh" : r.profiles?.full_name}
              </span>

              <div>{r.content}</div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "0.75em", color: "#65676b" }}>
              <div>{formatTimeAgo(r.created_at)}</div>
              <button
                onClick={() => handleLike(r)}
                style={{ display: "flex", alignItems: "center", gap: "4px", border: "none", background: "none", cursor: "pointer", color: likedReplies[r.id] ? "red" : "#65676b" }}
              >
                <Heart size={14} /> {r.like_count || 0}
              </button>

              {!r.parent_id && (
                <button
                  onClick={() => setNestedInputs(prev => ({ ...prev, [r.id]: prev[r.id] || "" }))}
                  style={{ display: "flex", alignItems: "center", gap: "2px", border: "none", background: "none", cursor: "pointer" }}
                >
                  <CornerDownLeft size={14} /> Reply
                </button>
              )}
            </div>

            {/* Nested input */}
            {nestedInputs[r.id] !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                <input
                  type="text"
                  placeholder="Trả lời..."
                  value={nestedInputs[r.id] || ""}
                  onChange={e => setNestedInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") addReply(confession.id, replyAnonymous[r.id] || false, r.id) }}
                  style={{ flex: 1, borderRadius: "22px", border: "1px solid #ccc", padding: "6px 10px", fontSize: "0.85em" }}
                />
                <button
                  onClick={() => addReply(confession.id, replyAnonymous[r.id] || false, r.id)}
                  disabled={isPosting[r.id]}
                  style={{ padding: "4px 10px", borderRadius: "12px", background: "#4caf50", color: "#fff", fontSize: "0.8em", cursor: isPosting[r.id] ? "not-allowed" : "pointer" }}
                >
                  {isPosting[r.id] ? "Đang gửi..." : "Rep"}
                </button>
              </div>
            )}
          </div>

          {/* Delete button */}
          {user?.id && r.user_id === user.id && hoveredReplyId === r.id && (
            <button
              style={{ position: "absolute", right: 0, top: 0 }}
              onClick={() => setDeleteConfirm({ id: r.id, parentId: r.parent_id })}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Render children cấp 2 */}
        {uniqueChildren.map(c => renderReply(c))}
      </div>
    );
  };

  // ====================== Render ======================
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {replies.map(r => renderReply(r))}

      {/* Input reply for confession */}
      <div ref={el => replyRefs.current[confession.id] = el} style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", background: "#202020ff", padding: "8px 12px", borderRadius: "30px", position: "relative" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
          <img src={profile?.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <input type="text" placeholder="Trả lời..." value={replyInputs[confession.id] || ""}
          onChange={e => setReplyInputs(prev => ({ ...prev, [confession.id]: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") addReply(confession.id, replyAnonymous[confession.id] || false) }}
          style={{ flex: 1, borderRadius: "22px", border: "1px solid #494949ff", padding: "8px 12px", fontSize: "0.9em" }}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button onClick={() => setShowEmoji(prev => ({ ...prev, [confession.id]: !prev[confession.id] }))}><Smile size={22} /></button>
          {showEmoji[confession.id] && (
            <div style={{ position: "absolute", bottom: "45px", left: "-250px", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: "12px", background: "#101010ff" }}>
              <EmojiPicker onEmojiClick={emoji => { setReplyInputs(prev => ({ ...prev, [confession.id]: (prev[confession.id] || "") + emoji.emoji })); setShowEmoji(prev => ({ ...prev, [confession.id]: false })) }} />
            </div>
          )}
        </div>
        <label style={{ fontSize: "0.8em", display: "flex", alignItems: "center", gap: "4px" }}>
          <input type="checkbox" checked={replyAnonymous[confession.id] || false} onChange={() => setReplyAnonymous(prev => ({ ...prev, [confession.id]: !prev[confession.id] }))} /> Ẩn danh
        </label>
        <button onClick={() => addReply(confession.id, replyAnonymous[confession.id] || false)} disabled={isPosting[confession.id]} style={{ padding: "5px 12px", borderRadius: "14px", background: "#4caf50", color: "#232323ff", fontSize: "0.85em", cursor: isPosting[confession.id] ? "not-allowed" : "pointer" }}>{isPosting[confession.id] ? "Đang gửi..." : "Rep"}</button>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "#1c1c1cff", padding: "28px", borderRadius: "14px", textAlign: "center" }}>
            <p style={{ marginBottom: "18px" }}>Bạn có chắc muốn xóa bình luận này?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "18px" }}>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ background: "#ff6b81", color: "#fff", padding: "6px 14px", borderRadius: "10px" }}>Yes</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: "#ccc", color: "#333", padding: "6px 14px", borderRadius: "10px" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
