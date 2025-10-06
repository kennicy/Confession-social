import { supabase } from "../../lib/supabaseClient";
import { useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export default function ChatWindow({ user, allUsers, selectedUser, messages: initialMessages, setUnreadCounts, messagesEndRef }) {
  // Tạo state messages tại đây
  const [messages, setMessages] = useState(initialMessages || []);

  // Cập nhật messages khi initialMessages thay đổi từ ngoài
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!selectedUser) return;

    const markAsRead = async () => {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("user_id", selectedUser.id)
        .eq("is_read", false);

      setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }));
    };
    markAsRead();

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedUser?.id, user.id, setUnreadCounts, messagesEndRef]);

  if (!selectedUser)
    return <div className="flex-1 flex items-center justify-center text-gray-400">Select a user to start chat</div>;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <ChatHeader selectedUser={selectedUser} />
      <MessageList
        user={user}
        allUsers={allUsers}
        selectedUser={selectedUser}
        messages={messages}
        setMessages={setMessages} // truyền xuống MessageList
        messagesEndRef={messagesEndRef}
      />
      <ChatInput
        user={user}
        selectedUser={selectedUser}
        messages={messages}
        setMessages={setMessages} // nếu ChatInput gửi tin nhắn, cũng cập nhật messages realtime
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
}
