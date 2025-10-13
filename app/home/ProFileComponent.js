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
  const [city, setCity] = useState(profile?.city || "");
  const [province, setProvince] = useState(profile?.province || "");
  const [school, setSchool] = useState(profile?.school || "");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const [updating, setUpdating] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [warningPopup, setWarningPopup] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
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

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "avatar") {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else if (type === "cover") {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarClick = () => {
    const url = avatarPreview || profile?.avatar_url;
    if (!url) return;
    setModalImageUrl(url);
    setIsAvatarModalOpen(true);
  };

  const handleCoverClick = () => {
    const url = coverPreview || profile?.cover_url;
    if (!url) return;
    setModalImageUrl(url);
    setIsCoverModalOpen(true);
  };

  const uploadFileToSupabase = async (file, folderName, prefix) => {
    try {
      const folderPath = `${user.id}/${folderName}`;
      const ext = file.name.split(".").pop();
      const fileName = `${prefix}_${Date.now()}.${ext}`;
      const filePath = `${folderPath}/${fileName}`;

      const { data: listFiles } = await supabase.storage.from(folderName).list(`${user.id}`);
      if (listFiles && listFiles.length > 0) {
        const oldFiles = listFiles.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from(folderName).remove(oldFiles);
      }

      const { error: uploadError } = await supabase.storage
        .from(folderName)
        .upload(filePath, file, { cacheControl: "0", upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage.from(folderName).getPublicUrl(filePath);
      return `${urlData.publicUrl}?t=${Date.now()}`;
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async () => {
    if (!user) return alert("You are not logged in!");

    if (!fullName || !faculty || !major  ) {
      setWarningPopup(true);
      setTimeout(() => setWarningPopup(false), 2000);
      return;
    }

    setUpdating(true);

    let avatar_url = profile?.avatar_url || null;
    let cover_url = profile?.cover_url || null;

    try {
      if (avatarFile) avatar_url = await uploadFileToSupabase(avatarFile, "avatars", "avatar");
      if (coverFile) cover_url = await uploadFileToSupabase(coverFile, "covers", "cover");
    } catch (err) {
      setUpdating(false);
      return alert("File upload failed: " + err.message);
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
        city,
        province,
        school,
        avatar_url,
        cover_url,
      })
      .select()
      .single();

    setUpdating(false);
    if (error) return alert("Profile update failed: " + error.message);

    setProfile(data);
    setAvatarPreview(null);
    setCoverPreview(null);
    setSuccessPopup(true);
    setTimeout(() => setSuccessPopup(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#121212", display: "flex", justifyContent: "center", alignItems: "center", padding: "10px 20px" }}>
      <div style={{ width: "100%", maxWidth: "700px", backgroundColor: "#1e1e1e", borderRadius: "25px", boxShadow: "0 12px 24px rgba(0,0,0,0.6)", padding: "40px 30px", display: "flex", flexDirection: "column", gap: "30px", position: "relative" }}>

        {/* Cover Image */}
        <div
          onClick={handleCoverClick}
          style={{
            width: "100%",
            height: "180px",
            borderRadius: "20px",
            overflow: "hidden",
            marginBottom: "-80px",
            cursor: profile?.cover_url || coverPreview ? "pointer" : "default",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
          }}
        >
          <img src={coverPreview || profile?.cover_url || "https://via.placeholder.com/700x180?text=Cover+Image"} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        <label htmlFor="cover-upload" style={{ position: "absolute", top: "10px", right: "10px", cursor: "pointer", padding: "6px 12px", backgroundColor: "#007bff", color: "#fff", fontWeight: "600", borderRadius: "8px", zIndex: 5 }}>
          ✎ Upload Cover
        </label>
        <input id="cover-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileChange(e, "cover")} />

        {/* Avatar + Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "-60px", zIndex: 10 }}>
          <div
            onClick={handleAvatarClick}
            style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", border: "4px solid #007bff", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
          >
            <img src={avatarPreview || profile?.avatar_url || "https://via.placeholder.com/120"} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <label htmlFor="avatar-upload" style={{ cursor: "pointer", padding: "10px 18px", backgroundColor: "#007bff", color: "#fff", fontWeight: "600", borderRadius: "10px" }}>
            ✎ Upload Avatar
          </label>
          <input id="avatar-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileChange(e, "avatar")} />
        </div>

        {/* Form Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {[ 
            { label: "Full Name", value: fullName, setter: setFullName, placeholder: "Enter full name" },
            { label: "Nickname", value: nickname, setter: setNickname, placeholder: "Enter nickname" },
            { label: "Year", value: year, setter: setYear, placeholder: "Enter year" },
            { label: "City", value: city, setter: setCity, placeholder: "Enter city" },
            { label: "Province", value: province, setter: setProvince, placeholder: "Enter province" },
            { label: "School", value: school, setter: setSchool, placeholder: "Enter school" },
          ].map((field, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontWeight: "500", marginBottom: "6px", color: "#ccc" }}>{field.label}</label>
              <input
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #444", outline: "none", fontSize: "14px", backgroundColor: "#2a2a2a", color: "#fff" }}
              />
            </div>
          ))}

          {/* Faculty */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#ccc" }}>Faculty</label>
            <select
              value={faculty}
              onChange={(e) => { setFaculty(e.target.value); setMajor(""); }}
              style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #444", outline: "none", fontSize: "14px", backgroundColor: "#2a2a2a", color: "#fff" }}
            >
              <option value="" disabled>Select faculty</option>
              {Object.keys(facultyMap).map((f, idx) => <option key={idx} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Major */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#ccc" }}>Major</label>
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              disabled={!faculty}
              style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #444", outline: "none", fontSize: "14px", backgroundColor: "#2a2a2a", color: "#fff" }}
            >
              <option value="" disabled>{faculty ? "Select major" : "Select faculty first"}</option>
              {faculty && facultyMap[faculty]?.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Gender */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#ccc" }}>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #444", outline: "none", fontSize: "14px", backgroundColor: "#2a2a2a", color: "#fff" }}
            >
              <option value="" disabled>Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Position */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "500", marginBottom: "6px", color: "#ccc" }}>Position</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Enter position"
              style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #444", outline: "none", fontSize: "14px", backgroundColor: "#2a2a2a", color: "#fff" }}
            />
          </div>
        </div>

        {/* Bio */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontWeight: "500", marginBottom: "6px", color: "#ccc" }}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short bio..."
            style={{ padding: "12px", borderRadius: "12px", border: "1px solid #444", outline: "none", fontSize: "14px", minHeight: "80px", resize: "vertical", backgroundColor: "#2a2a2a", color: "#fff" }}
          />
        </div>

        {/* Update Button */}
        <button
          onClick={handleUpdate}
          style={{ width: "100%", padding: "14px", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", fontSize: "16px", cursor: "pointer" }}
        >
          {updating ? "Updating..." : "Update Profile"}
        </button>

        {/* Success Popup */}
        {successPopup && (
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#28a745", color: "#fff", padding: "20px 35px", borderRadius: "12px", fontWeight: "600", fontSize: "16px", zIndex: 9999, textAlign: "center" }}>
            ✅ Profile updated successfully!
          </div>
        )}

        {/* Warning Popup */}
        {warningPopup && (
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#ffc107", color: "#222", padding: "20px 35px", borderRadius: "12px", fontWeight: "600", fontSize: "16px", zIndex: 9999, textAlign: "center" }}
            onClick={() => setWarningPopup(false)}
          >
            😅 Please fill in Full Name, Faculty and Major!
          </div>
        )}

        {/* Avatar Modal */}
        {isAvatarModalOpen && (
          <div onClick={() => setIsAvatarModalOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
            <img src={modalImageUrl} alt="Avatar Large" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "12px" }} onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* Cover Modal */}
        {isCoverModalOpen && (
          <div onClick={() => setIsCoverModalOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
            <img src={modalImageUrl} alt="Cover Large" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "12px" }} onClick={(e) => e.stopPropagation()} />
          </div>
        )}

      </div>
    </div>
  );
}
