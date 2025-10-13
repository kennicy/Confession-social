"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function GroupList({
  selectedGroup,
  setSelectedGroup,
  unreadCounts,
  messages,
  user,
}) {
  const [allGroups, setAllGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState(""); // URL avatar sau khi upload
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [alert, setAlert] = useState(""); 
  const [uploading, setUploading] = useState(false);

  // --- Fetch group list ---
  const fetchGroups = async () => {
    const { data } = await supabase.from("groups").select("*").order("created_at", { ascending: true });
    setAllGroups(data || []);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // --- Fetch all users for creating group ---
  useEffect(() => {
    if (!showCreate) return;
    const fetchUsers = async () => {
      const { data } = await supabase.from("profiles").select("*").neq("id", user.id);
      setAllUsers(data || []);
    };
    fetchUsers();
  }, [showCreate, user.id]);

  // --- Upload avatar lên Storage ---
  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `group_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    setUploading(true);

    const { data, error } = await supabase.storage
      .from("group-avatars")
      .upload(filePath, file, { upsert: true });

    setUploading(false);

    if (error) {
      console.error("Upload error:", error);
      setAlert("Upload avatar thất bại!");
      return;
    }

    // Lấy public URL
    const { publicUrl } = supabase.storage.from("group-avatars").getPublicUrl(filePath);
    setNewGroupAvatar(publicUrl);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName || selectedUsers.length === 0) {
      setAlert("Vui lòng nhập tên nhóm và chọn ít nhất 1 thành viên!");
      return;
    }

    // 1. Tạo group với avatar
    const { data: group, error } = await supabase
      .from("groups")
      .insert([{ name: newGroupName, created_by: user.id, avatar_url: newGroupAvatar || null }])
      .select()
      .single();

    if (error) {
      console.error(error);
      setAlert("Tạo nhóm thất bại!");
      return;
    }

    // 2. Thêm thành viên vào group_members
    await supabase.from("group_members").insert(
      selectedUsers.map((u) => ({ group_id: group.id, user_id: u.id }))
    );

    setSelectedGroup(group);
    setShowCreate(false);
    setNewGroupName("");
    setNewGroupAvatar("");
    setSelectedUsers([]);
    setAlert("");

    fetchGroups();
  };

  return (
    <div className="flex flex-col w-72 border-r border-gray-700">
      <div className="flex justify-between items-center p-2 border-b border-gray-700">
        <span className="font-bold">Nhóm</span>
        <button
          className="px-2 py-1 bg-blue-600 rounded text-white"
          onClick={() => setShowCreate(true)}
        >
          + Tạo nhóm
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allGroups.map((g) => (
          <div
            key={g.id}
            onClick={() => setSelectedGroup(g)}
            className={`p-2 cursor-pointer hover:bg-gray-800 flex items-center gap-2 ${
              selectedGroup?.id === g.id ? "bg-gray-700" : ""
            }`}
          >
            {g.avatar_url ? (
              <img
                src={g.avatar_url}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                {g.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="flex-1">{g.name}</span>
            {unreadCounts[g.id] > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 rounded-full">
                {unreadCounts[g.id]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Popup tạo nhóm */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-gray-900 p-4 rounded w-96">
            <h2 className="text-lg font-bold mb-2">Tạo nhóm mới</h2>

            {alert && (
              <div className="bg-red-600 text-white p-2 rounded mb-2 text-sm">{alert}</div>
            )}

            <input
              placeholder="Tên nhóm"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full p-2 mb-2 rounded bg-gray-800 border border-gray-700"
            />

            {/* Upload avatar */}
            <div className="mb-2 flex items-center gap-2">
              <label className="w-16 h-16 rounded-full overflow-hidden cursor-pointer border border-gray-700 flex items-center justify-center bg-gray-800">
                {newGroupAvatar ? (
                  <img src={newGroupAvatar} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-3xl">+</span>
                )}
                <input type="file" className="hidden" onChange={handleUploadAvatar} />
              </label>
              {uploading && <span>Đang upload...</span>}
            </div>

            <div className="max-h-60 overflow-y-auto mb-2">
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedUsers([...selectedUsers, u]);
                      else setSelectedUsers(selectedUsers.filter((x) => x.id !== u.id));
                    }}
                  />
                  <span>{u.full_name}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-gray-700 rounded"
                onClick={() => setShowCreate(false)}
              >
                Hủy
              </button>
              <button
                className="px-3 py-1 bg-blue-600 rounded text-white"
                onClick={handleCreateGroup}
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
