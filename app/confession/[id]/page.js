"use client";

import { use, useEffect, useState } from "react"; // thêm use
import { supabase } from "../../../lib/supabaseClient";
import ConfessionItem from "../../home/ConfessionItem";

export default function ConfessionPage({ params }) {
  // unwrap params
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [confession, setConfession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchConfession = async () => {
      const { data, error } = await supabase
        .from("confessions")
        .select("*, profiles(*)")
        .eq("id", id)
        .single();

      if (!error) setConfession(data);
    };

    fetchConfession();
  }, [id]);

  if (!confession) return <div>Loading...</div>;

  const handleRequireLogin = () => setShowLoginPopup(true);

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto", padding: "0 12px" }}>
      <ConfessionItem
        confession={confession}
        user={user}
        profile={profile}
        reactionsData={{}}
        setReactionsData={() => {}}
        formatTimeAgo={(t) => new Date(t).toLocaleString()}
        onRequireLogin={handleRequireLogin} // ⚡ chỉ hiện popup khi cần login
      />

      {showLoginPopup && (
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
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "28px",
              borderRadius: "14px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <p style={{ marginBottom: "18px", fontSize: "1.1em" }}>
              Bạn phải đăng nhập để thực hiện hành động này!
            </p>
            <button
              onClick={() => setShowLoginPopup(false)}
              style={{
                background: "#4caf50",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
