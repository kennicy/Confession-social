"use client";

import { motion } from "framer-motion";
import FeedComponent from "./FeedComponent";
import ProFileComponent from "./ProFileComponent";
import MessagesComponent from "./MessagesComponent";
import GameComponent from "./GameComponent";
import NotificationComponent from "./NotificationComponent";
import BankComponent from "./BankComponent";
import SettingsComponent from "./SettingsComponent";
import ManagerComponent from "./ManagerComponent";
import QuizComponent from "./QuizComponent";
import ProfileViewer from "./ProfileViewer";

export default function MainContent({
  tab,
  user,
  profile,
  setProfile,
  selectedUserId,
}) {
  return (
    <motion.main
      style={{
        flex: 1,
        padding: "24px",
        marginLeft: "150px",
        marginRight: "200px",
        minHeight: "100vh",
        backgroundColor: "#111", // nền tối cố định
        color: "#f1f1f1", // chữ sáng cố định
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          background: "#1a1a1a",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        {/* Nếu chọn user từ RightSidebar => hiển thị ProfileViewer */}
        {selectedUserId ? (
          <ProfileViewer userId={selectedUserId} />
        ) : tab === "feed" ? (
          <FeedComponent user={user} profile={profile} />
        ) : tab === "profile" ? (
          <ProFileComponent
            user={user}
            profile={profile}
            setProfile={setProfile}
          />
        ) : tab === "messages" ? (
          <MessagesComponent user={user} />
        ) : tab === "notifications" ? (
          <NotificationComponent user={user} />
        ) : tab === "drive" ? (
          <div style={{ padding: "20px", textAlign: "center" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>
              Drive (upload/lưu file)
            </h2>
            <p>Chức năng upload & lưu file sẽ được tích hợp tại đây.</p>
          </div>
        ) : tab === "game" ? (
          <GameComponent user={user} />
        ) : tab === "manager" ? (
          <ManagerComponent user={user} />
        ) : tab === "quiz" ? (
          <QuizComponent user={user} />
        ) : tab === "settings" ? (
          <SettingsComponent user={user} />
        ) : tab === "bank" ? (
          <BankComponent currentUser={user} />
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <h2>Chọn một mục từ menu bên trái</h2>
          </div>
        )}
      </div>
    </motion.main>
  );
}
