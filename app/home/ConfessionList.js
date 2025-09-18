"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Trash2, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

export default function ConfessionList({ user, profile, confessions, setConfessions, reactionsData, setReactionsData }) {

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteReplyId, setDeleteReplyId] = useState(null);
  const [deleteReplyCfsId, setDeleteReplyCfsId] = useState(null);
  const [hoveredReplyId, setHoveredReplyId] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [replyAnonymous, setReplyAnonymous] = useState({});
  const [showEmoji, setShowEmoji] = useState({});

  const reactionTypes = [
    { type: "like", icon: "👍" },
    { type: "love", icon: "❤️" },
    { type: "haha", icon: "😂" },
    { type: "wow", icon: "😮" },
    { type: "sad", icon: "😢" },
    { type: "angry", icon: "😡" },
  ];

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  // ================= FETCH CONFESSIONS & REACTIONS =================
  const fetchConfessionsAndReactions = async () => {
    try {
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

  useEffect(() => {
    fetchConfessionsAndReactions();

    // ===== SUBSCRIBE REALTIME =====
    const channel = supabase
      .channel("confessions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confessions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setConfessions(prev => [payload.new, ...prev]);
          }
          if (payload.eventType === "UPDATE") {
            setConfessions(prev =>
              prev.map(c => (c.id === payload.new.id ? payload.new : c))
            );
          }
          if (payload.eventType === "DELETE") {
            setConfessions(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // ================= TOGGLE REACTION =================
  const toggleReaction = async (cfsId, type) => {
    const prevData = reactionsData[cfsId] || { like:0,love:0,haha:0,wow:0,sad:0,angry:0,userReaction:null };
    const userHasReacted = prevData.userReaction === type;

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

    try {
      if (userHasReacted) {
        await supabase.from("reactions").delete().eq("confession_id", cfsId).eq("user_id", user.id).eq("type", type);
      } else {
        if (prevData.userReaction) await supabase.from("reactions").delete().eq("confession_id", cfsId).eq("user_id", user.id).eq("type", prevData.userReaction);
        await supabase.from("reactions").insert({ confession_id: cfsId, user_id: user.id, type });
      }
    } catch(err) {
      console.error("Toggle reaction failed:", err);
      setReactionsData(prev => ({ ...prev, [cfsId]: prevData })); // rollback
    }
  };

  // ================= ADD REPLY =================
  const addReply = async (cfsId) => {
    const replyContent = replyInputs[cfsId]?.trim();
    if (!replyContent) return;
    const isAnonymousReply = replyAnonymous[cfsId] || false;

    const { data: replyData, error: replyError } = await supabase
      .from("replies")
      .insert({
        confession_id: cfsId,
        content: replyContent,
        user_id: user.id,
        is_anonymous: isAnonymousReply
      })
      .select(`id, content, user_id, is_anonymous, profiles:user_id(id, full_name, avatar_url)`)
      .single();

    if (replyError) return console.error("Add reply error:", replyError);

    setConfessions(prev => prev.map(c => c.id === cfsId ? { ...c, replies: [...(c.replies||[]), replyData] } : c));
    setReplyInputs(prev => ({ ...prev, [cfsId]: "" }));
    setReplyAnonymous(prev => ({ ...prev, [cfsId]: false }));
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

  return (
    <div>
      {confessions.map(c => {
        const isOwnConfession = c.user_id === user.id;
        const displayName = c.is_anonymous ? "Ẩn danh" : c.profiles?.full_name || "Ẩn danh";
        const avatarUrl = c.is_anonymous
          ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
          : c.profiles?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg";

        return (
          <div key={c.id} style={{ borderRadius:"12px", marginBottom:"20px", padding:"15px", backgroundColor:"#fff", boxShadow:"0 4px 10px rgba(0,0,0,0.05)" }}>
            {/* HEADER */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", overflow:"hidden", flexShrink:0 }}>
                  <img src={avatarUrl} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
                <div style={{ fontWeight: c.is_anonymous ? "bold" : "400" }}>{displayName}</div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ fontSize:"0.75em", color:"#aaa" }}>{new Date(c.created_at).toLocaleString()}</div>
                {isOwnConfession && (
                  <div style={{ position:"relative" }}>
                    <button onClick={() => setDeleteConfirmId(c.id)} style={{ padding:"4px 8px", border:"none", borderRadius:"6px", cursor:"pointer", backgroundColor:"#ff6b81", color:"#fff", fontSize:"0.75em", transition:"0.2s" }}>Xóa</button>
                    {deleteConfirmId===c.id && (
                      <div style={{ position:"fixed", top:0, left:0, width:"100vw", height:"100vh", backgroundColor:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:1000 }}>
                        <div style={{ backgroundColor:"#fff", padding:"20px 25px", borderRadius:"10px", boxShadow:"0 4px 12px rgba(0,0,0,0.2)", textAlign:"center", maxWidth:"320px" }}>
                          <p style={{ marginBottom:"15px" }}>Bạn muốn xóa bài này?</p>
                          <div style={{ display:"flex", justifyContent:"center", gap:"10px" }}>
                            <button onClick={()=>{handleDeleteConfession(c.id); setDeleteConfirmId(null)}} style={{ padding:"6px 12px", borderRadius:"6px", border:"none", backgroundColor:"#ff6b81", color:"#fff", cursor:"pointer" }}>Yes</button>
                            <button onClick={()=>setDeleteConfirmId(null)} style={{ padding:"6px 12px", borderRadius:"6px", border:"none", backgroundColor:"#ccc", color:"#333", cursor:"pointer" }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CONTENT */}
            <p style={{ margin:"0 0 10px 0", fontSize:"0.95em", lineHeight:"1.4em" }}>{c.content}</p>
            {c.image_url && <img src={c.image_url} alt="confession" style={{ maxWidth:"400px", borderRadius:"10px", marginBottom:"10px" }} />}
            {c.video_url && <video src={c.video_url} controls style={{ maxWidth:"400px", borderRadius:"10px", marginBottom:"10px" }} />}

            {/* REACTIONS */}
            <div style={{ display:"flex", gap:"6px", marginBottom:"10px" }}>
              {reactionTypes.map(r => (
                <button key={r.type} onClick={()=>toggleReaction(c.id,r.type)} style={{ padding:"4px 8px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"0.85em", backgroundColor: reactionsData[c.id]?.userReaction===r.type?"#ffd700":"#eee", display:"flex", alignItems:"center", gap:"4px" }}>
                  {r.icon} {reactionsData[c.id]?.[r.type] || 0}
                </button>
              ))}
            </div>

            {/* REPLIES */}
            {(c.replies||[]).map(r => {
              const replyName = r.is_anonymous ? "Ẩn danh" : r.profiles?.full_name || "Ẩn danh";
              const replyAvatar = r.is_anonymous
                ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
                : r.profiles?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/default-avatar.jpg";

              return (
                <div key={r.id} style={{ display:"flex", gap:"10px", margin:"8px 0", fontSize:"1em", backgroundColor:"#f9f9f9", padding:"8px 12px", borderRadius:"8px", alignItems:"center", justifyContent:"space-between" }}
                  onMouseEnter={()=>setHoveredReplyId(r.id)}
                  onMouseLeave={()=>setHoveredReplyId(null)}
                >
                  <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", overflow:"hidden", border:"1px solid #ddd" }}>
                      <img src={replyAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    </div>
                    <div style={{ lineHeight:1.4 }}>
                      <b>{replyName}:</b> {r.content}
                      <div style={{ fontSize:"0.8em", color:"#666" }}>{formatTimeAgo(r.created_at)}</div>
                    </div>
                  </div>
                  {r.user_id===user.id && hoveredReplyId===r.id && (
                    <button onClick={()=>{setDeleteReplyId(r.id); setDeleteReplyCfsId(c.id)}} style={{ padding:"4px", borderRadius:"50%", border:"none", cursor:"pointer", backgroundColor:"rgba(255,0,0,0.1)", color:"#ff4d6d", display:"flex", alignItems:"center", justifyContent:"center" }} title="Xóa bình luận">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )
            })}

            {/* INPUT REPLY */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"6px", backgroundColor:"#f1f2f6", padding:"6px 10px", borderRadius:"30px", position:"relative" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", overflow:"hidden", border:"1px solid #ddd" }}>
                <img src={profile?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/default-avatar.jpg"} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <input type="text" placeholder="Trả lời..." value={replyInputs[c.id]||""} onChange={e=>setReplyInputs(prev=>({...prev,[c.id]:e.target.value}))} style={{ flex:1, padding:"8px 12px", borderRadius:"20px", border:"1px solid #ccc", outline:"none", fontSize:"0.95em" }} />
              <div style={{ position:"relative" }}>
                <button type="button" onClick={()=>setShowEmoji(prev=>({...prev,[c.id]:!prev[c.id]}))} style={{ background:"transparent", border:"none", cursor:"pointer", padding:"4px" }}>
                  <Smile size={20} color="#666" />
                </button>
                {showEmoji[c.id] && <div style={{ position:"absolute", bottom:"40px", right:0, zIndex:1000 }}>
                  <EmojiPicker onEmojiClick={emoji=>{setReplyInputs(prev=>({...prev,[c.id]:(prev[c.id]||"")+emoji.emoji})); setShowEmoji(prev=>({...prev,[c.id]:false}));}} autoFocusSearch={false} />
                </div>}
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:"4px", cursor:"pointer", fontSize:"0.85em" }}>
                <input type="checkbox" checked={replyAnonymous[c.id]||false} onChange={()=>setReplyAnonymous(prev=>({...prev,[c.id]:!prev[c.id]}))} style={{ width:"16px", height:"16px", accentColor:"#1e90ff", cursor:"pointer" }} />
                Ẩn danh
              </label>
              <button type="button" onClick={()=>addReply(c.id)} style={{ padding:"6px 14px", borderRadius:"20px", border:"none", backgroundColor:"#1e90ff", color:"#fff", cursor:"pointer", fontSize:"0.95em" }}>
                Rep
              </button>
            </div>

          </div>
        )
      })}
    </div>
  );
}
