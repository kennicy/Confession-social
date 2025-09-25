"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function GuestLoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- Check nếu đã login rồi thì redirect ---
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.push("/guest-home/vote");
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async () => {
    if (!name || !password) return alert("Nhập tên + mật khẩu!");
    setLoading(true);

    const fakeEmail = `${name.toLowerCase()}@guest.local`;

    // 1. Đăng ký
    let { error: signUpError } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
    });

    // 2. Nếu đã có thì đăng nhập
    if (signUpError && signUpError.message.includes("already registered")) {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });
      if (loginError) {
        alert("Sai mật khẩu, thử lại!");
        setLoading(false);
        return;
      }
    }

    // 3. Lấy user hiện tại
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("Auth error:", userError?.message);
      alert("Không thể đăng nhập!");
      setLoading(false);
      return;
    }

    const user = userData.user;

    // 4. Cập nhật profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: name,
    });
    if (profileError) {
      console.error("Lỗi cập nhật profiles:", profileError.message);
    }

    setLoading(false);
    // 5. Redirect
    router.push("/guest-home/vote");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 relative overflow-hidden">
      {/* Background animation */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/3 left-2/3 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white shadow-xl rounded-2xl p-8 transform transition-all duration-700 animate-fadeUp">
        {/* Logo / Branding */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xl font-bold shadow-lg">
            M
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-center text-gray-800 mb-2">
          Meeting App
        </h2>

        {/* Input fields */}
        <div className="space-y-4">
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Tên đăng nhập"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="password"
            className="w-full px-4 py-3 border border-gray-300 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-transform duration-150 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </div>
      </div>

      {/* Tailwind custom animation */}
      <style jsx>{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes blob {
          0%,
          100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-fadeUp {
          animation: fadeUp 0.8s ease-out;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
