"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function MeetingVote() {
  const [userId, setUserId] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ title: "", content: "", link: "" });
  const [selectedMonth, setSelectedMonth] = useState(""); 
  const [selectedYear, setSelectedYear] = useState("");   
  const [selectedDays, setSelectedDays] = useState([]);   
  const [voteModal, setVoteModal] = useState({ show: false, meeting: null, deleteMode: false });
  const [votesData, setVotesData] = useState({});
  const router = useRouter();

  // --- Lấy userId ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      if (!error) setUserId(profile.id);
    };
    fetchUser();
  }, []);

  // --- Logout ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/guest-home/login");
  };

  // --- Load meetings + Realtime ---
  useEffect(() => {
    const fetchMeetings = async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setMeetings(data);
    };
    fetchMeetings();

    const channel = supabase
      .channel("public:meetings")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, (payload) => {
        setMeetings(prev => {
          if (payload.eventType === "INSERT") return [payload.new, ...prev];
          if (payload.eventType === "DELETE") return prev.filter(m => m.id !== payload.old.id);
          if (payload.eventType === "UPDATE") return prev.map(m => m.id === payload.new.id ? payload.new : m);
          return prev;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // --- Form change ---
  const handleChange = (e) => setNewMeeting(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- Toggle day ---
  const toggleDay = (dayNumber) => {
    if (!selectedMonth || !selectedYear) return alert("Vui lòng chọn tháng và năm trước");
    const fullDate = `${selectedYear}-${selectedMonth.padStart(2,"0")}-${dayNumber.padStart(2,"0")}`;
    setSelectedDays(prev => prev.includes(fullDate) ? prev.filter(d => d!==fullDate) : [...prev, fullDate]);
  };

  const getDaysInMonth = (month, year) => (!month || !year ? 31 : new Date(year, parseInt(month), 0).getDate());

  // --- Tạo meeting ---
  const handleCreateMeeting = async () => {
    if (!newMeeting.title || selectedDays.length === 0) 
      return alert("Vui lòng điền tên và chọn ít nhất một ngày!");
    
    const { data, error } = await supabase
      .from("meetings")
      .insert([{ ...newMeeting, days: selectedDays, created_by: userId }])
      .select()
      .single(); 

    if (error) return alert("Tạo cuộc họp thất bại: " + error.message);

    setMeetings(prev => [data, ...prev]);
    setNewMeeting({ title: "", content: "", link: "" });
    setSelectedDays([]); 
    setSelectedMonth(""); 
    setSelectedYear("");
  };

  // --- Xóa meeting ---
  const handleDeleteMeeting = async () => {
    if (!voteModal.meeting) return;

    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", voteModal.meeting.id)
      .eq("created_by", userId);

    if (error) {
      alert("Xóa thất bại: " + error.message);
      return;
    }

    setMeetings(prev => prev.filter(m => m.id !== voteModal.meeting.id));
    setVoteModal({ show: false, meeting: null, deleteMode: false });
  };

  // --- Mở vote modal ---
  const openVoteModal = async (meeting) => {
    setVoteModal({ show: true, meeting, deleteMode: false });

    const { data } = await supabase
      .from("meeting_votes")
      .select("day, hour, user_id, profiles(full_name)")
      .eq("meeting_id", meeting.id);

    const voteMap = {};
    if (data) {
      data.forEach(v => {
        const key = `${v.day}_${v.hour}`;
        voteMap[key] = voteMap[key] || { count: 0, voted: false, users: [] };
        voteMap[key].count += 1;
        voteMap[key].users.push(v.profiles?.full_name || v.user_id);
        if (v.user_id === userId) voteMap[key].voted = true;
      });
    }
    setVotesData(voteMap);
  };

  // --- Vote click ---
  const handleVoteClick = async (day, hour) => {
    if (!voteModal.meeting) return;
    const key = `${day}_${hour}`;
    const current = votesData[key] || { count: 0, voted: false };

    setVotesData(prev => {
      const newData = { ...prev };
      newData[key] = {
        count: current.count + (current.voted ? -1 : 1),
        voted: !current.voted
      };
      return newData;
    });

    if (current.voted) {
      await supabase
        .from("meeting_votes")
        .delete()
        .eq("meeting_id", voteModal.meeting.id)
        .eq("day", day)
        .eq("hour", hour)
        .eq("user_id", userId);
    } else {
      await supabase
        .from("meeting_votes")
        .upsert(
          [{ meeting_id: voteModal.meeting.id, day, hour, user_id: userId }],
          { onConflict: ["meeting_id", "user_id", "day", "hour"] }
        );
    }
  };

  // --- Realtime votes ---
  useEffect(() => {
    if (!voteModal.show || !voteModal.meeting) return;
    const meetingId = voteModal.meeting.id;

    const channel = supabase
      .channel(`vote-meeting-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_votes", filter: `meeting_id=eq.${meetingId}` },
        payload => {
          setVotesData(prev => {
            const newData = { ...prev };
            const key = `${payload.new?.day || payload.old.day}_${payload.new?.hour || payload.old.hour}`;
            const current = prev[key] || { count: 0, voted: prev[key]?.voted || false };

            if (payload.eventType === "INSERT") {
              newData[key] = { ...current, count: current.count + 1 };
            } else if (payload.eventType === "DELETE") {
              newData[key] = { ...current, count: Math.max(0, current.count - 1) };
            }

            return newData;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [voteModal.show, voteModal.meeting]);

  const confirmDelete = (meeting) => setVoteModal({ show: true, meeting, deleteMode: true });


  return (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">

    {/* Header */}
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-700">Meeting Scheduler</h1>
        <button
          onClick={handleLogout}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl font-semibold shadow hover:opacity-90 transition"
        >
          Đăng xuất
        </button>
      </div>
    </header>

    <main className="p-6 max-w-7xl mx-auto space-y-12">

      {/* ================== Form tạo cuộc họp ================== */}
      <section className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg flex flex-col lg:flex-row gap-8 border border-indigo-100">
        {/* Left */}
        <div className="flex-1 flex flex-col gap-4">
          <input
            type="text"
            name="title"
            placeholder="Tên cuộc họp"
            value={newMeeting.title}
            onChange={handleChange}
            className="border border-gray-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full"
          />
          <textarea
            name="content"
            placeholder="Nội dung cuộc họp"
            value={newMeeting.content}
            onChange={handleChange}
            className="border border-gray-300 p-4 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full h-40 resize-y"
          />
          <input
            type="text"
            name="link"
            placeholder="Link Meet"
            value={newMeeting.link}
            onChange={handleChange}
            className="border border-gray-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full"
          />

          <button
            onClick={handleCreateMeeting}
            className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-xl hover:opacity-90 transition font-semibold w-full"
          >
            Tạo cuộc họp
          </button>
        </div>

        {/* Right */}
        <div className="flex-1 flex flex-col gap-4">
          <h3 className="font-semibold text-gray-700">Chọn tháng & năm</h3>
          <div className="flex gap-3">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-gray-300 p-3 rounded-xl w-1/2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Tháng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m.toString().padStart(2, "0")}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="border border-gray-300 p-3 rounded-xl w-1/2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Năm</option>
              {Array.from({ length: 3 }, (_, i) => 2025 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <h3 className="font-semibold text-gray-700">Chọn ngày</h3>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => {
              const day = (i + 1).toString().padStart(2, "0");
              const fullDate = selectedYear && selectedMonth ? `${selectedYear}-${selectedMonth}-${day}` : day;
              const selected = selectedDays.includes(fullDate);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`p-2 rounded-lg transition-all text-sm font-medium ${
                    selected
                      ? "bg-indigo-600 text-white shadow-md"
                      : "hover:bg-indigo-100 text-gray-700"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================== Danh sách cuộc họp ================== */}
      <section>
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Danh sách cuộc họp</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting, idx) => {
            let topDisplay = "Chưa có vote";
            if (Array.isArray(meeting.days) && votesData) {
              const totalVotePerDay = {};
              meeting.days.forEach(day => {
                let total = 0;
                for (let hour = 0; hour < 24; hour++) {
                  const key = `${day}_${hour}`;
                  if (votesData[key]) total += votesData[key].count;
                }
                totalVotePerDay[day] = total;
              });

              const [topDay] =
                Object.entries(totalVotePerDay).sort((a, b) => b[1] - a[1])[0] || [];
              if (topDay) {
                let topHour = 0,
                  maxHourVote = 0;
                for (let hour = 0; hour < 24; hour++) {
                  const key = `${topDay}_${hour}`;
                  const count = votesData[key]?.count || 0;
                  if (count > maxHourVote) {
                    maxHourVote = count;
                    topHour = hour;
                  }
                }
                topDisplay = `${topDay} lúc ${topHour}:00 (${maxHourVote} vote${
                  maxHourVote > 1 ? "s" : ""
                })`;
              }
            }

            return (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
              onClick={() => openVoteModal(meeting)}   // 👉 click cả card để vote
              className="bg-white rounded-2xl shadow-md flex flex-col justify-between border border-gray-200 p-6 cursor-pointer"
            >
              {/* Header */}
              <div className="flex flex-col gap-3 flex-1">
                <h3 className="text-xl font-bold text-gray-800">{meeting.title}</h3>
                <p className="text-gray-700 whitespace-pre-line">{meeting.content}</p>
                {meeting.link && (
                  <p className="text-sm break-words">
                    <span className="font-medium text-gray-600">Link Meet: </span>
                    <a
                      href={meeting.link}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()} // tránh click vào link cũng trigger vote
                      className="text-indigo-600 underline"
                    >
                      {meeting.link}
                    </a>
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex flex-col gap-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Thời gian gợi ý:</span>
                  <div className="text-indigo-700 font-semibold">{topDisplay}</div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  {meeting.created_by === userId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // tránh bấm nút Xóa cũng mở vote
                        confirmDelete(meeting);
                      }}
                      className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 font-semibold shadow"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      </section>


      {/* ================== Vote Modal ================== */}
      {voteModal.show && voteModal.meeting && !voteModal.deleteMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] overflow-auto flex flex-col">
            {/* Table */}
            <div className="flex-1 p-4">
              {voteModal.meeting.days && (() => {
                const daysArray = Array.isArray(voteModal.meeting.days)
                  ? voteModal.meeting.days
                  : JSON.parse(voteModal.meeting.days || "[]");

                const totalWidth = 95; // vw
                const hourColWidth = 3;
                const dayColWidth = Math.max(10, (totalWidth - hourColWidth) / daysArray.length);

                return (
                  <table className="table-fixed border-collapse border w-full text-center text-xs">
                    <thead className="sticky top-0 bg-white z-10 shadow">
                      <tr>
                        <th className="border px-1 py-1" style={{ width: `${hourColWidth}vw` }}>Giờ</th>
                        {daysArray.map(day => (
                          <th key={day} className="border px-1 py-1 truncate" style={{ width: `${dayColWidth}vw` }}>
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 24 }, (_, hour) => (
                        <tr key={hour}>
                          <td className="border px-1 py-1 font-medium" style={{ width: `${hourColWidth}vw` }}>{hour}</td>
                          {daysArray.map(day => {
                            const key = `${day}_${hour}`;
                            const voteInfo = votesData[key] || { count: 0, voted: false, users: [] };
                            const intensity = Math.min(100, voteInfo.count * 10);

                            return (
                              <td key={key} className="border px-1 py-1 relative">
                                {/* group để tooltip */}
                                <div
                                  className="cursor-pointer truncate transition-colors group"
                                  style={{
                                    width: "100%",
                                    backgroundColor: `rgba(59,130,246,${0.1 + 0.9 * intensity / 100})`,
                                    color: voteInfo.voted ? "#fff" : "#000",
                                    fontWeight: voteInfo.voted ? "bold" : "normal"
                                  }}
                                  onClick={() => handleVoteClick(day, hour)}
                                >
                                  {voteInfo.count}

                                  {/* Tooltip hiển thị user */}
                                  {voteInfo.users && voteInfo.users.length > 0 && (
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs p-1 rounded shadow-lg whitespace-nowrap z-50">
                                      {voteInfo.users.join(", ")}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>

            {/* Close button */}
            <div className="p-2 flex justify-center border-t">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition"
                onClick={() => setVoteModal({ show: false, meeting: null, deleteMode: false })}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== Delete Modal ================== */}
      {voteModal.show && voteModal.meeting && voteModal.deleteMode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold text-gray-800">Xóa cuộc họp</h3>
              <button
                onClick={() => setVoteModal({ show: false, meeting: null, deleteMode: false })}
                className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 text-gray-700">
              <p>Bạn có chắc muốn xóa cuộc họp này không?</p>
            </div>
            <div className="p-4 flex justify-end gap-3 border-t bg-gray-50">
              <button
                onClick={() => setVoteModal({ show: false, meeting: null, deleteMode: false })}
                className="bg-gray-400 text-white px-5 py-2 rounded-xl hover:bg-gray-500 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteMeeting}
                className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 transition"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </main>

  </div>
);
}
