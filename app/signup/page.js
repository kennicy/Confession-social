"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";

// ===== Profile Form Component =====
function ProfileForm({ profileData, setProfileData, onSubmit, loading }) {
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setProfileData(prev => ({ ...prev, [field]: value }));
    supabase.from("profiles").update({ [field]: value }).eq("id", profileData.id).catch(console.error);
  };

  const AnimatedInput = ({ placeholder, field, type = "text" }) => (
    <motion.input
      placeholder={placeholder}
      type={type}
      value={profileData[field]}
      onChange={handleChange(field)}
      whileFocus={{
        scale: 1.03,
        boxShadow: "0 0 20px rgba(30,144,255,0.5)",
      }}
      style={{
        width: "100%",
        padding: "16px 20px",
        borderRadius: "16px",
        border: "1px solid #ddd",
        outline: "none",
        fontSize: "15px",
        fontWeight: 500,
        transition: "all 0.3s",
        background: "linear-gradient(135deg, #f9f9f9, #fff)",
      }}
    />
  );

  const AnimatedButton = ({ children }) => (
    <motion.button
      type="submit"
      whileHover={{ scale: 1.05, backgroundColor: "#6a5acd", color: "#fff", boxShadow: "0 10px 20px rgba(106,90,205,0.4)" }}
      whileTap={{ scale: 0.97 }}
      style={{
        padding: "16px 0",
        borderRadius: "16px",
        border: "none",
        background: "linear-gradient(90deg, #1e90ff, #4a90e2, #6a5acd)",
        color: "#fff",
        fontWeight: "bold",
        fontSize: "16px",
        cursor: "pointer",
        boxShadow: "0 8px 25px rgba(30,144,255,0.3)",
        transition: "all 0.3s",
      }}
      disabled={loading}
    >
      {children}
    </motion.button>
  );

  return (
    <motion.form 
      onSubmit={onSubmit} 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
        maxWidth: "520px",
        background: "linear-gradient(145deg, #ffffff, #f3f4f6)",
        padding: "40px",
        borderRadius: "24px",
        boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
      }}
    >
      <AnimatedInput placeholder="Username" field="username" />
      <AnimatedInput type="password" placeholder="Password" field="password" />
      <AnimatedInput placeholder="Full Name" field="full_name" />
      <AnimatedInput placeholder="Nickname" field="nickname" />
      <AnimatedInput placeholder="Faculty" field="faculty" />
      <AnimatedInput placeholder="Year" field="year" />
      <AnimatedInput placeholder="Major" field="major" />
      <AnimatedInput placeholder="Bio" field="bio" />
      <AnimatedInput placeholder="Avatar URL" field="avatar_url" />
      <AnimatedInput placeholder="Gender" field="gender" />
      <AnimatedInput placeholder="Position" field="position" />
      <AnimatedButton>{loading ? "Đang cập nhật..." : "Hoàn tất"}</AnimatedButton>
    </motion.form>
  );
}

// ===== Main Signup + Profile Page =====
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [profileData, setProfileData] = useState({
    id: "", username: "", password: "", full_name: "", nickname: "",
    faculty: "", year: "", major: "", bio: "", avatar_url: "",
    gender: "", position: ""
  });

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const id = data.user?.id;
      if (!id) {
        setError("Signup thất bại: không có user id");
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({ id });
      if (profileError) console.error("Lỗi tạo profile:", profileError);

      setUserId(id);
      setProfileData(prev => ({ ...prev, id }));
      setStep(2);
    } catch (err) {
      console.error(err);
      setError("Signup thất bại. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.from("profiles").update(profileData).eq("id", userId);
      router.push("/home");
    } catch (err) {
      console.error(err);
      setError("Cập nhật profile thất bại. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      flexDirection: "column",
      padding: "20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: "radial-gradient(circle at top, #fdfbfb, #e0e7ff, #d6e0ff)",
    }}>
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, type: "spring", stiffness: 120 } }}
          style={{
            width: "100%",
            maxWidth: "420px",
            display: "flex",
            flexDirection: "column",
            gap: "25px",
            background: "linear-gradient(145deg, #ffffff, #eef2ff)",
            padding: "35px",
            borderRadius: "24px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
          }}
        >
          <h2 style={{ textAlign: "center", fontSize: "26px", fontWeight: "bold", color: "#4a90e2" }}>Đăng ký</h2>
          {error && <p style={{ color: "red", textAlign: "center", fontWeight: 500 }}>{error}</p>}
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <motion.input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              whileFocus={{ scale: 1.03, boxShadow: "0 0 20px rgba(74,144,226,0.5)" }}
              style={{
                padding: "16px 20px",
                borderRadius: "16px",
                border: "1px solid #ccc",
                outline: "none",
                fontSize: "15px",
                background: "linear-gradient(135deg, #f7f8ff, #fff)",
                fontWeight: 500,
              }}
              required
            />
            <motion.input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              whileFocus={{ scale: 1.03, boxShadow: "0 0 20px rgba(74,144,226,0.5)" }}
              style={{
                padding: "16px 20px",
                borderRadius: "16px",
                border: "1px solid #ccc",
                outline: "none",
                fontSize: "15px",
                background: "linear-gradient(135deg, #f7f8ff, #fff)",
                fontWeight: 500,
              }}
              required
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05, backgroundColor: "#6a5acd", color: "#fff", boxShadow: "0 10px 20px rgba(106,90,205,0.4)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "16px 0",
                borderRadius: "16px",
                border: "none",
                background: "linear-gradient(90deg, #1e90ff, #4a90e2, #6a5acd)",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 8px 25px rgba(30,144,255,0.3)",
                transition: "all 0.3s",
              }}
              disabled={loading}
            >
              {loading ? "Đang đăng ký..." : "Signup"}
            </motion.button>
          </form>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
          style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#4a90e2", marginBottom: "20px" }}>Điền thông tin Profile</h2>
          {error && <p style={{ color: "red", fontWeight: 500 }}>{error}</p>}
          <ProfileForm
            profileData={profileData}
            setProfileData={setProfileData}
            loading={loading}
            onSubmit={handleProfileSubmit}
          />
        </motion.div>
      )}
    </div>
  );
}
