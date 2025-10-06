"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function GroupWindow({ user, selectedGroup, messages, setUnreadCounts }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const groupMessages = messages.filter((m) => m.group_id === selectedGroup?.id);

  const sendMessage = async () => {
    if (!input || !selectedGroup) return;

    await supabase.from("group_messages").insert([
      { group_id: selectedGroup.id, user_id: user.id, content: input },
    ]);
    setInput("");
  };

  useEffect(() => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });

    if (selectedGroup) {
      supabase
        .from("group_messages")
        .update({ is_read: true })
        .eq("group_id", selectedGroup.id)
        .neq("user_id", user.id);

      setUnreadCounts((prev) => ({ ...prev, [selectedGroup.id]: 0 }));
    }
  }, [selectedGroup, messages]);

  if (!selectedGroup)
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Chọn nhóm để chat
      </div>
    );

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        {groupMessages.map((m) => (
          <div
            key={m.id}
            className={`mb-2 p-2 rounded ${
              m.user_id === user.id ? "bg-blue-600 text-white self-end" : "bg-gray-700"
            }`}
          >
            <strong>{m.user_id === user.id ? "Bạn" : m.user_id}</strong>
            <p>{m.content}</p>
            <small className="text-xs text-gray-400">
              {new Date(m.created_at).toLocaleTimeString()}
            </small>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 flex gap-2 border-t border-gray-700">
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded bg-gray-800 border border-gray-700"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="px-4 py-2 bg-blue-600 rounded text-white" onClick={sendMessage}>
          Gửi
        </button>
      </div>
    </div>
  );
}
