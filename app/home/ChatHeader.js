import { Phone, Video, MoreVertical } from "lucide-react";

export default function ChatHeader({ selectedUser, selectedGroup, unreadCount = 0 }) {
  const displayName = selectedGroup ? selectedGroup.name : selectedUser?.full_name;
  const isOnline = selectedUser?.is_online || false;
  const avatarUrl =
    selectedUser?.avatar_url ||
    "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg";

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        {!selectedGroup && (
          <img src={avatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-blue-500" />
        )}
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-gray-800 text-lg">{displayName}</span>
          {!selectedGroup && (
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`}></span>
              <span className="text-sm text-gray-500">{isOnline ? "Online" : "Offline"}</span>
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
