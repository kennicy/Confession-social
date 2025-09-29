"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient"; // 👈 cần import
import { Calendar, Clock, Banknote } from "lucide-react";

// import các component nằm cùng folder
import CalendarComponent from "./CalendarComponent";
import MettingVoteComponent from "./MeetingVoteComponent";
import DebtPage from "./DebtPage";
import BankPage from "./BankPage";
import ChartPage from "./ChartPage";

export default function ManagerComponent() {
  const [activeComponent, setActiveComponent] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lấy user khi mở trang
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Lắng nghe thay đổi đăng nhập
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const renderComponent = () => {
    switch (activeComponent) {
      case "calendar":
        return <CalendarComponent />;
      case "timemeet":
        return <MettingVoteComponent />;
      case "debtpage":
        return <DebtPage user={user} />; // 👈 truyền user
      case "bank":
        return <BankPage user={user} />;
      case "chart":
        return <ChartPage user={user} />;
      default:
        return <p className="text-gray-600 mt-6">Select a feature above to start</p>;
    }
  };

  if (loading) return <p className="p-4">Loading...</p>;

  if (!user)
    return (
      <div className="p-4">
        <p className="mb-2">🚪 Bạn chưa đăng nhập</p>
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Đăng nhập với Google
        </button>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Manager</h1>

      <div className="flex gap-4 flex-wrap">
        <button
          onClick={() => setActiveComponent("calendar")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
            activeComponent === "calendar"
              ? "bg-blue-600 text-white"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          <Calendar size={20} /> Calendar
        </button>

        <button
          onClick={() => setActiveComponent("timemeet")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
            activeComponent === "timemeet"
              ? "bg-green-600 text-white"
              : "bg-green-500 text-white hover:bg-green-600"
          }`}
        >
          <Clock size={20} /> TimeMeet
        </button>

        <button
          onClick={() => setActiveComponent("bank")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
            activeComponent === "bank"
              ? "bg-purple-600 text-white"
              : "bg-purple-500 text-white hover:bg-purple-600"
          }`}
        >
          <Banknote size={20} /> Bank
        </button>

      </div>

      {/* Render component */}
      <div className="w-full mt-6">{renderComponent()}</div>
    </div>
  );
}
