import { motion } from "framer-motion";
import dayjs from "dayjs";

export default function UserList({ allUsers, selectedUser, setSelectedUser, unreadCounts, messages, user }) {
  return (
    <div className="w-72 border-r border-gray-700 p-3 bg-gray-900 overflow-y-auto">
      <h4 className="mb-3 font-bold text-gray-200 text-lg">Chats</h4>
      {allUsers.map((u) => {
        const unread = unreadCounts[u.id] || 0;
        const lastMsg = messages
          .filter(m => m.user_id === u.id || m.recipient_id === u.id)
          .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];

        const isUnread = lastMsg && lastMsg.recipient_id === user.id && !lastMsg.is_read;

        return (
          <motion.div
            key={u.id}
            onClick={() => setSelectedUser(u)}
            className={`flex items-center justify-between p-3 mb-2 cursor-pointer rounded-xl transition-all shadow-sm ${
              selectedUser?.id === u.id ? "bg-blue-700 shadow-lg" : "hover:bg-gray-800"
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3 relative">
              <div className="relative w-12 h-12 flex-shrink-0">
                <img
                  src={u.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-700"
                />
                {u.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 bg-green-400" />
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <p className="m-0 font-semibold text-gray-200 text-sm truncate">{u.full_name}</p>
                {lastMsg && (
                  <>
                    <small
                      className={`text-xs truncate ${isUnread ? "font-bold text-white" : "text-gray-400"}`}
                    >
                      {lastMsg.content ? lastMsg.content : (lastMsg.type === "image" ? "[Image]" : "[File]")}
                    </small>
                    <small className="text-gray-500 text-[10px] mt-0.5">
                      {dayjs(lastMsg.created_at).fromNow()}
                    </small>
                  </>
                )}
              </div>
            </div>

            {/* Unread badge */}
            <div className="flex flex-col items-end gap-1">
              {unread > 0 && (
                <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {unread}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
