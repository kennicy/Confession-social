"use client";

import { useState } from "react";
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

export default function MainContent({ tab, user, profile, setProfile }) {
  return (
    <motion.div
      style={{
        flex: 1,
        padding: "20px",
        marginLeft: "150px",
        marginRight: "200px",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.5 } }}
    >
      <div style={{ maxWidth: "950px", margin: "0 auto" }}>
        {tab === "feed" && <FeedComponent user={user} profile={profile} />}
        {tab === "profile" && (
          <ProFileComponent user={user} profile={profile} setProfile={setProfile} />
        )}
        {tab === "messages" && <MessagesComponent user={user} />}
        {tab === "notifications" && <NotificationComponent user={user} />}
        {tab === "drive" && <div>Drive (upload/lưu file)</div>}
        {tab === "game" && <GameComponent user={user} />}
        {tab === "manager" && <ManagerComponent user={user} />}
        {tab === "quiz" && <QuizComponent user={user} />}
        {tab === "settings" && <SettingsComponent user={user} />}
        {tab === "bank" && <BankComponent currentUser={user} />}
      </div>
    </motion.div>
  );
}
