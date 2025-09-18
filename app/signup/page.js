"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";

// ===== Profile Form Component =====
function ProfileForm({ profileData, setProfileData, onSubmit, loading }) {
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setProfileData(prev => ({ ...prev, [field]: value }));

    // Update realtime to Supabase
    supabase.from("profiles").update({ [field]: value }).eq("id", profileData.id).catch(console.error);
  };

  const AnimatedInput = ({ placeholder, type = "text", field }) => (
    <motion.input
      placeholder={placeholder}
      type={type}
      value={profileData[field]}
      onChange={handleChange(field)}
      whileFocus={{ scale: 1.02, boxShadow: "0 0 12px rgba(30,144,255,0.4)" }}
      style={{
        padding: "12px 16px",
        borderRadius: "12px",
        border: "1px solid #ddd",
        outline: "none",
        fontSize: "15px",
        transition: "all 0.3s",
      }}
    />
  );

  const AnimatedButton = ({ children }) => (
    <motion.button
      type="submit"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        padding: "12px 0",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(90deg, #1e90ff, #6a5acd)",
        color: "#fff",
        fontWeight: "bold",
        fontSize: "16px",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(30,144,255,0.3)",
        transition: "all 0.3s",
      }}
      disabled={loading}
    >
      {children}
    </motion.button>
  );

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", width: "100%", maxWidth: "500px" }}>
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
    </form>
  );
}

// ===== Main Signup + Profile Page =====
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: signup, 2: fill profile
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Signup states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Profile state
  const [profileData, setProfileData] = useState({
    id: "", username: "", password: "", full_name: "", nickname: "",
    faculty: "", year: "", major: "", bio: "", avatar_url: "",
    gender: "", position: ""
  });

  // ===== Handle Signup =====
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

      // Tạo row profile mặc định chỉ với id
      const { error: profileError } = await supabase.from("profiles").insert({ id });
      if (profileError) console.error("Lỗi tạo profile:", profileError);

      setUserId(id);
      setProfileData(prev => ({ ...prev, id })); // set id vào profileData
      setStep(2); // chuyển sang form điền profile
    } catch (err) {
      console.error(err);
      setError("Signup thất bại. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // ===== Handle Fill Profile Submit =====
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Final update to Supabase
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
      background: "#f0f2f5"
    }}>
      {step === 1 && (
        <>
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>Đăng ký</motion.h2>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <motion.form onSubmit={handleSignup} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
            display: "flex", flexDirection: "column", gap: "15px", width: "100%", maxWidth: "400px"
          }}>
            <motion.input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              whileFocus={{ scale: 1.02, boxShadow: "0 0 12px rgba(30,144,255,0.4)" }}
              style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #ddd", outline: "none" }}
              required
            />
            <motion.input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              whileFocus={{ scale: 1.02, boxShadow: "0 0 12px rgba(30,144,255,0.4)" }}
              style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #ddd", outline: "none" }}
              required
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "12px 0",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(90deg, #1e90ff, #6a5acd)",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(30,144,255,0.3)"
              }}
              disabled={loading}
            >
              {loading ? "Đang đăng ký..." : "Signup"}
            </motion.button>
          </motion.form>
        </>
      )}

      {step === 2 && (
        <>
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>Điền thông tin Profile</motion.h2>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <ProfileForm
            profileData={profileData}
            setProfileData={setProfileData}
            loading={loading}
            onSubmit={handleProfileSubmit}
          />
        </>
      )}
    </div>
  );
}
