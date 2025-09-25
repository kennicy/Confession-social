"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import ReplyList from "./ReplyList";
import ReportModal from "./ReportModal";
import ProfilePopup from "./ProfilePopup";

const reactionTypes = [
  { type: "like", icon: "👍" },
  { type: "love", icon: "❤️" },
  { type: "haha", icon: "😂" },
  { type: "wow", icon: "😮" },
  { type: "sad", icon: "😢" },
  { type: "angry", icon: "😡" },
];

const parseArray = (data) => {
  try {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return JSON.parse(data);
  } catch {
    return [data];
  }
};

export default function ConfessionItem({
  confession,
  user,
  profile,
  reactionsData,
  setReactionsData,
  formatTimeAgo,
}) {
  const [hoveredReplyId, setHoveredReplyId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [mediaModal, setMediaModal] = useState(null); // { type, src }
  const replyRefs = useRef({});

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const openMedia = (type, src) => setMediaModal({ type, src });
  const closeMedia = () => setMediaModal(null);

  // Realtime: listen changes
  useEffect(() => {
    const channel = supabase
      .channel("confession-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confessions" },
        (payload) => {
          console.log("Confession changed:", payload);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "replies" },
        (payload) => {
          console.log("Reply changed:", payload);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        (payload) => {
          console.log("Reaction changed:", payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleReaction = async (key, type) => {
    const prevData = reactionsData[key] || { userReaction: null, users: {} };
    const userHasReacted = prevData.userReaction === type;
    const newData = { ...reactionsData };
    const current = { ...prevData, users: { ...prevData.users } };

    if (userHasReacted) {
      current.userReaction = null;
      current.users[type] = (current.users[type] || []).filter(
        (n) => n !== profile.full_name
      );
    } else {
      if (prevData.userReaction) {
        const oldType = prevData.userReaction;
        current.users[oldType] = (current.users[oldType] || []).filter(
          (n) => n !== profile.full_name
        );
      }
      current.userReaction = type;
      if (!current.users[type]) current.users[type] = [];
      current.users[type].push(profile.full_name);
    }
    newData[key] = current;
    setReactionsData(newData);

    try {
      const isReply = key.startsWith("reply_");
      const id = isReply ? key.replace("reply_", "") : key;

      if (userHasReacted) {
        await supabase
          .from("reactions")
          .delete()
          .eq("user_id", user.id)
          .eq(isReply ? "reply_id" : "confession_id", id)
          .eq("type", type);
      } else {
        if (prevData.userReaction) {
          await supabase
            .from("reactions")
            .delete()
            .eq("user_id", user.id)
            .eq(isReply ? "reply_id" : "confession_id", id)
            .eq("type", prevData.userReaction);
        }
        await supabase.from("reactions").insert({
          user_id: user.id,
          type,
          confession_id: isReply ? null : id,
          reply_id: isReply ? id : null,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async ({ type, id }) => {
    try {
      if (type === "confession")
        await supabase.from("confessions").delete().eq("id", id);
      if (type === "reply")
        await supabase.from("replies").delete().eq("id", id);
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirm(null);
  };

  const renderReactions = (key) => {
    const reaction = reactionsData[key];
    if (!reaction) return null;
    return (
      <div
        style={{
          marginTop: "6px",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {reactionTypes.map((r) => {
          const users = reaction.users?.[r.type] || [];
          if (users.length === 0) return null;
          const displayNames = [...new Set(users)].join(", ");
          return (
            <div
              key={r.type}
              style={{
                display: "flex",
                gap: "4px",
                alignItems: "center",
                fontSize: "0.85em",
                background: "#f1f2f6",
                padding: "2px 6px",
                borderRadius: "12px",
              }}
            >
              <span>{r.icon}</span>
              <span>{displayNames}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const openProfileModal = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error) {
      setProfileData(data);
      setShowProfileModal(true);
    }
  };

  const images = parseArray(confession.image_url);
  const videos = parseArray(confession.video_url);

  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "18px",
        background: "#fff",
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={
                confession.is_anonymous
                  ? "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"
                  : confession.profiles?.avatar_url
              }
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <b
            style={{
              cursor: confession.is_anonymous ? "default" : "pointer",
              color: "#fff",
              textDecoration: "none",
            }}
            onClick={() =>
              !confession.is_anonymous &&
              openProfileModal(confession.user_id)
            }
            onMouseEnter={(e) => {
              if (!confession.is_anonymous) e.target.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              if (!confession.is_anonymous) e.target.style.textDecoration = "none";
            }}
          >
            {confession.is_anonymous
              ? "Ẩn danh"
              : confession.profiles?.full_name}
          </b>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "0.75em", color: "#888" }}>
            {formatTimeAgo(confession.created_at)}
          </div>

          {user && confession.user_id === user.id && (
            <button
              onClick={() =>
                setDeleteConfirm({ type: "confession", id: confession.id })
              }
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                background: "#ff6b81",
                color: "#fff",
                fontSize: "0.8em",
                cursor: "pointer",
              }}
            >
              Xóa
            </button>
          )}

          <button
            onClick={() => setShowReport(true)}
            style={{
              padding: "5px 10px",
              borderRadius: "8px",
              background: "#ffa500",
              color: "#fff",
              fontSize: "0.8em",
              cursor: "pointer",
            }}
          >
            Report
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div
        style={{
          margin: "0 0 12px 0",
          lineHeight: "1.5em",
          fontSize: "0.95em",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: confession.content }}
      ></div>

      {/* IMAGE + VIDEO */}
      {(images.length > 0 || videos.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              images.length + videos.length === 1
                ? "1fr"
                : "repeat(2, 1fr)",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          {[...images.map((img) => ({ type: "image", src: img })), 
            ...videos.map((vid) => ({ type: "video", src: vid }))].map(
            (media, idx) => (
              <div
                key={`${media.type}-${idx}`}
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  overflow: "hidden",
                  borderRadius: "8px",
                  border: "2px solid #ccc",
                  cursor: "zoom-in",
                  maxWidth:
                    images.length + videos.length === 1 ? "300px" : "100%",
                  margin: images.length + videos.length === 1 ? "0 auto" : "0",
                  background: media.type === "video" ? "#000" : "transparent",
                }}
                onClick={() => openMedia(media.type, media.src)}
              >
                {media.type === "image" ? (
                  <img
                    src={media.src}
                    alt={`media-${idx}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <>
                    <video
                      src={media.src}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      muted
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "50px",
                        height: "50px",
                        fontSize: "24px",
                        color: "#fff",
                        background: "rgba(0,0,0,0.4)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      ▶
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* FILES */}
      {confession.file_url && (
        <div
          style={{
            marginBottom: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {(Array.isArray(confession.file_url)
            ? confession.file_url
            : [confession.file_url]
          ).map((file, idx) => {
            const fileName = file.split("/").pop();
            return (
              <a
                key={`file-${idx}`}
                href={file}
                download={fileName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  background: "#f5f5f5",
                  borderRadius: "8px",
                  color: "#333",
                  textDecoration: "none",
                  border: "1px solid #ddd",
                }}
              >
                <span style={{ fontSize: "18px" }}>📄</span>
                <span>{fileName}</span>
              </a>
            );
          })}
        </div>
      )}

      {/* REACTIONS */}
      <div style={{ marginBottom: "15px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
          {reactionTypes.map((r) => (
            <button
              key={r.type}
              onClick={() => toggleReaction(confession.id, r.type)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                background:
                  reactionsData[confession.id]?.userReaction === r.type
                    ? "#ffd700"
                    : "#eee",
                cursor: "pointer",
                fontSize: "0.95em",
                transition: "background 0.2s",
              }}
            >
              {r.icon}
            </button>
          ))}
        </div>
        {renderReactions(confession.id)}
      </div>

      {/* REPLIES */}
      <ReplyList
        confession={confession}
        user={user}
        profile={profile}
        formatTimeAgo={formatTimeAgo}
        reactionsData={reactionsData}
        setReactionsData={setReactionsData}
      />

      {/* DELETE MODAL */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "28px",
              borderRadius: "14px",
              textAlign: "center",
            }}
          >
            <p style={{ marginBottom: "18px" }}>
              Bạn có chắc muốn xóa{" "}
              {deleteConfirm.type === "confession" ? "bài đăng" : "bình luận"}{" "}
              này?
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "18px" }}
            >
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  background: "#ff6b81",
                  color: "#fff",
                  padding: "6px 14px",
                  borderRadius: "10px",
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  background: "#ccc",
                  color: "#333",
                  padding: "6px 14px",
                  borderRadius: "10px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReport && (
        <ReportModal
          confessionId={confession.id}
          user={user}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* MEDIA MODAL */}
      {mediaModal && (
        <div
          onClick={closeMedia}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          {mediaModal.type === "image" && (
            <img
              src={mediaModal.src}
              style={{
                maxWidth: "90%",
                maxHeight: "90%",
                borderRadius: "12px",
              }}
            />
          )}
          {mediaModal.type === "video" && (
            <video
              src={mediaModal.src}
              controls
              autoPlay
              style={{
                maxWidth: "90%",
                maxHeight: "90%",
                borderRadius: "12px",
              }}
            />
          )}
        </div>
      )}

      {/* Modal profile */}
      {showProfileModal && profileData && (
        <ProfilePopup
          userData={profileData}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}
