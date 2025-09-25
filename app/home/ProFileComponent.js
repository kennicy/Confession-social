"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ProfileComponent({ user, profile, setProfile }) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [faculty, setFaculty] = useState(profile?.faculty || "");
  const [major, setMajor] = useState(profile?.major || "");
  const [year, setYear] = useState(profile?.year || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [position, setPosition] = useState(profile?.position || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [warningPopup, setWarningPopup] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);

  const facultyMap = {
    "Cơ khí": ["Cơ - Điện tử", "Kỹ thuật Nhiệt", "Logistics & Quản lý chuỗi cung ứng", "Kỹ thuật Hệ thống Công nghiệp", "Kỹ thuật Dệt", "Kỹ thuật Cơ khí", "Công nghệ Dệt May", "Bảo dưỡng Công nghiệp"],
    "Điện – Điện tử": ["Thiết kế Vi mạch", "Kỹ thuật Điện tử - Viễn thông", "Kỹ thuật Điều khiển - Tự động hóa", "Kỹ thuật Điện"],
    "Kỹ thuật Xây dựng": ["Kinh tế Xây dựng", "Kỹ thuật Xây dựng Công trình Giao thông", "Kỹ thuật Trắc địa – Bản đồ", "Kỹ thuật Xây dựng", "Kỹ thuật Xây dựng Công trình Thủy", "Kỹ thuật Xây dựng Công trình Biển", "Kỹ thuật Cơ sở Hạ tầng", "Kiến Trúc", "Công nghệ Kỹ thuật Vật liệu Xây dựng"],
    "Công nghệ Vật liệu": ["Kỹ thuật Vật liệu"],
    "Khoa học và Kỹ thuật Máy tính": ["Kỹ thuật Máy tính", "Khoa học Máy tính"],
    "Kỹ thuật Hóa học": ["Kỹ thuật Hoá học", "Công nghệ Thực phẩm", "Công nghệ Sinh học"],
    "Khoa học Ứng dụng": ["Khoa học Dữ liệu", "Vật lý Kỹ thuật", "Cơ Kỹ thuật"],
    "Kỹ thuật Giao thông": ["Kỹ thuật Tàu thuỷ", "Kỹ thuật Ô tô", "Kỹ thuật Hàng không"],
    "Quản lý Công nghiệp": ["Quản lý Công nghiệp"],
    "Kỹ thuật Địa chất và Dầu khí": ["Địa Kỹ thuật Xây dựng", "Kỹ thuật Dầu khí", "Kỹ thuật Địa chất"],
    "Môi trường và Tài nguyên": ["Quản lý Tài nguyên và Môi trường", "Kỹ thuật Môi trường"],
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAvatarClick = () => {
    const url = previewUrl || profile?.avatar_url;
    if (!url) return;
    setModalImageUrl(url);
    setIsAvatarModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!user) return alert("Bạn chưa đăng nhập!");

    if (!fullName || !faculty || !major) {
      setWarningPopup(true);
      setTimeout(() => setWarningPopup(false), 2000);
      return;
    }

    setUpdating(true);

    let avatar_url = profile?.avatar_url || null;

    if (avatarFile) {
      try {
        const folderPath = `${user.id}`;
        const ext = avatarFile.name.split(".").pop();
        const fileName = `avatar_${Date.now()}.${ext}`;
        const filePath = `${folderPath}/${fileName}`;

        const { data: listFiles } = await supabase.storage.from("avatars").list(folderPath);
        if (listFiles && listFiles.length > 0) {
          const oldFiles = listFiles.map((f) => `${folderPath}/${f.name}`);
          await supabase.storage.from("avatars").remove(oldFiles);
        }

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { cacheControl: "0", upsert: false });
        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage.from("avatars").getPublicUrl(filePath);
        avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
      } catch (err) {
        setUpdating(false);
        return alert("Upload avatar thất bại: " + err.message);
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        nickname,
        faculty,
        major,
        year,
        gender,
        position,
        bio,
        avatar_url,
      })
      .select()
      .single();

    setUpdating(false);
    if (error) return alert("Cập nhật profile thất bại: " + error.message);

    setProfile(data);
    setPreviewUrl(null);
    setSuccessPopup(true);
    setTimeout(() => setSuccessPopup(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f4f6f8", display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "650px", backgroundColor: "#fff", borderRadius: "20px", boxShadow: "0 12px 24px rgba(0,0,0,0.15)", padding: "40px 30px", display: "flex", flexDirection: "column", gap: "30px" }}>
        <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: "700", color: "#222" }}>Thông tin cá nhân</h2>

        {/* Avatar + Button layout ngang */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            onClick={handleAvatarClick}
            style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", border: "4px solid #007bff", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
          >
            <img src={previewUrl || profile?.avatar_url || "https://desgyiezxeurkcadhrlg.supabase.co/storage/v1/object/public/avatars/unknown-avatar/che-do-tab-an-danh-la-gi-cach-bat-tat-tren-trinh-duyet-th.jpg"} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <label htmlFor="avatar-upload" style={{ cursor: "pointer", padding: "10px 18px", backgroundColor: "#007bff", color: "#fff", fontWeight: "600", borderRadius: "10px" }}>
            ✎ Chọn ảnh mới
          </label>
          <input id="avatar-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        </div>

        {/* Form Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#555" }}>Họ và tên</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nhập họ và tên" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#555" }}>Biệt danh</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nhập biệt danh" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#555" }}>Khóa</label>
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Nhập khóa" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#555" }}>Khoa</label>
            <select value={faculty} onChange={(e) => { setFaculty(e.target.value); setMajor(""); }} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }}>
              <option value="" disabled>Chọn khoa</option>
              {Object.keys(facultyMap).map((f, idx) => <option key={idx} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#555" }}>Chuyên ngành</label>
            <select value={major} onChange={(e) => setMajor(e.target.value)} disabled={!faculty} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }}>
              <option value="" disabled>{faculty ? "Chọn chuyên ngành" : "Chọn khoa trước"}</option>
              {faculty && facultyMap[faculty]?.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#555" }}>Giới tính</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }}>
              <option value="" disabled>Chọn giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#555" }}>Position</label>
            <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Nhập chức vụ / vị trí" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }} />
          </div>
        </div>

        {/* Bio textarea */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontWeight: "500", marginBottom: "6px", color: "#555" }}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Viết một đoạn giới thiệu ngắn về bạn..." style={{ padding: "12px", borderRadius: "12px", border: "1px solid #ccc", outline: "none", fontSize: "14px", minHeight: "80px", resize: "vertical" }} />
        </div>

        {/* Update Button */}
        <button onClick={handleUpdate} style={{ width: "100%", padding: "14px", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", fontSize: "16px", cursor: "pointer" }}>
          {updating ? "Đang cập nhật..." : "Cập nhật thông tin"}
        </button>

        {/* Success Popup */}
        {successPopup && (
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#28a745", color: "#fff", padding: "20px 35px", borderRadius: "12px", fontWeight: "600", fontSize: "16px", zIndex: 9999, textAlign: "center" }}>
            Cập nhật profile thành công!
          </div>
        )}

        {/* Warning Popup */}
        {warningPopup && (
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#ffc107", color: "#222", padding: "20px 35px", borderRadius: "12px", fontWeight: "600", fontSize: "16px", zIndex: 9999, textAlign: "center" }}
            onClick={() => setWarningPopup(false)}
          >
            😅 Hãy điền Tên, chọn Khoa và Chuyên ngành!
          </div>
        )}

        {/* Avatar Modal */}
        {isAvatarModalOpen && (
          <div onClick={() => setIsAvatarModalOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
            <img src={modalImageUrl} alt="Avatar Large" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "12px" }} onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  );
}
