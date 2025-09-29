"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function UserPosts({ userId, user, openProfileModal }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedPostId, setCopiedPostId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [popupMedia, setPopupMedia] = useState(null); // { type, src }

  useEffect(() => {
    if (!userId) return;

    const fetchPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
  .from("confessions")
  .select(`
    *,
    profiles!inner(id, full_name, nickname, avatar_url)
  `)
  .eq("user_id", userId)
  .eq("is_anonymous", false)
  .order("created_at", { ascending: false });


      if (!error) setPosts(data);
      setLoading(false);
    };

    fetchPosts();
  }, [userId]);

  const handleCopyLink = (postId) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 1500);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  const formatPostMedia = (post) => {
    let images = [];
    if (post.image_url) {
      if (post.image_url.startsWith("[") && post.image_url.endsWith("]")) {
        try { images = JSON.parse(post.image_url); } catch { images = []; }
      } else {
        images = post.image_url.split(",").map(u => u.trim()).filter(Boolean);
      }
    }

    let videos = [];
    if (post.video_url) {
      if (post.video_url.startsWith("[") && post.video_url.endsWith("]")) {
        try { videos = JSON.parse(post.video_url); } catch { videos = []; }
      } else {
        videos = post.video_url.split(",").map(u => u.trim()).filter(Boolean);
      }
    }

    let files = post.file_url || [];
    return { images, videos, files };
  };

  const openMedia = (type, src) => {
    setPopupMedia({ type, src });
  };

  const closeMedia = () => setPopupMedia(null);

  if (loading) return <p>Đang tải bài viết...</p>;

  return (
    <div style={{ marginTop: "30px" }}>

      {posts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {posts.map((post) => {
            const { images, videos, files } = formatPostMedia(post);
            const copied = copiedPostId === post.id;

            return (
              <div
                key={post.id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}
              >
                {/* HEADER */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                      <img
                        src={post.is_anonymous
                          ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
                          : post.profiles?.avatar_url
                        }
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <b
                        style={{ cursor: post.is_anonymous ? "default" : "pointer", color: "#000" }}
                        onClick={() => !post.is_anonymous && openProfileModal(post.user_id)}
                        onMouseEnter={(e) => { if (!post.is_anonymous) e.target.style.textDecoration = "underline"; }}
                        onMouseLeave={(e) => { if (!post.is_anonymous) e.target.style.textDecoration = "none"; }}
                      >
                        {post.is_anonymous ? "Ẩn danh" : post.profiles?.full_name}
                      </b>
                      {!post.is_anonymous && (
                        <span style={{ fontSize: "0.8em", color: "#777" }}>
                          @{post.profiles?.nickname || "chưa có nickname"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ fontSize: "0.75em", color: "#888" }}>{formatTimeAgo(post.created_at)}</div>
                    {user && post.user_id === user.id && (
                      <button
                        onClick={() => setDeleteConfirm({ type: "confession", id: post.id })}
                        style={{ padding: "5px 10px", borderRadius: "8px", background: "#ff6b81", color: "#fff", fontSize: "0.8em", cursor: "pointer" }}
                      >Xóa</button>
                    )}
                    <button
                      onClick={() => handleCopyLink(post.id)}
                      style={{ padding: "5px 10px", borderRadius: "8px", background: copied ? "#4caf50" : "#3498db", color: "#fff", fontSize: "0.8em", cursor: "pointer" }}
                    >{copied ? "Copied!" : "Copy link"}</button>
                    <button
                      onClick={() => setShowReport(true)}
                      style={{ padding: "5px 10px", borderRadius: "8px", background: "#ffa500", color: "#fff", fontSize: "0.8em", cursor: "pointer" }}
                    >Report</button>
                  </div>
                </div>

                {/* CONTENT */}
                <div style={{ margin: "0 0 12px 0", lineHeight: "1.5em", fontSize: "0.95em", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                     dangerouslySetInnerHTML={{ __html: post.content }}>
                </div>

                {/* IMAGE + VIDEO */}
                {(images.length > 0 || videos.length > 0) && (
                  <div style={{
                    display: "grid",
                    justifyContent: (images.length + videos.length === 1) ? "center" : "stretch",
                    gridTemplateColumns: (images.length + videos.length === 1) ? "auto" : "repeat(2, 1fr)",
                    gap: "8px",
                    marginBottom: "12px"
                  }}>
                    {[...images.map(src => ({ type: "image", src })), ...videos.map(src => ({ type: "video", src }))].map((media, idx) => (
                      <div key={`${media.type}-${idx}`} onClick={() => openMedia(media.type, media.src)} style={{
                        position: "relative",
                        borderRadius: "8px",
                        overflow: "hidden",
                        cursor: "zoom-in",
                        background: media.type === "video" ? "#000" : "transparent",
                        width: (images.length + videos.length === 1) ? "300px" : "100%",
                        height: (images.length + videos.length === 1) ? "300px" : "auto",
                        aspectRatio: (images.length + videos.length === 1) ? "1 / 1" : "1"
                      }}>
                        {media.type === "image" ? (
                          <img src={media.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <>
                            <video src={media.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                            <div style={{
                              position: "absolute", top: "50%", left: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "50px", height: "50px", fontSize: "24px",
                              color: "#fff", background: "rgba(0,0,0,0.4)",
                              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                              pointerEvents: "none"
                            }}>▶</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}


                {/* FILES */}
                {files.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {files.map((file, idx) => {
                      const fileName = file.split("/").pop();
                      return (
                        <a key={idx} href={file} download={fileName} style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          padding: "8px 12px", background: "#f5f5f5", borderRadius: "8px",
                          color: "#333", textDecoration: "none", border: "1px solid #ddd"
                        }}>
                          <span style={{ fontSize: "18px" }}>📄</span>
                          <span>{fileName}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p>Người này chưa có bài viết công khai nào.</p>
      )}

      {/* POPUP MEDIA */}
      {popupMedia && (
        <div onClick={closeMedia} style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 9999, cursor: "zoom-out"
        }}>
          {popupMedia.type === "image" ? (
            <img src={popupMedia.src} alt="" style={{ maxHeight: "90%", maxWidth: "90%", borderRadius: "8px" }} />
          ) : (
            <video src={popupMedia.src} controls autoPlay style={{ maxHeight: "90%", maxWidth: "90%", borderRadius: "8px" }} />
          )}
        </div>
      )}
    </div>
  );
}
