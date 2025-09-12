"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Home, User, MessageCircle, Calendar, Bell, Settings, LogOut } from "lucide-react";
import FeedComponent from "./FeedComponent";
import ProFileComponent from "./ProFileComponent";
import MeetingVoteComponent from "./MeetingVoteComponent";
import MessagesComponent from "./MessagesComponent";

export default function FeedPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("feed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    init();
  }, []);

  if (loading) return <p>Đang tải...</p>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>

      {/* Sidebar */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: "250px",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "2px 0 12px rgba(0,0,0,0.1)",
        padding: "20px"
      }}>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px 0" }}>
          <img 
            src="https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/LOGO/jpg.jpg"
            alt="NOVA LABS Logo"
            style={{ width: "100px", height: "100px", borderRadius: "50%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
          />
        </div>

        {/* Menu buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "30px" }}>
          {[
            { key: "feed", label: "Feed", icon: <Home size={18} /> },
            { key: "profile", label: "Profile", icon: <User size={18} /> },
            { key: "messages", label: "Messages", icon: <MessageCircle size={18} /> },
            { key: "timemeet", label: "Timemeet Vote", icon: <Calendar size={18} /> },
            { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
            { key: "settings", label: "Settings", icon: <Settings size={18} /> },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontWeight: tab === item.key ? "bold" : "500",
                backgroundColor: tab === item.key ? "#1e90ff" : "#f7f8fa",
                color: tab === item.key ? "#fff" : "#333",
                boxShadow: tab === item.key ? "0 4px 12px rgba(30,144,255,0.4)" : "none",
                transition: "all 0.25s",
              }}
              onMouseEnter={e => e.target.style.backgroundColor = tab === item.key ? "#1c86ee" : "#e6f0ff"}
              onMouseLeave={e => e.target.style.backgroundColor = tab === item.key ? "#1e90ff" : "#f7f8fa"}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* Logout */}
        <div style={{ marginTop: "auto" }}>
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = "/login")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              backgroundColor: "#ff6b81",
              color: "#fff",
              fontWeight: "bold",
              boxShadow: "0 4px 12px rgba(255,107,129,0.3)",
              transition: "0.25s"
            }}
            onMouseEnter={e => e.target.style.backgroundColor = "#ff4757"}
            onMouseLeave={e => e.target.style.backgroundColor = "#ff6b81"}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "20px", marginLeft: "250px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {tab === "feed" && <FeedComponent user={user} profile={profile} />}
          {tab === "profile" && <ProFileComponent user={user} profile={profile} setProfile={setProfile} />}
          {tab === "messages" && <MessagesComponent user={user} />}
          {tab === "timemeet" && <MeetingVoteComponent user={user} />}
          {tab === "notifications" && <div>Notifications Component</div>}
          {tab === "settings" && <div>Settings Component</div>}
        </div>
      </div>

    </div>
  );
}
