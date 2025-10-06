"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Calendar, Clock, Banknote, BarChart3 } from "lucide-react";

import CalendarComponent from "./CalendarComponent";
import MettingVoteComponent from "./MeetingVoteComponent";
import DebtPage from "./DebtPage";
import BankPage from "./BankPage";
import ChartPage from "./ChartPage";

export default function ManagerComponent() {
  const [activeComponent, setActiveComponent] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

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
        return <DebtPage user={user} />;
      case "bank":
        return <BankPage user={user} />;
      case "chart":
        return <ChartPage user={user} />;
      default:
        return <p className="text-gray-400 mt-6">Select a feature above to start</p>;
    }
  };

  if (loading) return <p className="p-4 text-white">Loading...</p>;

  if (!user)
    return (
      <div className="p-4 text-white">
        <p className="mb-2">🚪 Bạn chưa đăng nhập</p>
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Đăng nhập với Google
        </button>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center bg-black p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Manager</h1>

      <div className="flex gap-4 flex-wrap">

<button
  onClick={() => setActiveComponent("calendar")}
  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
    activeComponent === "calendar"
      ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-lg"
      : "bg-gray-900 text-gray-200 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-blue-400 hover:text-white"
  }`}
>
  <Calendar size={20} /> Calendar
</button>

<button
  onClick={() => setActiveComponent("timemeet")}
  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
    activeComponent === "timemeet"
      ? "bg-gradient-to-r from-green-600 to-teal-400 text-white shadow-lg"
      : "bg-gray-900 text-gray-200 hover:bg-gradient-to-r hover:from-green-500 hover:to-teal-300 hover:text-white"
  }`}
>
  <Clock size={20} /> TimeMeet
</button>

<button
  onClick={() => setActiveComponent("bank")}
  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
    activeComponent === "bank"
      ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg"
      : "bg-gray-900 text-gray-200 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-400 hover:text-white"
  }`}
>
  <Banknote size={20} /> Bank
</button>

<button
  onClick={() => setActiveComponent("chart")}
  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
    activeComponent === "chart"
      ? "bg-gradient-to-r from-yellow-500 to-orange-400 text-white shadow-lg"
      : "bg-gray-900 text-gray-200 hover:bg-gradient-to-r hover:from-yellow-400 hover:to-orange-300 hover:text-white"
  }`}
>
  <BarChart3 size={20} /> Chart
</button>

      
      </div>

      <div className="w-full mt-6">{renderComponent()}</div>
    </div>
  );
}
